// Repro harness: what the desk sees when the DATABASE refuses a registration
// (the "You do not have permission to perform this action." incident).
//
// Background — the 2026-09-16 front-desk report:
//
//   "You do not have permission to perform this action. Please log in with an
//    authorized account."
//
// ...while registering an HMO patient. After PR #130 made createPatient RETURN
// failures instead of throwing them, the desk's screen finally names the real
// cause. That message is produced by `formatFriendlyDbError` and, before this
// fix, it collapsed THREE different failures into one "please log in" line —
// wrong advice for a desk user who had just filled a four-step wizard while
// signed in:
//
//   1. the DATABASE refused the INSERT (SQLSTATE 42501, "row-level security")
//      — a server-side policy drift; re-logging in cannot fix it. Nothing in
//      the app or migrations treats an HMO row differently (the insert policy
//      is row-value-independent), so "HMO was selected" is when it was
//      noticed, not the mechanism.
//   2. the app's auth guard found no valid session ("UNAUTHORIZED: …") —
//      here "sign in again" IS the right advice.
//   3. the app's auth guard rejected the ROLE ("FORBIDDEN: …").
//
// Scenarios (all against the REAL lib/utils/friendly-errors.ts and the REAL
// lib/services/patient.service.ts over a fake Supabase):
//   1. RLS write-block (42501)            → database-policy message + technical detail
//   2. auth-guard UNAUTHORIZED            → sign-in message
//   3. auth-guard FORBIDDEN               → role message
//   4. expired JWT (PGRST301)             → sign-in message
//   5. regression: unique-constraint etc. unchanged
//   6. service: 42501 insert → { ok:false, code:"42501", message names the DB }
//   7. service: drifted schema drops the HMO columns → ok:true BUT warnings say what did NOT save
//
// Usage: node scripts/repro-registration-permission.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

// ─── Tiny TS-aware CommonJS loader (same approach as repro-registration.cjs) ──
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
        if (spec.startsWith("@/")) resolved = path.join(ROOT, spec.slice(2));
        else if (spec.startsWith(".")) resolved = path.resolve(path.dirname(absPath), spec);
        else return require(spec);
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

// ─── Configurable fake Supabase ────────────────────────────────────────────────
// MODE: "ok" (patients insert succeeds) | "drift" (insert succeeds but the
// insurance columns don't exist — PostgREST PGRST204, the service drops and
// retries) | "rls" (the database refuses the insert with 42501).
let MODE = "ok";

const CURRENT_USER = { id: "6f1d0f0a-1111-4a1a-9f0f-0f0f0f0f0f0f", email: "desk@hospital.test" };
const STAFF_ROW = { role: "FrontDesk", email: CURRENT_USER.email };

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
const DRIFTED_COLUMNS = new Set(["hmo_name", "policy_number", "company_name"]); // migration not applied

const db = { staffs: [], patients: [], audit_logs: [] };
let nextHospitalNumber = 42;

function makeClient() {
    function table(name) {
        const state = { op: "select", payload: null, filters: [], single: false };
        const b = {
            select() { return b; },
            insert(rows) { state.op = "insert"; state.payload = rows; return b; },
            update(patch) { state.op = "update"; state.payload = patch; return b; },
            eq(col, val) { state.filters.push({ col, val }); return b; },
            order() { return b; },
            limit() { return b; },
            single() { state.single = true; return exec(); },
            then(res, rej) { return exec().then(res, rej); },
            catch(f) { return exec().catch(f); },
        };

        function matches(row) { return state.filters.every((f) => row[f.col] === f.val); }

        function exec() {
            return Promise.resolve().then(() => {
                const t = db[name];
                if (!t) return { data: null, error: { message: `table ${name} missing`, code: "42P01" } };

                if (state.op === "insert") {
                    if (name === "patients" && MODE === "rls") {
                        // What a drifted RLS policy / broken staff_has_role
                        // produces — the exact shape behind the desk's report.
                        return {
                            data: null,
                            error: {
                                code: "42501",
                                message: 'new row violates row-level security policy for table "patients"',
                                details: null,
                                hint: null,
                            },
                        };
                    }

                    const rows = Array.isArray(state.payload) ? state.payload : [state.payload];
                    if (name === "patients") {
                        // PostgREST schema-cache validation: unknown keys fail
                        // the whole insert. In drift mode the insurance columns
                        // "don't exist" yet.
                        const columns = new Set(PATIENT_COLUMNS);
                        if (MODE === "drift") DRIFTED_COLUMNS.forEach((c) => columns.delete(c));
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

                    // The database simply has no such columns in drift mode —
                    // model the drop so the stored row mirrors reality.
                    const stored = rows.map((r) => {
                        const row = { ...r };
                        if (name === "patients" && MODE === "drift") {
                            DRIFTED_COLUMNS.forEach((c) => delete row[c]);
                        }
                        return {
                            id: row.id ?? `pat-${Math.random().toString(36).slice(2, 10)}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            status: "registered",
                            ...row,
                        };
                    });
                    t.push(...stored);
                    return state.single ? { data: stored[0], error: null } : { data: stored, error: null };
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
            async getUser() { return { data: { user: CURRENT_USER }, error: null }; },
        },
        rpc(fn) {
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

// The service reads staffs via .from("staffs").select(...).eq(...).single();
// seed one row so requireStaff passes (RLS is not modelled here — it lives in
// the database, which is exactly what scenario 1 emulates).
db.staffs.push({ id: CURRENT_USER.id, ...STAFF_ROW });

// staffs table needs select filtering by id — matches() handles it.
const { formatFriendlyDbError } = loadModule(path.join(ROOT, "lib/utils/friendly-errors.ts"));
const { createPatient } = loadModule(path.join(ROOT, "lib/services/patient.service.ts"));

// ─── The HMO payload the form sends (lib/utils/registration-form.ts) ──────────
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

let failures = 0;
function check(label, cond, detail) {
    if (cond) console.log(`  ✓ ${label}`);
    else { failures++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
}

// ═══ SCENARIO 1: database RLS write-block (42501) ═════════════════════════════
console.log("\n==== 1 — the DATABASE refuses the insert (42501, row-level security)");
{
    const msg = formatFriendlyDbError(
        { code: "42501", message: 'new row violates row-level security policy for table "patients"', details: null, hint: null },
        "Registration failed."
    );
    console.log(`  desk sees: ${msg}`);
    check("no longer tells a signed-in desk to log in", !/Please log in with an authorized account/i.test(msg));
    check("says the database refused the save", /database refused/i.test(msg));
    check("says the entered details are fine", /Nothing is wrong with the details/i.test(msg));
    check("names the migration to apply", /20260829_fix_staff_role_matching_casing\.sql/.test(msg));
    check("names the diagnostic script", /diagnose-registration-rls\.sql/.test(msg));
    check("carries the technical detail for a screenshot", /Technical detail: new row violates row-level security policy/i.test(msg));
}

// ═══ SCENARIO 2: auth-guard UNAUTHORIZED (session gone) ═══════════════════════
console.log("\n==== 2 — auth-guard says no session (UNAUTHORIZED)");
{
    const msg = formatFriendlyDbError(
        new Error("UNAUTHORIZED: You must be signed in as hospital staff to perform this action."),
        "Registration failed."
    );
    console.log(`  desk sees: ${msg}`);
    check("tells the desk to sign in again", /sign in again/i.test(msg));
    check("does not blame the database policy", !/database refused/i.test(msg));
}

// ═══ SCENARIO 3: auth-guard FORBIDDEN (role not allowed) ══════════════════════
console.log("\n==== 3 — auth-guard says wrong role (FORBIDDEN)");
{
    const msg = formatFriendlyDbError(
        new Error("FORBIDDEN: Your role (Nurse) is not allowed to perform this action."),
        "Registration failed."
    );
    console.log(`  desk sees: ${msg}`);
    check("says the role is not permitted", /role/i.test(msg));
    check("does not demand a re-login as the fix", !/Please log in with an authorized account/i.test(msg));
}

// ═══ SCENARIO 4: expired JWT ══════════════════════════════════════════════════
console.log("\n==== 4 — expired JWT (PGRST301)");
{
    const msg = formatFriendlyDbError({ code: "PGRST301", message: "JWT expired", details: null, hint: null }, "Registration failed.");
    console.log(`  desk sees: ${msg}`);
    check("tells the desk to sign in again", /sign in again/i.test(msg));
}

// ═══ SCENARIO 5: regression — data errors keep their old messages ═════════════
console.log("\n==== 5 — regression: data errors are untouched");
{
    const dup = formatFriendlyDbError(
        { code: "23505", message: 'duplicate key value violates unique constraint "patients_hospital_number_key"', details: null, hint: null },
        "Registration failed."
    );
    check("duplicate hospital number message unchanged", /hospital number is already assigned/i.test(dup), dup);

    const notNull = formatFriendlyDbError(
        { code: "23502", message: 'null value in column "phone" violates not-null constraint', details: null, hint: null },
        "Registration failed."
    );
    check("missing phone message unchanged", /Phone number is required/i.test(notNull), notNull);
}

// ═══ SCENARIO 6: the REAL service against an RLS-rejecting insert ═════════════
console.log("\n==== 6 — createPatient() against a database that refuses the write");
async function scenario6() {
    MODE = "rls";
    const result = await createPatient(HMO_PAYLOAD);
    check("returned (not thrown) — the message survives the wire", result && typeof result === "object");
    check("ok=false", result.ok === false);
    check("code=42501 surfaced for the logs", result.code === "42501");
    console.log(`  desk sees: ${result.message}`);
    check("message names the database as the refuser", /database refused/i.test(result.message));
    check("message includes the technical detail", /new row violates row-level security policy/i.test(result.message));
    check("nothing was written", db.patients.length === 0);
}

// ═══ SCENARIO 7: drifted schema — registration succeeds but insurance is lost ═
console.log("\n==== 7 — drifted schema drops the HMO columns: the desk must be told");
async function scenario7() {
    MODE = "drift";
    const result = await createPatient(HMO_PAYLOAD);
    check("ok=true — the patient IS registered", result.ok === true);
    check("warnings present", Array.isArray(result.warnings) && result.warnings.length === 3,
          `got: ${JSON.stringify(result.warnings)}`);
    for (const col of ["hmo_name", "policy_number", "company_name"]) {
        check(`warning names "${col}"`, result.warnings?.some((w) => w.includes(`"${col}"`)) === true);
    }
    const stored = db.patients[db.patients.length - 1];
    check("row saved without the insurer (hmo_name absent)", stored && stored.hmo_name == null);
    check("hmo flag itself still true", stored && stored.hmo === true);
    console.log(`  desk sees on the success screen: ${(result.warnings ?? []).join(" ")}`);
}

(async () => {
    await scenario6();
    await scenario7();
    console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
})();
