/**
 * Minimal stand-in for a Supabase project (GoTrue + PostgREST) so the app's
 * REAL server actions can be executed here, without a hospital database.
 *
 * It implements just enough of the wire protocol for @supabase/supabase-js:
 *   GET  /auth/v1/user                       → the signed-in user
 *   GET  /rest/v1/<table>?<postgrest query>  → rows / single object / counts
 *   HEAD /rest/v1/<table>?…                  → `count: exact, head: true` (no body)
 *
 * Every request is recorded in `requests` so a check can assert HOW MANY
 * round trips a code path costs — that is the whole point of the
 * patient-list performance check.
 */
import http from "node:http";

/** Search terms carry literal `%`/`_` wildcards; never let a raw decode throw. */
const safeDecode = (s) => {
    try { return decodeURIComponent(s); } catch { return s; }
};

export function createMockSupabase({ staff, patients, tables = {} }) {
    const requests = [];
    /** Tables whose reads should be refused — simulates RLS drift / a bad grant. */
    const rejected = new Set();
    /** Rows for tables that are not `patients`/`staffs` (e.g. audit_logs). */
    const extra = tables;

    function matchRow(row, filters) {
        for (const f of filters) {
            const value = row[f.column];
            switch (f.op) {
                case "eq": if (String(value) !== f.value) return false; break;
                case "gte": if (!(value >= f.value)) return false; break;
                case "in": {
                    const list = f.value.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
                    if (!list.includes(String(value))) return false;
                    break;
                }
                case "ilike": {
                    const pattern = f.value.replace(/%/g, "").toLowerCase();
                    if (!String(value ?? "").toLowerCase().includes(pattern)) return false;
                    break;
                }
                default: break;
            }
        }
        return true;
    }

    function rowsFor(table) {
        if (table === "patients") return patients;
        if (table === "staffs") return staff;
        return extra[table] ?? [];
    }

    /** Parse PostgREST filters from a URL's query string. */
    function parseFilters(url) {
        const filters = [];
        for (const [key, value] of url.searchParams) {
            if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
            if (key === "or") {
                const parts = value.replace(/^\(|\)$/g, "").split(",");
                const subs = parts.map((p) => {
                    const m = /^([\w.]+)\.(ilike|eq)\.(.*)$/.exec(p);
                    return m ? { column: m[1], op: m[2], value: safeDecode(m[3]) } : null;
                }).filter(Boolean);
                filters.push({ or: subs });
                continue;
            }
            const m = /^(\w+)\.(.*)$/.exec(value);
            if (m) filters.push({ column: key, op: m[1], value: safeDecode(m[2]) });
        }
        return filters;
    }

    function applyFilters(table, url) {
        const filters = parseFilters(url);
        return rowsFor(table).filter((row) =>
            filters.every((f) => (f.or ? f.or.some((s) => matchRow(row, [s])) : matchRow(row, [f])))
        );
    }

    const server = http.createServer((req, res) => {
        const url = new URL(req.url, "http://mock.supabase.local");
        const record = { method: req.method, path: url.pathname, search: url.search };
        requests.push(record);

        const send = (status, body, headers = {}) => {
            const payload = body === undefined ? "" : JSON.stringify(body);
            record.responseBytes = Buffer.byteLength(payload);
            res.writeHead(status, { "content-type": "application/json", ...headers });
            res.end(payload);
        };

        // ── GoTrue: who am I? ────────────────────────────────────────────────
        if (url.pathname === "/auth/v1/user") {
            if (!staff[0]) return send(401, { msg: "invalid token" });
            return send(200, { id: staff[0].id, email: staff[0].email, aud: "authenticated" });
        }

        // ── PostgREST ────────────────────────────────────────────────────────
        const rest = /^\/rest\/v1\/([\w]+)$/.exec(url.pathname);
        if (!rest) return send(404, { message: "not found" });
        const table = rest[1];

        if (rejected.has(table)) {
            return send(500, { code: "42501", message: `permission denied for table ${table} (row-level security)` });
        }

        // Writes: accept and echo nothing (the checks only exercise reads).
        if (req.method !== "GET" && req.method !== "HEAD") {
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", () => send(201, []));
            return;
        }

        const matches = applyFilters(table, url);

        // HEAD — `count: exact, head: true`: total in Content-Range, empty body.
        if (req.method === "HEAD") {
            return send(200, undefined, { "content-range": `0--1/${matches.length}` });
        }

        const accept = String(req.headers.accept ?? "");
        const wantsSingle = accept.includes("vnd.pgrst.object+json");
        const wantsMaybeSingle = accept.includes("vnd.pgrst.object=0..1");
        const wantsCount = String(req.headers.prefer ?? "").includes("count=exact");

        // Ordering
        let rows = matches;
        const order = url.searchParams.get("order");
        if (order) {
            const keys = order.split(",").map((o) => {
                const [col, dir] = o.split(".");
                return { col, desc: dir === "desc" };
            });
            rows = rows.slice().sort((a, b) => {
                for (const k of keys) {
                    const av = a[k.col] ?? "";
                    const bv = b[k.col] ?? "";
                    if (av === bv) continue;
                    return (av > bv ? 1 : -1) * (k.desc ? -1 : 1);
                }
                return 0;
            });
        }

        const total = rows.length;

        // Pagination — .range() sends a Range header, .limit() a `limit` param.
        let offset = Number(url.searchParams.get("offset") ?? 0);
        let limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : null;
        const rangeHeader = req.headers.range;
        if (rangeHeader && /^\d+-\d+$/.test(rangeHeader)) {
            const [from, to] = rangeHeader.split("-").map(Number);
            offset = from;
            limit = to - from + 1;
        }
        let page = rows.slice(offset, limit === null ? undefined : offset + limit);

        const columns = url.searchParams.get("select");
        if (columns && columns !== "*" && !columns.includes("(")) {
            const cols = columns.split(",").map((c) => c.trim());
            page = page.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
        }

        const fromIdx = page.length ? offset : 0;
        const toIdx = offset + page.length - 1;
        const contentRange = `${fromIdx}-${toIdx}/${wantsCount ? total : "*"}`;

        if (wantsSingle) {
            if (page.length !== 1) {
                return send(406, { code: "PGRST116", message: "The result contains 0 rows", details: null, hint: null });
            }
            return send(206, page[0], { "content-range": contentRange });
        }
        if (wantsMaybeSingle) {
            return send(200, page[0] ?? null, { "content-range": contentRange });
        }
        return send(206, page, { "content-range": contentRange });
    });

    return {
        server,
        requests,
        rejectTable: (table) => rejected.add(table),
        allowTable: (table) => rejected.delete(table),
        restCalls: () => requests.filter((r) => r.path.startsWith("/rest/v1/")).length,
        payloadBytes: () => requests.reduce((sum, r) => sum + (r.responseBytes ?? 0), 0),
        start(port = 0) {
            return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server.address().port)));
        },
        stop() {
            return new Promise((resolve) => server.close(resolve));
        },
    };
}

/** Build N synthetic patient rows in the shape of the production table. */
export function makePatients(count, { statusOf } = {}) {
    const rows = [];
    for (let i = 0; i < count; i++) {
        rows.push({
            id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
            name: `Patient ${i}`,
            email: `patient${i}@example.com`,
            phone: `080${String(i).padStart(8, "0")}`,
            gender: i % 2 ? "Female" : "Male",
            birth_date: "1990-01-01",
            address: "1 Hospital Road, Abuja",
            occupation: "Trader",
            religion: "Christianity",
            blood_group: "O+",
            geno_type: "AA",
            allergies: "None",
            emergency_contact_name: "Next of Kin",
            emergency_contact_number: "08012345678",
            emergency_contact_relationship: "Sibling",
            notes: "Registered at the front desk with a full set of demographics and insurance details.",
            hmo: true,
            hmo_name: "Hygeia",
            policy_number: `HMO-${i}`,
            company: false,
            private_client: true,
            status: statusOf ? statusOf(i) : "registered",
            hospital_number: `NVH-${String(i + 1).padStart(5, "0")}`,
            created_at: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(),
            updated_at: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(),
        });
    }
    return rows;
}
