// Repro harness: runs the REAL lib/services code against an in-memory fake
// Supabase client to trace the front-desk lab price-edit + settle flow.
"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

// ─── In-memory "database" ─────────────────────────────────────────────────────
const db = {
    staffs: [],
    patients: [],
    payments: [],
    lab_requests: [],
    lab_test_catalog: [],
    notifications: [],
    audit_logs: [],
    consultations: [],
};

let CURRENT_USER = { id: "staff-frontdesk-1", email: "desk@hospital.test" };

// Simulates RLS policies that filter out the caller's UPDATE (PostgREST
// reports 0 changed rows and NO error — exactly what a broken staff_has_role()
// produces for camelCase roles).
let RLS_BLOCK_PAYMENT_UPDATES = false;

let log = [];
function snapshot(tag, row) {
    log.push({ tag, row: JSON.parse(JSON.stringify(row)) });
}

// ─── Fake Supabase builder ────────────────────────────────────────────────────
function makeClient() {
    function table(name) {
        const state = {
            op: "select",
            payload: null,
            filters: [], // {type, col, val, vals, op}
            orderSpec: null,
            limitN: null,
            selectCols: "*",
            single: false,
            maybe: false,
            notSpec: null,
            orSpec: null,
        };

        const b = {
            select(cols) { state.selectCols = cols || "*"; return b; },
            insert(rows) { state.op = "insert"; state.payload = rows; return b; },
            update(patch) { state.op = "update"; state.payload = patch; return b; },
            delete() { state.op = "delete"; return b; },
            eq(col, val) { state.filters.push({ type: "eq", col, val }); return b; },
            in(col, vals) { state.filters.push({ type: "in", col, vals }); return b; },
            neq(col, val) { state.filters.push({ type: "neq", col, val }); return b; },
            ilike(col, val) { state.filters.push({ type: "ilike", col, val }); return b; },
            or(expr) { state.orSpec = expr; return b; },
            not(col, op, val) { state.notSpec = { col, op, val }; return b; },
            order(col, opts) { state.orderSpec = { col, asc: !(opts && opts.ascending === false) }; return b; },
            limit(n) { state.limitN = n; return b; },
            single() { state.single = true; return exec(); },
            maybeSingle() { state.maybe = true; return exec(); },
            then(res, rej) { return exec().then(res, rej); },
            catch(f) { return exec().catch(f); },
        };

        function matches(row) {
            for (const f of state.filters) {
                if (f.type === "eq" && row[f.col] !== f.val) return false;
                if (f.type === "neq" && row[f.col] === f.val) return false;
                if (f.type === "in" && !f.vals.includes(row[f.col])) return false;
                if (f.type === "ilike") {
                    const pat = f.val.replace(/%/g, "").toLowerCase();
                    if (!String(row[f.col] ?? "").toLowerCase().includes(pat)) return false;
                }
            }
            if (state.notSpec && state.notSpec.op === "like") {
                const pat = state.notSpec.val.replace(/%/g, "");
                if (String(row[state.notSpec.col] ?? "").startsWith(pat)) return false;
            }
            if (state.orSpec) {
                // e.g. "category.eq.deposit,payment_type.eq.deposit"
                const clauses = state.orSpec.split(",").map((c) => {
                    const [col, op, ...rest] = c.split(".");
                    return { col, op, val: rest.join(".") };
                });
                const hit = clauses.some((c) =>
                    c.op === "eq" ? row[c.col] === c.val : false
                );
                if (!hit) return false;
            }
            return true;
        }

        function project(row) {
            if (state.selectCols === "*") return { ...row };
            const cols = state.selectCols.split(",").map((c) => c.trim());
            const out = {};
            for (const c of cols) out[c] = row[c];
            return out;
        }

        function exec() {
            return Promise.resolve().then(() => {
                const t = db[name];
                if (!t) return { data: null, error: { message: `table ${name} missing`, code: "42P01" } };

                if (state.op === "insert") {
                    const rows = (Array.isArray(state.payload) ? state.payload : [state.payload]).map((r) => ({
                        id: r.id ?? `${name.slice(0, 3)}-${Math.random().toString(36).slice(2, 10)}`,
                        created_at: r.created_at ?? new Date().toISOString(),
                        ...r,
                    }));
                    t.push(...rows);
                    if (state.single) return { data: rows[0], error: null };
                    return { data: rows, error: null };
                }

                if (state.op === "update") {
                    let n = 0;
                    const updatedRows = [];
                    for (const row of t) {
                        if (RLS_BLOCK_PAYMENT_UPDATES && name === "payments") break; // policy filtered every row
                        if (!matches(row)) continue;
                        Object.assign(row, state.payload);
                        n++;
                        updatedRows.push(row);
                    }
                    // PostgREST returns 0 rows silently when the status/id guard
                    // doesn't match — exactly what we want to observe.
                    let data = updatedRows.map(project);
                    if (state.single) {
                        if (data.length === 1) return { data: data[0], error: null };
                        if (data.length === 0) return { data: null, error: { code: "PGRST116", message: "no rows" } };
                        return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
                    }
                    return { data, error: null, count: n };
                }

                if (state.op === "delete") {
                    const keep = t.filter((row) => !matches(row));
                    const removed = t.length - keep.length;
                    db[name] = keep;
                    return { data: null, error: null, count: removed };
                }

                // select
                let rows = t.filter(matches); if (process.env.DBG) console.error("[fake select]", name, JSON.stringify(state.filters), "rows:", rows.length);
                if (state.orderSpec) {
                    rows = [...rows].sort((a, b) => {
                        const A = a[state.orderSpec.col], B = b[state.orderSpec.col];
                        const cmp = String(A ?? "").localeCompare(String(B ?? ""));
                        return state.orderSpec.asc ? cmp : -cmp;
                    });
                }
                if (state.limitN != null) rows = rows.slice(0, state.limitN);
                let data = rows.map((r) => {
                    const p = project(r);
                    // support the joined "patients: ..." enrichment done in services
                    if (name === "payments" && state.selectCols.includes("patients")) {
                        p.patients = db.patients.find((pt) => pt.id === r.patient_id) ?? null;
                    }
                    return p;
                });
                if (state.single) {
                    if (data.length === 1) return { data: data[0], error: null };
                    return { data: null, error: { code: "PGRST116", message: "no rows" } };
                }
                if (state.maybe) return { data: data[0] ?? null, error: null };
                return { data, error: null };
            });
        }

        return b;
    }

    return {
        from: table,
        auth: {
            async getUser() {
                return { data: { user: CURRENT_USER }, error: null };
            },
        },
    };
}

// ─── Tiny TS-aware CommonJS loader ────────────────────────────────────────────
function loadModule(absPath, cache = new Map(), loading = new Set()) {
    if (cache.has(absPath)) return cache.get(absPath).exports;
    if (loading.has(absPath)) throw new Error("circular: " + absPath);
    loading.add(absPath);
    const src = fs.readFileSync(absPath, "utf8");
    const js = ts.transpileModule(src, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
        },
    }).outputText;

    const mod = { exports: {} };
    cache.set(absPath, mod);
    const customRequire = (spec) => {
        if (spec === "@/utils/supabase/server") {
            return { createClient: async () => makeClient() };
        }
        let resolved;
        if (spec.startsWith("@/")) {
            resolved = path.join(ROOT, spec.slice(2));
            if (fs.existsSync(resolved + ".ts")) resolved += ".ts";
            else if (fs.existsSync(resolved + ".tsx")) resolved += ".tsx";
            else if (fs.existsSync(path.join(resolved, "index.ts"))) resolved = path.join(resolved, "index.ts");
        } else if (spec.startsWith(".")) {
            resolved = path.resolve(path.dirname(absPath), spec);
            if (fs.existsSync(resolved + ".ts")) resolved += ".ts";
            else if (fs.existsSync(resolved + ".tsx")) resolved += ".tsx";
            else if (fs.existsSync(path.join(resolved, "index.ts"))) resolved = path.join(resolved, "index.ts");
        } else {
            return require(spec);
        }
        return loadModule(resolved, cache, loading);
    };

    const fn = new Function("exports", "require", "module", "__filename", "__dirname", js);
    fn(mod.exports, customRequire, mod, absPath, path.dirname(absPath));
    loading.delete(absPath);
    return mod.exports;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
function seed() {
    db.staffs.push({ id: CURRENT_USER.id, role: "FrontDesk", email: CURRENT_USER.email, name: "Front Desk" });
    db.staffs.push({ id: "staff-lab-1", role: "LabTechnician", email: "lab@hospital.test", name: "Lab Tech" });

    db.patients.push({
        id: "patient-1",
        name: "John Doe",
        phone: "0803 111 2222",
        status: "awaiting-payment",
        hmo: false, company: false, private_client: true,
    });

    db.lab_test_catalog.push({ id: "cat-1", test_name: "Malaria Test", category: "Haematology", price: 2000, is_active: true });
}


async function freshContext(user) {
    // reset DB
    for (const k of Object.keys(db)) db[k] = [];
    RLS_BLOCK_PAYMENT_UPDATES = false;
    CURRENT_USER = user ?? { id: "staff-frontdesk-1", email: "desk@hospital.test" };
    seed();
    return {
        paymentService: loadModule(path.join(ROOT, "lib/services/payment.service.ts"), new Map()),
        labService: loadModule(path.join(ROOT, "lib/services/lab.service.ts"), new Map()),
    };
}

function show(r) {
    if (!r.ok) { console.log("THREW:", String(r.err).split("\n")[0]); return; }
    const v = r.v;
    if (Array.isArray(v)) {
        console.log(JSON.stringify(v.map((x) => ({
            id: x.id, category: x.category, description: x.description,
            amount: x.amount, amount_kobo: x.amount_kobo,
            amount_paid_kobo: x.amount_paid_kobo, status: x.status,
        })), null, 1));
    } else {
        console.log(JSON.stringify({
            id: v.id, category: v.category, description: v.description,
            amount: v.amount, amount_kobo: v.amount_kobo,
            amount_paid_kobo: v.amount_paid_kobo, status: v.status,
        }, null, 1));
    }
}

async function scenarioHealthy() {
    console.log("\n==== SCENARIO 1 - healthy DB (writes land): full front-desk flow");
    const { paymentService, labService } = await freshContext();
    const P = (label, fn) => ({ label, run: () => Promise.resolve().then(fn)
        .then((v) => ({ label, ok: true, v }), (e) => ({ label, ok: false, err: e && (e.message || String(e)) })) });

    const steps = [
        P("createLabRequest (front desk, price 3500)", () =>
            labService.createLabRequest({ patientId: "patient-1", testType: "Typhoid Test", price: 3500, requestedBy: "staff-doctor-1" })),
        P("updatePendingBill (Edit Bill: 3500 -> 5000)", async () => {
            const bills = await paymentService.listPaymentsByPatient("patient-1");
            const labBill = bills.find((b) => b.category === "lab");
            if (!labBill) throw new Error("NO LAB BILL after createLabRequest");
            return paymentService.updatePendingBill({ id: labBill.id, amount: 5000, description: labBill.description, category: "lab" });
        }),
        P("confirmPayment (full settle)", async () => {
            const bills = await paymentService.listPaymentsByPatient("patient-1");
            const labBill = bills.find((b) => b.category === "lab");
            if (!labBill) throw new Error("NO LAB BILL before settle");
            return paymentService.confirmPayment({ id: labBill.id, paymentType: "full", method: "cash" });
        }),
        P("listPaymentsByPatient after settle", () => paymentService.listPaymentsByPatient("patient-1")),
        P("listPendingPayments (checkout queue)", () => paymentService.listPendingPayments()),
    ];
    for (const s of steps) { console.log("\n-- " + s.label); show(await s.run()); }
}

async function scenarioRlsBlocked() {
    console.log("\n==== SCENARIO 2 - RLS silently blocks payment updates (broken staff_has_role):");
    console.log("    before the fix both actions 'succeeded' and changed NOTHING;");
    console.log("    after the fix they must FAIL LOUDLY with an actionable error.");
    let { paymentService, labService } = await freshContext();
    RLS_BLOCK_PAYMENT_UPDATES = true;

    await labService.createLabRequest({ patientId: "patient-1", testType: "Typhoid Test", price: 3500, requestedBy: "staff-doctor-1" });
    const bills = await paymentService.listPaymentsByPatient("patient-1");
    const labBill = bills.find((b) => b.category === "lab");

    const edit = await Promise.resolve()
        .then(() => paymentService.updatePendingBill({ id: labBill.id, amount: 5000, category: "lab" }))
        .then((v) => ({ ok: true, v }), (e) => ({ ok: false, err: e.message }));
    console.log("\n-- updatePendingBill (Edit Bill 3500->5000, RLS blocked)");
    console.log(edit.ok
        ? "RESOLVED (silent no-op - the old bug): amount now " + edit.v.amount
        : "THREW (loud, actionable): " + edit.err);

    const settle = await Promise.resolve()
        .then(() => paymentService.confirmPayment({ id: labBill.id, paymentType: "full", method: "cash" }))
        .then((v) => ({ ok: true, v }), (e) => ({ ok: false, err: e.message }));
    console.log("\n-- confirmPayment (settle, RLS blocked)");
    console.log(settle.ok
        ? "RESOLVED (silent no-op - the old bug): status now " + settle.v.status
        : "THREW (loud, actionable): " + settle.err);

    console.log("\n-- bill in DB afterwards:", JSON.stringify({
        amount: db.payments[0].amount, status: db.payments[0].status,
    }));

    console.log("\n-- settleAllPatientBills (Settle All, RLS blocked)");
    const settleAll = await Promise.resolve()
        .then(() => paymentService.settleAllPatientBills({ patientId: "patient-1" }))
        .then((v) => ({ ok: true, v }), (e) => ({ ok: false, err: e.message }));
    console.log(settleAll.ok
        ? "RESOLVED (old bug claimed success): " + JSON.stringify(settleAll.v)
        : "THREW (loud, actionable): " + settleAll.err);

    console.log("\n==== SCENARIO 3 - lab tech sets price on the bill (RLS blocked, no service-role key)");
    RLS_BLOCK_PAYMENT_UPDATES = true;
    // the ORDER is created by the doctor…
    const ctxDoc = await freshContext({ id: "staff-doctor-9", email: "doctor@hospital.test" });
    await ctxDoc.labService.createLabRequest({ patientId: "patient-1", testType: "Malaria Test", price: 0, requestedBy: "staff-doctor-9" });
    // …and the lab tech enters the result + price (same DB, new session)
    CURRENT_USER = { id: "staff-lab-1", email: "lab@hospital.test" };
    RLS_BLOCK_PAYMENT_UPDATES = true; // lab tech's own session is filtered by the payments UPDATE policy
    const labService3 = loadModule(path.join(ROOT, "lib/services/lab.service.ts"), new Map());
    const req = db.lab_requests[0];
    const sync = await Promise.resolve()
        .then(() => labService3.updateLabRequest(req.id, { status: "completed", result: "P. falciparum seen", price: 2500, completed_by: "staff-lab-1" }))
        .then((v) => ({ ok: true, v }), (e) => ({ ok: false, err: e.message }));
    console.log("-- updateLabRequest (complete + price 2500, RLS blocked)");
    console.log(sync.ok
        ? "RESOLVED (old bug: bill still N" + db.payments[0].amount + " - silent)"
        : "THREW (loud, actionable): " + sync.err);
    console.log("-- lab request row:", JSON.stringify({ status: db.lab_requests[0].status, price: db.lab_requests[0].price ?? null }));
    console.log("-- bill row:", JSON.stringify({ amount: db.payments[0].amount, status: db.payments[0].status }));
}

async function main() {
    await scenarioHealthy();
    await scenarioRlsBlocked();
    console.log("\nDone.");
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
