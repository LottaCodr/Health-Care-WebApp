// Repro harness (server side): what the browser ACTUALLY receives when a
// registration fails.
//
// The front desk kept reporting the same wall of text:
//
//   "An error occurred in the Server Components render. The specific message
//    is omitted in production builds to avoid leaking sensitive details. A
//    digest property is included on this error instance …"
//
// That is not a Next.js bug report — it is React Flight's `resolveErrorProd()`
// (shipped in next/dist/compiled/react-server-dom-webpack). Next.js streams a
// Server Action's promise into the RSC payload (`{ a: actionResult, … }` in
// next/dist/server/app-render/app-render.js), and in production an action that
// THROWS is delivered to the browser as that digest-only placeholder. The real
// message never leaves the server, whatever it says — including the friendly
// text `formatFriendlyDbError` produces.
//
// This harness proves it end to end against the real thing:
//   • a fake Supabase (GoTrue + PostgREST) that speaks the real HTTP protocol,
//   • `next start` serving the real production build,
//   • the real `createPatient` Server Action, invoked exactly the way the
//     browser invokes it (Next-Action header + encodeReply body),
//   • the response decoded with the same React Flight client the browser uses.
//
// Usage:
//   node scripts/repro-registration-action.cjs            # DB rejects the insert
//   node scripts/repro-registration-action.cjs --mode=ok  # happy path
//
// Requires a production build (`npx next build`) to exist in .next.
"use strict";

const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const MODE = argOf("mode", "reject"); // reject | ok | unreachable
const NEXT_PORT = Number(argOf("port", "3111"));
const DB_PORT = Number(argOf("dbport", "54321"));

const STAFF_ID = "6f1d0f0a-1111-4a1a-9f0f-0f0f0f0f0f0f";
const DB_URL = `http://127.0.0.1:${DB_PORT}`;

// The payload the registration form submits for an HMO patient
// (lib/utils/registration-form.ts#buildPatientPayload).
const HMO_PAYLOAD = {
    name: "Grace Adeyemi",
    email: null,
    phone: "+2348035551212",
    birth_date: "1991-04-12",
    gender: "Female",
    address: null,
    occupation: null,
    religion: "Christianity",
    status: "sent-to-nurse",
    emergency_contact_name: null,
    emergency_contact_number: null,
    emergency_contact_relationship: null,
    emergency_contact_email: null,
    emergency_contact_address: null,
    allergies: null,
    significant_medication_history: null,
    long_term_medication: null,
    covid_vaccination_options: "Not Vaccinated",
    blood_group: null,
    geno_type: null,
    policy_number: "HYG-88231",
    hmo: true,
    hmo_name: "Hygeia HMO",
    company: false,
    company_name: null,
    private_client: false,
};

// ─── 1. Fake Supabase ─────────────────────────────────────────────────────────
// Enough of GoTrue + PostgREST for @supabase/supabase-js + @supabase/ssr.
function startFakeSupabase() {
    const calls = [];

    const server = http.createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const url = new URL(req.url, DB_URL);
            calls.push(`${req.method} ${url.pathname}${url.search}`);
            const json = (status, value, type = "application/json") => {
                const text = JSON.stringify(value);
                res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(text) });
                res.end(text);
            };

            // ── GoTrue: GET /auth/v1/user ─────────────────────────────────
            if (url.pathname === "/auth/v1/user") {
                return json(200, {
                    id: STAFF_ID,
                    aud: "authenticated",
                    role: "authenticated",
                    email: "desk@hospital.test",
                    app_metadata: { provider: "email" },
                    user_metadata: {},
                    created_at: "2026-01-01T00:00:00.000Z",
                });
            }

            // ── PostgREST: staffs lookup (requireStaff) ────────────────────
            if (url.pathname === "/rest/v1/staffs") {
                return json(200, { role: "Frontdesk", email: "desk@hospital.test" }, "application/vnd.pgrst.object+json");
            }

            // ── PostgREST: hospital number ─────────────────────────────────
            if (url.pathname === "/rest/v1/rpc/next_hospital_number") {
                return json(200, "NVH-000042");
            }

            // ── PostgREST: the patients insert ─────────────────────────────
            if (url.pathname === "/rest/v1/patients") {
                if (MODE === "ok") {
                    return json(
                        201,
                        {
                            id: "pat-hmo-1",
                            hospital_number: "NVH-000042",
                            status: "sent-to-nurse",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            ...JSON.parse(body || "[]")[0],
                        },
                        "application/vnd.pgrst.object+json"
                    );
                }
                // A database that has drifted from the migrations: the payload
                // names a column PostgREST cannot find, so the WHOLE insert is
                // rejected — exactly the failure class that took registration
                // down in 2026-09.
                return json(400, {
                    code: "PGRST204",
                    message: "Could not find the 'hmo_name' column of 'patients' in the schema cache",
                    details: null,
                    hint: null,
                });
            }

            return json(404, { message: `unhandled fake route ${req.method} ${url.pathname}` });
        });
    });

    return new Promise((resolve) => server.listen(DB_PORT, "127.0.0.1", () => resolve({ server, calls })));
}

// ─── 2. Session cookie (@supabase/ssr storage key for 127.0.0.1) ──────────────
function sessionCookie() {
    const storageKey = `sb-${new URL(DB_URL).hostname.split(".")[0]}-auth-token`;
    const session = {
        access_token: "fake.access.token",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: { id: STAFF_ID, email: "desk@hospital.test", aud: "authenticated", role: "authenticated" },
    };
    // @supabase/ssr reads the cookie as JSON (it only base64-decodes values
    // carrying its "base64-" marker), so hand it plain JSON.
    return { storageKey, value: `${storageKey}=${encodeURIComponent(JSON.stringify(session))}` };
}

// ─── 3. Find the built action id for createPatient ────────────────────────────
function findActionId() {
    const manifest = require(path.join(ROOT, ".next/server/server-reference-manifest.json"));
    const entries = Object.entries(manifest.node || {});
    const hit = entries.find(
        ([, info]) => info?.filename === "lib/services/patient.service.ts" && info?.exportedName === "createPatient"
    );
    if (!hit) throw new Error("createPatient action id not found in .next — run `npx next build` first");
    return hit[0];
}

// ─── 4. Call the action the way the browser does ──────────────────────────────
async function callAction(actionId) {
    const { encodeReply } = require(path.join(
        ROOT,
        "node_modules/next/dist/compiled/react-server-dom-webpack/client.edge.js"
    ));
    const body = await encodeReply([HMO_PAYLOAD]);
    const cookie = sessionCookie();

    const res = await fetch(`http://127.0.0.1:${NEXT_PORT}/front-desk/patient/new`, {
        method: "POST",
        headers: {
            "next-action": actionId,
            "content-type": "text/plain;charset=UTF-8",
            accept: "text/x-component",
            origin: `http://127.0.0.1:${NEXT_PORT}`,
            cookie: cookie.value,
        },
        body: typeof body === "string" ? body : "",
    });

    const text = await res.text();
    return { status: res.status, text, storageKey: cookie.storageKey };
}

/** Pull the action-result row (`"a":…`) and any error row out of the flight stream. */
function summariseFlight(text) {
    const lines = text.split("\n").filter(Boolean);
    const header = lines.find((l) => /^\w*:\{/.test(l) && l.includes('"a":')) ?? lines.find((l) => l.includes('"a":'));
    const errorRows = lines.filter((l) => /:E\{/.test(l) || l.includes('"digest"'));
    // The action result itself rides in a separate row ("a":"$@1" → row 1).
    const resultRows = lines.filter((l) => /"ok":|"message":|"patient":/.test(l));
    return { header, errorRows, resultRows };
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`mode=${MODE}  next port=${NEXT_PORT}  fake supabase=${DB_URL}`);

    const { server: db, calls } = await startFakeSupabase();
    const actionId = findActionId();
    console.log("createPatient action id:", actionId);

    const next = spawn("npx", ["next", "start", "-p", String(NEXT_PORT), "-H", "127.0.0.1"], {
        cwd: ROOT,
        env: {
            ...process.env,
            NODE_ENV: "production",
            NEXT_TELEMETRY_DISABLED: "1",
            NEXT_PUBLIC_SUPABASE_URL: DB_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.fake-anon-key",
        },
        stdio: ["ignore", "pipe", "pipe"],
    });
    let serverLog = "";
    next.stdout.on("data", (d) => (serverLog += d));
    next.stderr.on("data", (d) => (serverLog += d));

    // Wait for "Ready"
    await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("next start did not become ready\n" + serverLog)), 60_000);
        const iv = setInterval(() => {
            if (/Ready in|started server on/i.test(serverLog)) {
                clearTimeout(t);
                clearInterval(iv);
                resolve();
            }
        }, 200);
    });

    try {
        const { status, text } = await callAction(actionId);
        console.log("\n── POST /front-desk/patient/new (Server Action) →", status);
        console.log("fake supabase calls seen by the server:");
        calls.forEach((c) => console.log("   ", c));

        const { header, errorRows, resultRows } = summariseFlight(text);
        console.log("\n── what the browser receives (raw flight rows) ──");
        console.log("action-result row:", header ? header.slice(0, 220) : "(none)");
        if (resultRows.length) {
            resultRows.forEach((r) => console.log("action payload row:", r.slice(0, 400)));
        }
        if (errorRows.length) {
            errorRows.forEach((r) => console.log("error row:", r.slice(0, 300)));
        }

        // ── Verdict, read from the authoritative payload (the raw flight rows
        // the browser receives). The decode step below is a bonus. ──────────
        console.log("\n── verdict ──");
        const digestOnly = errorRows.some((r) => /:E\{"digest"/.test(r));
        if (digestOnly) {
            console.log("PRE-FIX BEHAVIOUR: the action THREW, so the browser receives a digest-only");
            console.log("error row and React Flight's resolveErrorProd() turns it into:");
            console.log('   "An error occurred in the Server Components render. The specific message');
            console.log('    is omitted in production builds to avoid leaking sensitive details. A digest');
            console.log('    property is included on this error instance …"');
            console.log("→ the real reason stays in the server logs; the desk sees that text.");
        } else if (resultRows.some((r) => r.includes('"ok":false'))) {
            console.log("FIXED BEHAVIOUR: the action RETURNED its failure, so the reason survives the wire");
            console.log("and the registration form can show it to the desk verbatim.");
        } else if (resultRows.some((r) => r.includes('"ok":true'))) {
            console.log("HAPPY PATH: the action returned the registered patient, so the form can");
            console.log("confirm the registration and its hospital number.");
        } else {
            console.log("No action-result payload found — inspect the raw rows above.");
        }

        // Decode it the way the browser does (best effort — a client-reference
        // row for the page's own chunks can trip a bare Node-side decoder).
        const { createFromReadableStream } = require(path.join(
            ROOT,
            "node_modules/next/dist/compiled/react-server-dom-webpack/client.edge.js"
        ));
        try {
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(text));
                    controller.close();
                },
            });
            const stubModules = new Proxy(
                {},
                { get: () => ({ id: "stub", chunks: [], name: "stub", async: false }) }
            );
            const payload = await createFromReadableStream(stream, {
                moduleMap: stubModules,
                ssrManifest: { moduleMap: stubModules, moduleLoading: null },
                serverModuleMap: new Proxy({}, { get: () => ({ id: "stub" }) }),
            });
            const actionResult = await payload.a;
            console.log("\ndecoded client-side result:", JSON.stringify(actionResult));
        } catch (err) {
            console.log("\n(client-side decode not available in this harness:", (err && err.message) + ")");
        }
    } finally {
        next.kill("SIGTERM");
        db.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
