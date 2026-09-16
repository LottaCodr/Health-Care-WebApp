// Repro harness (client side): what happens at the front desk when the payment
// type is HMO?
//
// It runs the REAL modules — `lib/utils/registration-form.ts` (the step rules
// and the payload mapping the form submits), `lib/validation.ts`
// (PatientFormValidation), `constants/index.ts` (PatientFormDefaultValues) and
// the installed react-hook-form + @hookform/resolvers. RegistrationSuite.tsx
// imports the very same functions, so the answers below are about the shipped
// code, not a copy of it.
//
// Scenarios:
//   1. HMO picked while the HMO Name / Policy Number inputs were NOT mounted
//      (what happened when `paymentType` was read with `form.getValues()`,
//      which subscribes to nothing) — does the Insurance step pass, and what
//      payload would have been submitted?
//   2. HMO picked, inputs mounted, HMO name typed, policy number blank, using
//      the OLD field list (["hmoName"]) — the schema's policy-number rule
//      fires but the step never reports it.
//   3. The same with the shipped field list from getInsuranceFields()
//      (["hmoName", "policyNumber"]).
//   4. HMO complete → passes, and the payload carries the insurer.
//   5. Private (self-pay) still needs nothing extra.
//
// Usage: node scripts/repro-registration-hmo.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");

// ─── Tiny TS-aware CommonJS loader (same approach as repro-registration.cjs) ─
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

// ─── The real modules under test ──────────────────────────────────────────────
const { PatientFormValidation } = loadModule(path.join(ROOT, "lib/validation.ts"));
const { PatientFormDefaultValues } = loadModule(path.join(ROOT, "constants/index.ts"));
const {
    calcAge,
    getPaymentType,
    getInsuranceFields,
    getStepFields,
    buildPatientPayload,
    INSURANCE_STEP,
} = loadModule(path.join(ROOT, "lib/utils/registration-form.ts"));

const { createFormControl } = require("react-hook-form");
const { zodResolver } = require("@hookform/resolvers/zod");

// The field list the Insurance step used before this fix — kept only so the
// harness can show what changed.
const OLD_INSURANCE_FIELDS = (values) => {
    const type = getPaymentType(values);
    if (type === "hmo") return ["hmoName"];
    if (type === "company") return ["companyName"];
    return [];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeForm() {
    const created = createFormControl({
        resolver: zodResolver(PatientFormValidation),
        defaultValues: PatientFormDefaultValues,
        mode: "onTouched",
    });
    // `useForm` marks the form mounted in a layout effect and exposes
    // `formState` through a proxy. A bare control is not mounted, so
    // getValues() would still hand back the defaults — flip the same flag the
    // real hook does and read the live state off the internal control.
    const internal = created.control;
    internal._state.mount = true;

    return {
        setValue: created.setValue,
        register: created.register,
        trigger: created.trigger,
        getValues: created.getValues,
        errorFor: (name) => internal._formState.errors[name] ?? null,
        errorNames: (names) => names.filter((n) => internal._formState.errors[n]),
    };
}

/** Steps 1–3 already filled, so only the Insurance step can fail. */
function fillBasics(form) {
    form.setValue("name", "Grace Adeyemi");
    form.setValue("phone", "+2348035551212");
    form.setValue("birthDate", new Date("1991-04-12"));
    form.setValue("gender", "Female");
}

/** What PaymentTypeSelector.select(type) writes into the form. */
function pickPaymentType(form, type) {
    form.setValue("hmo", type === "hmo");
    form.setValue("company", type === "company");
    form.setValue("privateClient", type === "private");
    if (type !== "hmo") form.setValue("hmoName", "");
    if (type !== "company") form.setValue("companyName", "");
}

/** The payload the form submits, via the real buildPatientPayload(). */
function payloadFor(form, { isChild = false } = {}) {
    return buildPatientPayload({
        values: form.getValues(),
        isChild,
        childClass: "",
        parentInfo: "",
        referralInfo: "",
    });
}

async function main() {
    console.log("react-hook-form:", require("react-hook-form/package.json").version);
    console.log("zod:", require("zod/package.json").version);
    console.log("insurance step index:", INSURANCE_STEP);
    console.log("age check (1991-04-12):", JSON.stringify(calcAge("1991-04-12")));
    console.log("age check (2019-06-01):", JSON.stringify(calcAge("2019-06-01")));

    // ── Scenario 1 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 1 — HMO picked while the HMO inputs were not mounted");
    console.log("     (`paymentType` came from form.getValues(), which subscribes to nothing,");
    console.log("      so the conditional inputs never rendered and never registered)");
    {
        const form = makeForm();
        fillBasics(form);
        pickPaymentType(form, "hmo");
        // NB: deliberately no form.register("hmoName") / ("policyNumber") —
        // those <input>s were never mounted.

        const fields = OLD_INSURANCE_FIELDS(form.getValues());
        const ok = await form.trigger(fields, { shouldFocus: true });
        const errs = form.errorNames(["hmoName", "policyNumber", "companyName", "name", "phone"]);
        console.log(`  step-4 trigger(${JSON.stringify(fields)}) → ${ok ? "PASSED (form submits)" : "BLOCKED"}`);
        console.log(`  schema errors present: ${JSON.stringify(errs)}`);
        console.log(`  payment type seen by the form: ${JSON.stringify(getPaymentType(form.getValues()))}`);
        if (ok) {
            const p = payloadFor(form);
            console.log("  payload that would reach createPatient:");
            console.log(`    hmo=${p.hmo} hmo_name=${JSON.stringify(p.hmo_name)} policy_number=${JSON.stringify(p.policy_number)} private_client=${p.private_client}`);
            console.log("    → an HMO patient with no insurer and no policy number on the record");
        } else {
            console.log("  → the desk is told 'fill all required fields' with no visible field to fill");
        }
    }

    // ── Scenario 2 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 2 — HMO picked, inputs mounted, HMO name typed, policy number blank");
    console.log("     (OLD field list: trigger only `hmoName`)");
    {
        const form = makeForm();
        fillBasics(form);
        pickPaymentType(form, "hmo");
        form.setValue("hmoName", "Hygeia HMO");
        form.setValue("policyNumber", "");
        form.register("hmoName");
        form.register("policyNumber");

        const fields = OLD_INSURANCE_FIELDS(form.getValues());
        const ok = await form.trigger(fields, { shouldFocus: true });
        const hmoErr = form.errorFor("hmoName");
        const polErr = form.errorFor("policyNumber");
        console.log(`  step-4 trigger(${JSON.stringify(fields)}) → ${ok ? "PASSED (form submits)" : "BLOCKED"}`);
        console.log(`  hmoName error: ${hmoErr ? hmoErr.message : "none"}`);
        console.log(`  policyNumber error: ${polErr ? polErr.message : "none"}`);
        console.log(`  → the policy-number rule fired but the step ${ok ? "let the form through anyway" : "stopped"}`);
    }

    // ── Scenario 3 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 3 — same, with the shipped field list from getInsuranceFields()");
    {
        const form = makeForm();
        fillBasics(form);
        pickPaymentType(form, "hmo");
        form.setValue("hmoName", "Hygeia HMO");
        form.setValue("policyNumber", "");
        form.register("hmoName");
        form.register("policyNumber");

        const fields = getInsuranceFields(form.getValues());
        const viaStep = getStepFields(INSURANCE_STEP, form.getValues());
        const ok = await form.trigger(fields, { shouldFocus: true });
        const polErr = form.errorFor("policyNumber");
        console.log(`  getInsuranceFields → ${JSON.stringify(fields)} (getStepFields agrees: ${JSON.stringify(viaStep)})`);
        console.log(`  step-4 trigger → ${ok ? "PASSED" : "BLOCKED — the desk is shown which field is missing"}`);
        console.log(`  policyNumber error: ${polErr ? polErr.message : "none"}`);
    }

    // ── Scenario 4 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 4 — HMO complete (provider + policy number): must pass");
    {
        const form = makeForm();
        fillBasics(form);
        pickPaymentType(form, "hmo");
        form.setValue("hmoName", "Hygeia HMO");
        form.setValue("policyNumber", "HYG-88231");
        form.register("hmoName");
        form.register("policyNumber");

        const fields = getInsuranceFields(form.getValues());
        const ok = await form.trigger(fields, { shouldFocus: true });
        const p = payloadFor(form);
        console.log(`  step-4 trigger(${JSON.stringify(fields)}) → ${ok ? "PASSED" : "BLOCKED"}`);
        console.log(`    hmo=${p.hmo} hmo_name=${JSON.stringify(p.hmo_name)} policy_number=${JSON.stringify(p.policy_number)} company=${p.company} private_client=${p.private_client}`);
        console.log(`    payload keys (${Object.keys(p).length}): ${Object.keys(p).join(", ")}`);
    }

    // ── Scenario 5 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 5 — Private (self-pay) still needs nothing extra");
    {
        const form = makeForm();
        fillBasics(form);
        pickPaymentType(form, "private");

        const fields = getInsuranceFields(form.getValues());
        const ok = await form.trigger(fields, { shouldFocus: true });
        const p = payloadFor(form);
        console.log(`  step-4 trigger(${JSON.stringify(fields)}) → ${ok ? "PASSED" : "BLOCKED"}`);
        console.log(`    hmo=${p.hmo} company=${p.company} private_client=${p.private_client} hmo_name=${JSON.stringify(p.hmo_name)}`);
    }

    // ── Scenario 6 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 6 — switching payment type clears the stale insurer name");
    {
        const form = makeForm();
        fillBasics(form);
        pickPaymentType(form, "hmo");
        form.setValue("hmoName", "Hygeia HMO");
        form.setValue("policyNumber", "HYG-88231");
        // Desk changes its mind → company cover:
        pickPaymentType(form, "company");
        form.setValue("companyName", "Dangote Industries");
        const p = payloadFor(form);
        console.log(`    hmo=${p.hmo} hmo_name=${JSON.stringify(p.hmo_name)} company=${p.company} company_name=${JSON.stringify(p.company_name)} private_client=${p.private_client}`);
    }

    // ── Scenario 7 ───────────────────────────────────────────────────────────
    console.log("\n==== SCENARIO 7 — paediatric keys are only sent when they hold a value");
    {
        const form = makeForm();
        fillBasics(form);
        form.setValue("birthDate", new Date("2019-06-01"));
        pickPaymentType(form, "hmo");
        form.setValue("hmoName", "Hygeia HMO");
        form.setValue("policyNumber", "HYG-88231");

        const child = calcAge(form.getValues().birthDate);
        const blank = buildPatientPayload({ values: form.getValues(), isChild: child.isChild, childClass: "", parentInfo: "  ", referralInfo: "" });
        const filled = buildPatientPayload({ values: form.getValues(), isChild: child.isChild, childClass: "Primary 3", parentInfo: "Mr & Mrs Adeyemi", referralInfo: "School clinic" });
        console.log(`  isChild=${child.isChild} (${child.display})`);
        console.log(`  blank paediatric inputs  → keys: ${Object.keys(blank).filter((k) => ["child_class", "parent_info", "referral_info"].includes(k)).join(", ") || "(none sent)"}`);
        console.log(`  filled paediatric inputs → child_class=${JSON.stringify(filled.child_class)} parent_info=${JSON.stringify(filled.parent_info)} referral_info=${JSON.stringify(filled.referral_info)}`);
        console.log(`  user_id present? ${"user_id" in filled ? "YES (would fail with PGRST204)" : "no"}`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
