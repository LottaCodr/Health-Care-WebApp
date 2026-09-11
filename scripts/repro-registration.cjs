// Repro harness: runs the REAL lib/services/patient.service.ts against an
// in-memory fake Supabase whose `patients` insert path enforces the same rule
// as PostgREST's schema cache — an insert payload key with no matching column
// (null-valued keys included) rejects the WHOLE insert with PGRST204
// ("Could not find the '…' column of 'patients' in the schema cache").
//
// That is what made the front-desk registration form fail in production with
// the redacted Next.js error ("An error occurred in the Server Components
// render. The specific message is omitted in production builds …"):
// the form submitted a `user_id` key (and, for under-13s, `child_class`,
// `parent_info`, `referral_info`) that `patients` has no column for.
//
// Scenarios:
//   1. OLD form payload (adult)  → insert rejected with PGRST204 'user_id'
//   2. OLD form payload (child)  → insert rejected with PGRST204
//   3. NEW form payload (adult)  → registered, hospital number + audit row
//   4. NEW form payload (child)  → registered, paediatric fields persisted
//   5. NEW payload on a database WITHOUT the paediatric migration
//      → still registered (unknown columns dropped + logged, not fatal)
//
// Set OLD_SERVICE=<path> to point at a pre-fix copy of patient.service.ts to
// re-run the failure end-to-end through the real (old) service code.
"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

// ─── Schema: the real `patients` columns (Patient model + every migration) ────
const PATIENT_COLUMNS = new Set([
    "id", "name", "email", "phone", "gender", "birth_date", "address",
    "occupation", "religion", "blood_group", "geno_type", "allergies",
    "emergency_contact_name", "emergency_contact_email",
    "emergency_contact_address", "emergency_contact_number",
    "emergency_contact_relationship", "long_term_medication",
    "significant_medication_history", "covid_vaccination_options",
    "hmo", "hmo_name", "policy_number", "company", "company_name",
    "private_client", "status", "notes", "facility_id", "portal_user_id",
    "portal_enabled", "hospital_number", "created_at", "updated_at",
]);
// 20260911_patient_paediatric_fields.sql — toggleable to emulate a database
// the migration hasn't reached yet.
const PAEDIATRIC_COLUMNS = ["child_class", "parent_info", "referral_info"];
let PAEDIATRIC_MIGRATION_APPLIED = true;

let CURRENT_USER = { id: "staff-frontdesk-1", email: "desk@hospital.test" };

const db = { staffs: [], patients: [], audit_logs: [] };
let nextHospitalNumber = 42;

// ─── Fake Supabase client (PostgREST-faithful insert validation) ─────────────
function makeClient() {
    function table(name) {
        const state = { op: "select", payload: null, filters: [], single: false };

        const b = {
            select() { return b; },
            insert(rows) { state.op = "insert"; state.payload = rows; return b; },
            update(patch) { state.op = "update"; state.payload = patch; return b; },
            eq(col, val) { state.filters.push({ col, val }); return b; },
            order() { return b; },
            range() { return b; },
            limit() { return b; },
            single() { state.single = true; return exec(); },
            maybeSingle() { return exec(); },
            then(res, rej) { return exec().then(res, rej); },
            catch(f) { return exec().catch(f); },
        };

        function matches(row) {
            return state.filters.every((f) => row[f.col] === f.val);
        }

        function exec() {
            return Promise.resolve().then(() => {
                const t = db[name];
                if (!t) return { data: null, error: { message: `table ${name} missing`, code: "42P01" } };

                if (state.op === "insert") {
                    const rows = Array.isArray(state.payload) ? state.payload : [state.payload];

                    // ── PostgREST schema-cache validation ────────────────────
                    // Every payload key must resolve to a column; the first
                    // unknown key (null values included) fails the request.
                    const columns = new Set(PATIENT_COLUMNS);
                    if (PAEDIATRIC_MIGRATION_APPLIED)
                        PAEDIATRIC_COLUMNS.forEach((c) => columns.add(c));
                    if (name === "patients") {
                        for (const row of rows) {
                            for (const key of Object.keys(row)) {
                                if (!columns.has(key)) {
                                    return {
                                        data: null,
                                        error: {
                                            code: "PGRST204",
                                            message: `Could not find the '${key}' column of 'patients' in the schema cache`,
                                            details: null,
                                            hint: null,
                                        },
                                    };
                                }
                            }
                        }
                    }

                    const stored = rows.map((r) => ({
                        id: r.id ?? `pat-${Math.random().toString(36).slice(2, 10)}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        status: "registered",
                        ...r,
                    }));
                    t.push(...stored);
                    return state.single
                        ? { data: stored[0], error: null }
                        : { data: stored, error: null };
                }

                if (state.op === "update") {
                    const updated = t.filter(matches).map((row) => Object.assign(row, state.payload));
                    return state.single
                        ? { data: updated[0] ?? null, error: updated.length === 1 ? null : { code: "PGRST116", message: "no rows" } }
                        : { data: updated, error: null };
                }

                const rows = t.filter(matches);
                return state.single
                    ? { data: rows[0] ?? null, error: rows.length === 1 ? null : { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } }
                    : { data: rows, error: null };
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
        rpc(fn) {
            // next_hospital_number → 'NVH-' + zero-padded sequence
            if (fn === "next_hospital_number") {
                return Promise.resolve({
                    data: `NVH-${String(nextHospitalNumber++).padStart(5, "0")}`,
                    error: null,
                });
            }
            return Promise.resolve({ data: null, error: { message: `function ${fn} not found`, code: "PGRST202" } });
        },
    };
}

// ─── Tiny TS-aware CommonJS loader (same approach as repro-billing.cjs) ───────
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
        } else if (spec.startsWith(".")) {
            resolved = path.resolve(path.dirname(absPath), spec);
            // A service file materialised outside lib/services/ (e.g. a
            // pre-fix copy under OLD_SERVICE) still imports its siblings —
            // fall back to the real directory.
            if (
                !fs.existsSync(resolved + ".ts") &&
                !fs.existsSync(resolved + ".tsx") &&
                !fs.existsSync(path.join(resolved, "index.ts"))
            ) {
                resolved = path.resolve(path.join(ROOT, "lib/services"), spec);
            }
        } else {
            return require(spec);
        }
        if (fs.existsSync(resolved + ".ts")) resolved += ".ts";
        else if (fs.existsSync(resolved + ".tsx")) resolved += ".tsx";
        else if (fs.existsSync(path.join(resolved, "index.ts"))) resolved = path.join(resolved, "index.ts");
        return loadModule(resolved, cache, loading);
    };

    const fn = new Function("exports", "require", "module", "__filename", "__dirname", js);
    fn(mod.exports, customRequire, mod, absPath, path.dirname(absPath));
    loading.delete(absPath);
    return mod.exports;
}

// ─── Payloads (mirrors of RegistrationSuite.handleFinalSubmit) ────────────────

/** What the form used to send for EVERY patient (see git history / pre-fix code). */
function oldFormPayload({ isChild = false, paediatrics = {} } = {}) {
    return {
        name: "Grace Adeyemi",
        email: null,
        phone: "+2348035551212",
        birth_date: isChild ? "2019-06-01" : "1991-04-12",
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
        policy_number: null,
        hmo: false,
        hmo_name: null,
        company: false,
        company_name: null,
        private_client: true,
        // ── the bug ──
        user_id: CURRENT_USER.id, // patients has no user_id column — always sent
        ...(isChild
            ? {
                  // keys sent even when the inputs were blank (clean() → null)
                  child_class: paediatrics.childClass ?? null,
                  parent_info: paediatrics.parentInfo ?? null,
                  referral_info: paediatrics.referralInfo ?? null,
              }
            : {}),
    };
}

/** What the fixed form sends. */
function newFormPayload({ isChild = false, paediatrics = {} } = {}) {
    const clean = (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);
    return {
        name: "Grace Adeyemi",
        email: null,
        phone: "+2348035551212",
        birth_date: isChild ? "2019-06-01" : "1991-04-12",
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
        policy_number: null,
        hmo: false,
        hmo_name: null,
        company: false,
        company_name: null,
        private_client: true,
        // no user_id; paediatric keys only when they hold a value
        ...(isChild
            ? {
                  ...(clean(paediatrics.childClass) ? { child_class: clean(paediatrics.childClass) } : {}),
                  ...(clean(paediatrics.parentInfo) ? { parent_info: clean(paediatrics.parentInfo) } : {}),
                  ...(clean(paediatrics.referralInfo) ? { referral_info: clean(paediatrics.referralInfo) } : {}),
              }
            : {}),
    };
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

function freshContext() {
    for (const k of Object.keys(db)) db[k] = [];
    db.staffs.push({ id: CURRENT_USER.id, role: "FrontDesk", email: CURRENT_USER.email, name: "Front Desk" });
    PAEDIATRIC_MIGRATION_APPLIED = true;
    nextHospitalNumber = 42;
    const src = process.env.OLD_SERVICE || path.join(ROOT, "lib/services/patient.service.ts");
    return { patientService: loadModule(src, new Map()), src };
}

const run = (label, fn) =>
    Promise.resolve()
        .then(fn)
        .then((v) => ({ label, ok: true, v }), (e) => ({ label, ok: false, err: e && (e.message || String(e)) }));

async function main() {
    console.log("service under test:", process.env.OLD_SERVICE ? process.env.OLD_SERVICE + "  (PRE-FIX)" : "lib/services/patient.service.ts  (current)");

    console.log("\n==== SCENARIO 1 — OLD adult payload (what production received): raw insert");
    {
        const { patientService } = freshContext();
        // Exactly the call the pre-fix service made for every registration:
        const r = await run("createPatient(old adult payload)", () => patientService.createPatient(oldFormPayload()));
        console.log(r.ok ? "UNEXPECTED SUCCESS" : "THREW: " + r.err);
    }

    console.log("\n==== SCENARIO 2 — OLD child payload (paediatric keys, null-valued included)");
    {
        const { patientService } = freshContext();
        const r = await run("createPatient(old child payload, blank paediatrics)", () =>
            patientService.createPatient(oldFormPayload({ isChild: true }))
        );
        console.log(r.ok ? "UNEXPECTED SUCCESS" : "THREW: " + r.err);
    }

    console.log("\n==== SCENARIO 3 — FIXED adult payload → registration must succeed");
    {
        const { patientService } = freshContext();
        const r = await run("createPatient(new adult payload)", () => patientService.createPatient(newFormPayload()));
        if (!r.ok) { console.log("THREW: " + r.err); } else {
            const p = r.v;
            console.log(`OK — ${p.name} registered as ${p.hospital_number} (status ${p.status})`);
            const audit = db.audit_logs.find((a) => a.action === "PATIENT_REGISTERED" && a.entity_id === p.id);
            console.log(audit ? `OK — audit row written, registered_by=${audit.changes.registered_by}` : "MISSING audit row!");
            console.log("user_id leaked into row?", "user_id" in p ? "YES (bad)" : "no");
        }
    }

    console.log("\n==== SCENARIO 4 — FIXED child payload (migration applied) → paediatric data persists");
    {
        const { patientService } = freshContext();
        const r = await run("createPatient(new child payload)", () =>
            patientService.createPatient(newFormPayload({ isChild: true, paediatrics: { childClass: "Primary 3", parentInfo: "Mr & Mrs Adeyemi", referralInfo: "School clinic" } }))
        );
        if (!r.ok) { console.log("THREW: " + r.err); } else {
            console.log(`OK — ${r.v.name} registered as ${r.v.hospital_number}`);
            console.log(`     child_class=${JSON.stringify(r.v.child_class)} parent_info=${JSON.stringify(r.v.parent_info)} referral_info=${JSON.stringify(r.v.referral_info)}`);
        }
    }

    console.log("\n==== SCENARIO 5 — FIXED child payload on a DB WITHOUT the paediatric migration");
    console.log("     (self-healing: unknown columns dropped + logged, patient still registered)");
    {
        const { patientService } = freshContext();
        PAEDIATRIC_MIGRATION_APPLIED = false;
        const r = await run("createPatient(new child payload, unmigrated DB)", () =>
            patientService.createPatient(newFormPayload({ isChild: true, paediatrics: { childClass: "JSS 1" } }))
        );
        if (!r.ok) { console.log("THREW: " + r.err); } else {
            console.log(`OK — ${r.v.name} still registered as ${r.v.hospital_number} (child_class dropped, logged above)`);
        }
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
