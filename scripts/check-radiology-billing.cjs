// ══════════════════════════════════════════════════════════════════════════════
// Radiology orders, billing and prepaid care packages — verification harness.
//
// Runs the REAL lib/services code (radiology.service, care-packages.service,
// payment.service) against an in-memory fake Supabase, so the money rules are
// asserted against the shipped logic rather than a copy of it.
//
//   npm run check:radiology
//
// What it pins down:
//   • a scan request raises a pending "radiology" bill at the catalog price
//   • a scan under an active antenatal package raises NO bill at all, draws
//     down the allowance, and is recorded in the package_usage ledger
//   • the allowance is enforced (5th scan on a 4-scan package is billed)
//   • an expired / cancelled package does not cover anything
//   • an unknown service is refused instead of being inserted unpriced
//   • Doctor and Front Desk may file the observations; a Nurse may not
//   • a database missing the 20261001 columns still creates the order
// ══════════════════════════════════════════════════════════════════════════════
"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

// ─── In-memory "database" ─────────────────────────────────────────────────────
const TABLES = [
    "staffs", "patients", "payments", "lab_requests", "notifications", "audit_logs",
    "radiology_scan_catalog", "care_packages", "care_package_items",
    "patient_package_enrolments", "package_usage",
];
const db = {};
for (const t of TABLES) db[t] = [];

let CURRENT_USER = { id: "staff-doctor-1", email: "doctor@hospital.test" };

// Schema-drift switches, mirroring a database that has not been migrated.
let MISSING_RADIOLOGY_COLUMNS = false;   // lab_requests has no billing_status / package_enrolment_id
let MISSING_PACKAGE_TABLES = false;      // care_packages & friends do not exist

// ─── Fake Supabase builder ────────────────────────────────────────────────────
function makeClient() {
    function table(name) {
        const state = {
            op: "select", payload: null, filters: [], orderSpecs: [], limitN: null,
            selectCols: "*", single: false, maybe: false,
        };

        const b = {
            select(cols) { state.selectCols = cols || "*"; return b; },
            insert(rows) { state.op = "insert"; state.payload = rows; return b; },
            update(patch) { state.op = "update"; state.payload = patch; return b; },
            delete() { state.op = "delete"; return b; },
            eq(col, val) { state.filters.push({ type: "eq", col, val }); return b; },
            neq(col, val) { state.filters.push({ type: "neq", col, val }); return b; },
            in(col, vals) { state.filters.push({ type: "in", col, vals }); return b; },
            ilike(col, val) { state.filters.push({ type: "ilike", col, val }); return b; },
            like(col, val) { state.filters.push({ type: "like", col, val }); return b; },
            order(col, opts) { state.orderSpecs.push({ col, asc: !(opts && opts.ascending === false) }); return b; },
            limit(n) { state.limitN = n; return b; },
            single() { state.single = true; return exec(); },
            maybeSingle() { state.maybe = true; return exec(); },
            then(res, rej) { return exec().then(res, rej); },
            catch(f) { return exec().catch(f); },
        };

        function matches(row) {
            for (const f of state.filters) {
                if (f.type === "eq" && String(row[f.col] ?? "") !== String(f.val ?? "")) return false;
                if (f.type === "neq" && String(row[f.col] ?? "") === String(f.val ?? "")) return false;
                if (f.type === "in" && !(f.vals ?? []).map(String).includes(String(row[f.col]))) return false;
                if (f.type === "ilike") {
                    const pat = String(f.val).replace(/%/g, "").toLowerCase();
                    if (!String(row[f.col] ?? "").toLowerCase().includes(pat)) return false;
                }
                if (f.type === "like") {
                    // Only the trailing-% prefix form is used by the services.
                    const pat = String(f.val).replace(/%$/, "");
                    if (!String(row[f.col] ?? "").startsWith(pat)) return false;
                }
            }
            return true;
        }

        function withJoins(row, cols) {
            const out = { ...row };
            if (!cols.includes("(")) return out;
            if (name === "lab_requests" && cols.includes("patients")) {
                out.patients = db.patients.find((p) => p.id === row.visit_id) ?? null;
            }
            if (name === "care_packages" && cols.includes("care_package_items")) {
                out.care_package_items = db.care_package_items.filter((i) => i.package_id === row.id);
            }
            if (name === "patient_package_enrolments" && cols.includes("care_packages")) {
                const pkg = db.care_packages.find((p) => p.id === row.package_id) ?? null;
                out.care_packages = pkg
                    ? { ...pkg, care_package_items: db.care_package_items.filter((i) => i.package_id === pkg.id) }
                    : null;
            }
            return out;
        }

        function project(row) {
            if (state.selectCols === "*") return withJoins(row, state.selectCols);
            // A nested select ("*, patients!(...)") cannot be projected by
            // splitting on commas; PostgREST returns the whole row plus the
            // embed, which is what withJoins reproduces.
            if (state.selectCols.includes("(")) return withJoins(row, state.selectCols);
            const cols = state.selectCols.split(",").map((c) => c.trim());
            const out = {};
            for (const c of cols) out[c] = row[c];
            return withJoins(out, state.selectCols);
        }

        function exec() {
            return Promise.resolve().then(() => {
                if (MISSING_PACKAGE_TABLES && ["care_packages", "care_package_items", "patient_package_enrolments", "package_usage"].includes(name)) {
                    return { data: null, error: { code: "42P01", message: `relation "public.${name}" does not exist` } };
                }
                const t = db[name];
                if (!t) return { data: null, error: { code: "42P01", message: `table ${name} missing` } };

                if (state.op === "insert") {
                    const rows = (Array.isArray(state.payload) ? state.payload : [state.payload]).map((r) => ({
                        id: r.id ?? `${name.slice(0, 4)}-${Math.random().toString(36).slice(2, 10)}`,
                        created_at: r.created_at ?? new Date().toISOString(),
                        ...r,
                    }));

                    // PGRST204: a payload key with no matching column rejects the
                    // WHOLE insert — exactly what an unmigrated database does.
                    if (MISSING_RADIOLOGY_COLUMNS && name === "lab_requests") {
                        const unknown = Object.keys(rows[0] ?? {}).filter((k) =>
                            ["billing_status", "package_enrolment_id"].includes(k));
                        if (unknown.length) {
                            return {
                                data: null,
                                error: {
                                    code: "PGRST204",
                                    message: `Could not find the '${unknown[0]}' column of 'lab_requests' in the schema cache`,
                                },
                            };
                        }
                    }

                    t.push(...rows);
                    const out = rows.map((r) => project(r));
                    if (state.single) return { data: out[0] ?? null, error: null };
                    return { data: state.selectCols === "*" && !state.selectCols.includes("(") ? rows : out, error: null };
                }

                if (state.op === "update") {
                    let n = 0;
                    const updated = [];
                    for (const row of t) {
                        if (!matches(row)) continue;
                        Object.assign(row, state.payload);
                        n++;
                        updated.push(project(row));
                    }
                    if (state.single) {
                        if (updated.length === 1) return { data: updated[0], error: null };
                        return { data: null, error: { code: "PGRST116", message: "no rows" } };
                    }
                    if (state.maybe) return { data: updated[0] ?? null, error: null, count: n };
                    return { data: updated, error: null, count: n };
                }

                if (state.op === "delete") {
                    const keep = t.filter((row) => !matches(row));
                    const removed = t.length - keep.length;
                    db[name] = keep;
                    return { data: null, error: null, count: removed };
                }

                // select
                let rows = t.filter(matches);
                for (const spec of state.orderSpecs) {
                    rows = [...rows].sort((a, b2) => {
                        const cmp = String(a[spec.col] ?? "").localeCompare(String(b2[spec.col] ?? ""));
                        return spec.asc ? cmp : -cmp;
                    });
                }
                if (state.limitN != null) rows = rows.slice(0, state.limitN);
                const data = rows.map(project);
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
        auth: { async getUser() { return { data: { user: CURRENT_USER }, error: null }; } },
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
        if (spec === "@/utils/supabase/server") return { createClient: async () => makeClient() };
        if (spec === "@/utils/supabase/admin") return { createAdminClient: () => null };

        let resolved;
        if (spec.startsWith("@/")) {
            resolved = path.join(ROOT, spec.slice(2));
        } else if (spec.startsWith(".")) {
            resolved = path.resolve(path.dirname(absPath), spec);
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

// ─── Seed ─────────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10);
const daysFromNow = (n) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

function seed({ withPackageFor = null, expired = false, cancelled = false } = {}) {
    for (const t of TABLES) db[t] = [];

    db.staffs.push(
        { id: "staff-doctor-1", role: "Doctor", email: "doctor@hospital.test", name: "Ade Doctor" },
        { id: "staff-desk-1", role: "FrontDesk", email: "desk@hospital.test", name: "Desk One" },
        { id: "staff-radio-1", role: "Radiologist", email: "rad@hospital.test", name: "Ray Radiologist" },
        { id: "staff-nurse-1", role: "Nurse", email: "nurse@hospital.test", name: "Nina Nurse" },
    );

    db.patients.push(
        { id: "patient-1", name: "Amaka Private", phone: "08030000001", status: "awaiting-consultation", private_client: true },
        { id: "patient-2", name: "Bisi Antenatal", phone: "08030000002", status: "awaiting-consultation", private_client: true },
    );

    // The migration's seed rows.
    db.radiology_scan_catalog.push(
        { id: "scan-pelvic", code: "PELVIC", scan_name: "Pelvic Scan", price: 23000, is_active: true, sort_order: 10, aliases: "pelvic ultrasound,pelvis scan" },
        { id: "scan-tvs", code: "TVS", scan_name: "Transvaginal Scan (TVS)", price: 23000, is_active: true, sort_order: 20, aliases: "transvaginal scan,tvs,trans vaginal scan" },
    );

    db.care_packages.push({
        id: "pkg-antenatal", code: "ANTENATAL", name: "Antenatal Care Package",
        price: null, validity_days: 365, is_active: true, sort_order: 10,
    });
    db.care_package_items.push({
        id: "item-scans", package_id: "pkg-antenatal", item_kind: "radiology_scan",
        item_name: null, included_quantity: 4, price_included: null,
    });

    if (withPackageFor) {
        db.patient_package_enrolments.push({
            id: "enrol-1",
            patient_id: withPackageFor,
            package_id: "pkg-antenatal",
            enrolled_by: "staff-desk-1",
            enrolled_at: new Date().toISOString(),
            starts_on: expired ? daysFromNow(-400) : TODAY,
            expires_on: expired ? daysFromNow(-1) : daysFromNow(364),
            status: cancelled ? "cancelled" : "active",
            amount_paid: 150000,
            receipt_no: "R-001",
        });
    }
}

// ─── Fresh module graph per actor ─────────────────────────────────────────────
// `getCurrentStaff` is memoized with React `cache`, which in Node has no request
// scope — so switching the signed-in user REQUIRES a fresh module graph. The
// in-memory database is shared across graphs, which is the point: several actors
// act on the same patient record.

function loadServices(user) {
    CURRENT_USER = user ?? { id: "staff-doctor-1", email: "doctor@hospital.test" };
    const cache = new Map();
    return {
        radiology: loadModule(path.join(ROOT, "lib/services/radiology.service.ts"), cache),
        packages: loadModule(path.join(ROOT, "lib/services/care-packages.service.ts"), cache),
        payment: loadModule(path.join(ROOT, "lib/services/payment.service.ts"), cache),
        careUtils: loadModule(path.join(ROOT, "lib/utils/care-packages.ts"), cache),
    };
}

/** Reset the database AND switch actor — the start of a scenario. */
function freshContext(user, seedOpts) {
    MISSING_RADIOLOGY_COLUMNS = false;
    MISSING_PACKAGE_TABLES = false;
    seed(seedOpts);
    return loadServices(user);
}

// ─── Assertion helpers ────────────────────────────────────────────────────────
let checks = 0;
let failures = 0;
function check(name, condition, detail = "") {
    checks++;
    if (condition) console.log(`  ✓ ${name}`);
    else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

const radiologyRows = () => db.lab_requests.filter((r) => String(r.test_type ?? "").startsWith("[RADIOLOGY]"));
const billsFor = (patientId) => db.payments.filter((p) => p.patient_id === patientId);

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
    // ── 1. A scan with no package is ordered AND billed ──────────────────────
    console.log("\n1 · Requesting a scan with no care package (billing path)");
    {
        const { radiology, payment } = freshContext({ id: "staff-doctor-1", email: "d@h.test" });
        const result = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-doctor-1", testType: "Pelvic Scan",
            priority: "routine", notes: "Pelvic pain, rule out fibroid",
        });

        check("the request is accepted", result.ok === true, JSON.stringify(result));
        const row = radiologyRows()[0];
        check("stored with the [RADIOLOGY] prefix", row.test_type === "[RADIOLOGY] Pelvic Scan", row.test_type);
        check("priced at the catalog price (₦23,000)", Number(row.price) === 23000, String(row.price));
        check("marked as billed", row.billing_status === "billed", row.billing_status);

        const bills = billsFor("patient-1");
        check("exactly one bill was raised", bills.length === 1, `${bills.length} bills`);
        check("the bill is ₦23,000 in the radiology category",
            bills[0]?.amount === 23000 && bills[0]?.category === "radiology",
            JSON.stringify(bills[0] && { amount: bills[0].amount, category: bills[0].category }));
        check("the bill is pending (front desk settles it)", bills[0]?.status === "pending", bills[0]?.status);
        check("the bill is linked to its request", bills[0]?.lab_request_id === row.id);
        check("the outcome reports the bill", result.ok && result.billing.status === "billed" && result.billing.amountNaira === 23000);

        const outstanding = await payment.listPendingPayments();
        check("it shows in the outstanding queue",
            outstanding.some((p) => p.patient_id === "patient-1" && p.amount_kobo === 2300000),
            JSON.stringify(outstanding.map((p) => [p.patient_id, p.amount_kobo])));

        check("the patient is routed to radiology",
            db.patients.find((p) => p.id === "patient-1").status === "sent-to-radiology");
        check("the radiology unit is notified",
            db.notifications.some((n) => n.role === "Radiologist" && /Pelvic Scan/.test(n.message)));
        check("the order is audited",
            db.audit_logs.some((a) => a.action === "RADIOLOGY_REQUESTED"));
    }

    // ── 2. Alias / code resolution ───────────────────────────────────────────
    console.log("\n2 · Free text resolves to a priced catalog scan");
    {
        const { radiology } = freshContext();
        const r1 = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-doctor-1", testType: "tvs",
        });
        check("\"tvs\" resolves to Transvaginal Scan (TVS)",
            r1.ok && radiologyRows()[0].test_type === "[RADIOLOGY] Transvaginal Scan (TVS)",
            JSON.stringify(radiologyRows()[0]?.test_type));
        check("and is billed at ₦23,000",
            billsFor("patient-1").length === 1 && billsFor("patient-1")[0].amount === 23000);

        const r2 = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-doctor-1", testType: "Chest X-Ray",
        });
        check("an unknown service is refused", r2.ok === false);
        check("with an actionable message",
            /not a scan this unit performs/.test(r2.message ?? "") && /Pelvic Scan/.test(r2.message ?? ""),
            r2.message);
        check("and nothing was inserted for it", radiologyRows().length === 1);
        check("and nothing was billed for it", billsFor("patient-1").length === 1);
    }

    // ── 3. Antenatal package covers the scan ─────────────────────────────────
    console.log("\n3 · Antenatal patient — the scan is covered, not billed");
    {
        const { radiology, packages } = freshContext(
            { id: "staff-doctor-1", email: "d@h.test" },
            { withPackageFor: "patient-2" }
        );

        // Preview before ordering (what the order form shows).
        const preview = await radiology.getRadiologyCoverage("patient-2", "Pelvic Scan");
        check("the coverage preview says covered", preview.covered === true, JSON.stringify(preview.reason));
        check("and names the package", preview.packageName === "Antenatal Care Package", preview.packageName);
        check("with 3 scans left after this one", preview.remainingQuantity === 3, String(preview.remainingQuantity));

        const result = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-2", requestedBy: "staff-doctor-1", testType: "Pelvic Scan",
        });

        check("the request is accepted", result.ok === true, JSON.stringify(result));
        const row = radiologyRows()[0];
        check("marked as covered", row.billing_status === "covered", row.billing_status);
        check("linked to the enrolment", row.package_enrolment_id === "enrol-1", String(row.package_enrolment_id));

        check("NO bill was raised — the scan stays out of billing", billsFor("patient-2").length === 0,
            JSON.stringify(billsFor("patient-2").map((b) => [b.description, b.amount])));
        check("the payments table has no radiology row for this patient",
            db.payments.filter((p) => p.patient_id === "patient-2").length === 0);

        check("the usage ledger recorded it", db.package_usage.length === 1);
        check("at the value it would have cost", db.package_usage[0]?.value_kobo === 2300000,
            String(db.package_usage[0]?.value_kobo));
        check("linked back to the request", db.package_usage[0]?.lab_request_id === row.id);
        check("the outcome says covered", result.ok && result.billing.status === "covered",
            JSON.stringify(result.ok && result.billing));
        check("the coverage is audited",
            db.audit_logs.some((a) => a.action === "RADIOLOGY_COVERED_BY_PACKAGE"));

        const summary = await packages.getPatientPackagesSummary("patient-2");
        check("the panel reports ₦23,000 covered (visible, but not a debt)",
            summary.coveredValueNaira === 23000, String(summary.coveredValueNaira));
    }

    // ── 4. The allowance is enforced ─────────────────────────────────────────
    console.log("\n4 · A 4-scan package covers 4 scans, then bills the 5th");
    {
        const { radiology } = freshContext(
            { id: "staff-doctor-1", email: "d@h.test" },
            { withPackageFor: "patient-2" }
        );

        for (const scan of ["Pelvic Scan", "Transvaginal Scan (TVS)", "pelvic ultrasound", "TVS"]) {
            await radiology.createRadiologyRequestWithResult({
                patientId: "patient-2", requestedBy: "staff-doctor-1", testType: scan,
            });
        }
        check("four scans were ordered", radiologyRows().length === 4, String(radiologyRows().length));
        check("all four are covered", radiologyRows().every((r) => r.billing_status === "covered"));
        check("nothing was billed", billsFor("patient-2").length === 0);
        check("the ledger holds all four at ₦23,000",
            db.package_usage.length === 4 && db.package_usage.every((u) => u.value_kobo === 2300000),
            JSON.stringify(db.package_usage.map((u) => u.value_kobo)));

        const fifth = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-2", requestedBy: "staff-doctor-1", testType: "Pelvic Scan",
        });
        check("the 5th scan is billed",
            fifth.ok && fifth.billing.status === "billed", JSON.stringify(fifth.ok && fifth.billing));
        check("at ₦23,000", billsFor("patient-2").length === 1 && billsFor("patient-2")[0].amount === 23000);
        check("and marked billed on the request", radiologyRows()[4].billing_status === "billed");
        check("and draws down no further allowance", db.package_usage.length === 4);
    }

    // ── 5. Expiry, cancellation and the override ─────────────────────────────
    console.log("\n5 · A lapsed package covers nothing; the override still bills");
    {
        const expiredCtx = freshContext(
            { id: "staff-doctor-1", email: "d@h.test" },
            { withPackageFor: "patient-2", expired: true }
        );
        const expiredPreview = await expiredCtx.radiology.getRadiologyCoverage("patient-2", "Pelvic Scan");
        check("an expired package is reported as expired",
            expiredPreview.covered === false && expiredPreview.reason === "expired", expiredPreview.reason);
        const expiredResult = await expiredCtx.radiology.createRadiologyRequestWithResult({
            patientId: "patient-2", requestedBy: "staff-doctor-1", testType: "Pelvic Scan",
        });
        check("so the scan is billed", expiredResult.ok && expiredResult.billing.status === "billed");
        check("with a pending ₦23,000 bill",
            billsFor("patient-2").length === 1 && billsFor("patient-2")[0].status === "pending");

        const cancelledCtx = freshContext(
            { id: "staff-doctor-1", email: "d@h.test" },
            { withPackageFor: "patient-2", cancelled: true }
        );
        const cancelled = await cancelledCtx.radiology.getRadiologyCoverage("patient-2", "Pelvic Scan");
        check("a cancelled package does not cover", cancelled.covered === false);

        const overrideCtx = freshContext(
            { id: "staff-doctor-1", email: "d@h.test" },
            { withPackageFor: "patient-2" }
        );
        const override = await overrideCtx.radiology.createRadiologyRequestWithResult({
            patientId: "patient-2", requestedBy: "staff-doctor-1", testType: "Pelvic Scan", billAnyway: true,
        });
        check("'bill anyway' bills a covered patient",
            override.ok && override.billing.status === "billed" && billsFor("patient-2").length === 1);
        check("and draws down no allowance", db.package_usage.length === 0);
    }

    // ── 6. Who may order and who may report ──────────────────────────────────
    console.log("\n6 · Ordering and reporting roles");
    {
        const desk = freshContext({ id: "staff-desk-1", email: "desk@h.test" });
        const deskOrder = await desk.radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-desk-1", testType: "Pelvic Scan",
        });
        check("the front desk can request a scan", deskOrder.ok === true, JSON.stringify(deskOrder));
        check("and it is billed", billsFor("patient-1").length === 1);

        const radioCtx = freshContext({ id: "staff-radio-1", email: "rad@h.test" });
        const radioOrder = await radioCtx.radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-radio-1", testType: "Transvaginal Scan (TVS)",
        });
        check("the radiologist can request a scan", radioOrder.ok === true, JSON.stringify(radioOrder));
        check("and their order is billed too", billsFor("patient-1").length === 1);

        const nurse = freshContext({ id: "staff-nurse-1", email: "nurse@h.test" });
        const nurseOrder = await nurse.radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-nurse-1", testType: "Pelvic Scan",
        });
        check("a nurse cannot request a scan", nurseOrder.ok === false && /FORBIDDEN/.test(nurseOrder.message ?? ""),
            nurseOrder.message);

        // Filing the observations. Three pending requests to file against.
        const reportCtx = freshContext({ id: "staff-desk-1", email: "desk@h.test" });
        for (const scan of ["Pelvic Scan", "Transvaginal Scan (TVS)", "Pelvic Scan"]) {
            await reportCtx.radiology.createRadiologyRequestWithResult({
                patientId: "patient-1", requestedBy: "staff-desk-1", testType: scan,
            });
        }
        const rows = radiologyRows();
        check("three requests are waiting to be reported", rows.length === 3, String(rows.length));
        const req = rows[0];
        const filed = await reportCtx.radiology.submitRadiologyReport(req.id, {
            status: "completed",
            result: "Uterus normal in size. IMPRESSION: Normal pelvic ultrasound.",
            completed_by: "staff-desk-1",
            completed_at: new Date().toISOString(),
        });
        check("the FRONT DESK can file the observations", filed.status === "completed");
        check("the text is stored verbatim",
            /Normal pelvic ultrasound/.test(db.lab_requests.find((r) => r.id === req.id).result));
        check("and the patient returns to the doctor queue",
            db.patients.find((p) => p.id === "patient-1").status === "awaiting-consultation");

        const doctorCtx = loadServices({ id: "staff-doctor-1", email: "d@h.test" });
        const req2 = rows[1];
        const filedByDoctor = await doctorCtx.radiology.submitRadiologyReport(req2.id, {
            status: "completed",
            result: "Single live intrauterine pregnancy of 8 weeks by CRL.",
            completed_by: "staff-doctor-1",
            completed_at: new Date().toISOString(),
        });
        check("a DOCTOR can file the observations", filedByDoctor.status === "completed");

        const nurseReport = loadServices({ id: "staff-nurse-1", email: "nurse@h.test" });
        let refused = null;
        try {
            await nurseReport.radiology.submitRadiologyReport(rows[2].id, {
                status: "completed", result: "x", completed_by: "staff-nurse-1",
                completed_at: new Date().toISOString(),
            });
        } catch (err) { refused = err.message; }
        check("a nurse cannot file a radiology report", /FORBIDDEN/.test(refused ?? ""), String(refused));

        // Someone else's report cannot be silently rewritten.
        const otherDoctor = loadServices({ id: "staff-radio-1", email: "rad@h.test" });
        let locked = null;
        try {
            await otherDoctor.radiology.submitRadiologyReport(req.id, {
                status: "completed", result: "Rewritten by somebody else.",
                completed_by: "staff-radio-1", completed_at: new Date().toISOString(),
            });
        } catch (err) { locked = err.message; }
        check("another clinician cannot overwrite a filed report", /LOCKED:not_author/.test(locked ?? ""), String(locked));
    }

    // ── 7. Enrolment service ─────────────────────────────────────────────────
    console.log("\n7 · Selling a package at the desk");
    {
        const { packages } = freshContext({ id: "staff-desk-1", email: "desk@h.test" });

        const list = await packages.listCarePackages();
        check("the antenatal package is offered", list.some((p) => p.code === "ANTENATAL"));
        check("with its 4-scan entitlement attached",
            (list[0]?.items ?? []).some((i) => i.item_kind === "radiology_scan" && i.included_quantity === 4),
            JSON.stringify((list[0]?.items ?? []).map((i) => i.included_quantity)));

        const enrolment = await packages.enrolPatientInPackage({
            patientId: "patient-1", packageId: "pkg-antenatal", amountPaid: 150000, receiptNo: "R-77",
        });
        check("the patient can be enrolled", enrolment.ok === true, JSON.stringify(enrolment));
        check("the validity window comes from the package (365 days)",
            enrolment.ok && enrolment.enrolment.expires_on === daysFromNow(365),
            String(enrolment.ok && enrolment.enrolment.expires_on));

        const twice = await packages.enrolPatientInPackage({ patientId: "patient-1", packageId: "pkg-antenatal" });
        check("a second active enrolment is refused", twice.ok === false && twice.code === "ALREADY_ENROLLED",
            JSON.stringify(twice));

        const doctorCtx = loadServices({ id: "staff-doctor-1", email: "d@h.test" });
        const byDoctor = await doctorCtx.packages.enrolPatientInPackage({
            patientId: "patient-2", packageId: "pkg-antenatal",
        });
        check("only the front desk can sell a package", byDoctor.ok === false && /FORBIDDEN/.test(byDoctor.message ?? ""),
            byDoctor.message);

        const closed = await packages.updateEnrolment({ id: "enrol-1-placeholder", status: "completed" });
        check("updating a missing enrolment reports it, it does not throw", closed.ok === false);
    }

    // ── 8. A database without the migration still works ──────────────────────
    console.log("\n8 · Schema drift — the order survives a missing column");
    {
        const { radiology } = freshContext({ id: "staff-doctor-1", email: "d@h.test" });
        MISSING_RADIOLOGY_COLUMNS = true;
        const result = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-1", requestedBy: "staff-doctor-1", testType: "Pelvic Scan",
        });
        check("the request is still created", result.ok === true, JSON.stringify(result));
        check("and still billed", billsFor("patient-1").length === 1 && billsFor("patient-1")[0].amount === 23000);
    }
    {
        const { radiology } = freshContext({ id: "staff-doctor-1", email: "d@h.test" });
        MISSING_PACKAGE_TABLES = true;
        const result = await radiology.createRadiologyRequestWithResult({
            patientId: "patient-2", requestedBy: "staff-doctor-1", testType: "Pelvic Scan",
        });
        check("with no package tables, the scan is billed (never silently free)",
            result.ok === true && result.billing.status === "billed", JSON.stringify(result.ok && result.billing));
        check("and a bill exists", billsFor("patient-2").length === 1);
    }

    // ── 9. The scan catalog itself ───────────────────────────────────────────
    console.log("\n9 · Scan catalog");
    {
        const { radiology, careUtils } = freshContext();
        const scans = await radiology.listRadiologyScans();
        check("exactly the two services the unit performs", scans.length === 2,
            JSON.stringify(scans.map((s) => s.name)));
        check("both priced at ₦23,000", scans.every((s) => s.price === 23000),
            JSON.stringify(scans.map((s) => s.price)));

        check("allowance wording for a 3-scan package",
            careUtils.describeAllowance(3, 1, "scan") === "2 of 3 scans left",
            careUtils.describeAllowance(3, 1, "scan"));
        check("unlimited allowances are described as unlimited",
            /Unlimited/.test(careUtils.describeAllowance(null, 4, "scan")));
        check("a used-up allowance says so",
            careUtils.describeAllowance(3, 3, "scan") === "All 3 scans used");
    }

    console.log(`\n${checks - failures}/${checks} checks passed\n`);
    if (failures) {
        console.error(`${failures} radiology/billing check(s) failed.`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("\nHarness crashed:", err);
    process.exit(1);
});
