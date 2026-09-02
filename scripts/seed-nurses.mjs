#!/usr/bin/env node
/**
 * Seed nurse accounts: one Supabase Auth user + one public.staffs profile row per nurse.
 *
 * Both halves are mandatory. proxy.ts / lib/services/auth-guard.ts resolve a signed-in
 * auth user to a role by looking up `staffs.id = auth.uid()` — an auth user with no staff
 * row is rejected at login, and a staff row with no auth user can never sign in. This
 * script creates the pair and links them by ID, exactly like the app's own
 * lib/services/staff.service.ts#createStaff() does (Admin-only server action), except it
 * runs offline with the service-role key so RLS/"signup disabled" do not get in the way.
 *
 * Zero dependencies — uses the global fetch in Node 18+. No `npm install` needed.
 *
 *   node scripts/seed-nurses.mjs                # create the two nurses below
 *   node scripts/seed-nurses.mjs --dry-run      # show the plan, write nothing
 *   node scripts/seed-nurses.mjs --from x.json  # read staff from a JSON array instead
 *
 * Credentials are read from the environment, falling back to ./.env.local (and
 * ./.env) so you can reuse the keys you already put there for the app:
 *
 *   SUPABASE_URL                   (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY      (or SUPABASE_SERVICE_KEY / SUPABASE_SECRET_KEY)
 *
 * The service-role key is required: the anon key cannot mint auth users, and the
 * `staffs insert admin` RLS policy refuses profile rows written by anyone but an admin.
 * It is a server-only secret — do not paste it into client code or commit it.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ME — the nurses to create. Anything except name/email is optional; extra
// keys (license_number, registration_number, facility_id, …) are forwarded to the
// staffs row when your deployment has those columns.
//
// `password` is deliberately omitted: a strong one-off is generated per nurse and
// printed at the end so nobody has to remember a shared default. Set it here (or
// export NURSE_TEMP_PASSWORD) when you want a known password instead.
// ─────────────────────────────────────────────────────────────────────────────
const NURSES = [
    {
        name: "Amara Okafor",
        email: "a.okafor@nilevalley.example",
        phone_number: "+234 803 000 1122",
        department: "Nursing — Medical/Surgical Ward",
        status: "Active",
        date_joined: "2026-09-01",
    },
    {
        name: "Halima Yusuf",
        email: "h.yusuf@nilevalley.example",
        phone_number: "+234 805 000 3344",
        department: "Nursing — Paediatric Ward",
        status: "Active",
        date_joined: "2026-09-01",
    },
];

// Canonical role value the app writes for nurses (UserRole.Nurse in types/models.ts).
// lib/roles.ts#normalizeUserRole also accepts "nurse" / "Nursing" etc., but writing the
// canonical casing keeps RLS role checks and the admin staff table consistent.
const NURSE_ROLE = "Nurse";

// Columns that exist on newer deployments only. Dropped on retry if PostgREST
// reports them as unknown (PGRST204) — see the createStaff() comment about camelCase.
const OPTIONAL_COLUMNS = [
    "phone_number",
    "department",
    "status",
    "date_joined",
    "license_number",
    "registration_number",
    "facility_id",
];

// ─────────────────────────────────────────────────────────────────────────────
// Plumbing below this line.
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const fromIdx = args.indexOf("--from");
const FORCE_PASSWORD_RESET = args.includes("--reset-existing-passwords");

loadLocalEnvFiles();

const URL_ = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
const SERVICE_KEY = env(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SECRET_KEY"
);

const forcedPassword = process.env.NURSE_TEMP_PASSWORD || "";

main().catch((err) => {
    console.error(`\n✖ ${err.message}\n`);
    process.exit(1);
});

async function main() {
    // Resolved here rather than at module scope so a bad --from path or malformed
    // JSON is reported by the friendly handler above instead of a raw stack trace.
    const staffs = fromIdx !== -1 ? readStaffFile(args[fromIdx + 1]) : NURSES;

    preflight(staffs);

    const results = [];
    for (const nurse of staffs) {
        validate(nurse);
        results.push(await seedOne(nurse));
    }

    const blocked = printSummary(results);
    if (blocked) process.exitCode = 2; // planned or written, but needs a human decision
}

function preflight(staffs) {
    if (!URL_ || !SERVICE_KEY) {
        const got = [
            URL_ ? "✔ SUPABASE_URL" : "✖ SUPABASE_URL",
            SERVICE_KEY ? "✔ service-role key" : "✖ SUPABASE_SERVICE_ROLE_KEY",
        ].join("   ");
        throw new Error(
            [
                `Missing Supabase credentials.  [${got}]`,
                "",
                "  Point the script at your project by exporting them, or add them to ./.env.local:",
                "",
                "    SUPABASE_URL=https://<project-ref>.supabase.co",
                "    SUPABASE_SERVICE_ROLE_KEY=<service-role key>",
                "",
                "  (Project Settings → API. The anon key will not work: it cannot create auth",
                "  users and Row-Level Security blocks staffs inserts.) Never commit the key —",
                "  pass it in the environment, e.g. SUPABASE_SERVICE_ROLE_KEY=... npm run seed:nurses",
            ].join("\n")
        );
    }

    if (!/^https?:\/\//.test(URL_)) {
        throw new Error(`SUPABASE_URL does not look like a URL: "${URL_}"`);
    }
    if (!staffs.length) throw new Error("No staff to seed — the list is empty.");
    if (looksLikeAnonKey(SERVICE_KEY)) {
        throw new Error(
            "That key looks like the public anon key. This script needs the service-role key."
        );
    }

    if (DRY_RUN) console.log("· dry run — nothing will be written\n");
    console.log(`· project ${URL_.replace(/\/+$/, "")}`);
    console.log(`· seeding ${staffs.length} staff member(s)\n`);
}

async function seedOne(nurse) {
    const password = nurse.password || forcedPassword || generatePassword();
    const label = `${nurse.name} <${nurse.email}>`;
    console.log(`─ ${label}`);

    // 1. Auth user ────────────────────────────────────────────────────────────
    let user = null;
    let authAction = "created";
    let passwordPrintable = true; // false => we never touched an existing password

    const existing = await findUserByEmail(nurse.email);
    if (existing) {
        user = existing;
        authAction = FORCE_PASSWORD_RESET ? "existing (password reset)" : "existing (left as-is)";
        passwordPrintable = FORCE_PASSWORD_RESET;
        console.log(`  auth     · account already exists (${user.id})`);
        if (FORCE_PASSWORD_RESET) {
            if (DRY_RUN) {
                console.log(`  auth     · would reset its password`);
            } else {
                await api(`/auth/v1/admin/users/${user.id}`, {
                    method: "PUT",
                    body: { password, email_confirm: true },
                });
                console.log(`  auth     · password reset`);
            }
        } else {
            console.log(`  auth     · password NOT changed (pass --reset-existing-passwords to force it)`);
        }
    } else if (DRY_RUN) {
        user = { id: "(new auth user id)" };
        console.log(`  auth     · would create a confirmed user`);
    } else {
        user = await api("/auth/v1/admin/users", {
            method: "POST",
            body: {
                email: nurse.email,
                password,
                email_confirm: true, // no confirm-link hop; they can log in immediately
                app_metadata: { provider: "email", providers: ["email"] },
                user_metadata: { name: nurse.name, role: NURSE_ROLE },
            },
        });
        console.log(`  auth     · created ${user.id}`);
    }

    if (!user?.id) throw new Error(`No auth user id for ${label} — aborting before the DB write.`);

    // 2. staffs row, keyed by the auth user id ────────────────────────────────
    const profile = {
        id: user.id,
        name: nurse.name,
        email: nurse.email,
        role: NURSE_ROLE,
        ...optionalFieldsFrom(nurse),
        // Same default as createStaff(): a NULL status hides staff from the
        // "active" filters the ward board and admin list use.
        status: nurse.status || "Active",
    };

    const currentRow = await getStaffRow(user.id);
    let dbAction;

    if (currentRow) {
        const rowRole = normalizeUserRole(currentRow.role);
        if (rowRole && rowRole !== "Nurse") {
            // Never fight the staffs_protect_role trigger or another role's row.
            console.log(
                `  staffs   · ⚠ row ${user.id} already exists with role "${currentRow.role}" — NOT touched`
            );
            return {
                nurse,
                userId: user.id,
                authAction,
                dbAction: `skipped (existing role "${currentRow.role}")`,
                password,
                passwordPrintable,
                created: false,
                warning: `A staffs row with this id has role "${currentRow.role}". Change it to "${NURSE_ROLE}" from Admin → Staff while signed in as an admin, or the nurse lands on the wrong dashboard.`,
            };
        }

        // Role is intentionally excluded: the staffs_protect_role trigger raises
        // "Only administrators may change staff roles" when auth.uid() is NULL, as it
        // is for every service-role request, so writing a role here would fail.
        const updates = { ...profile };
        delete updates.id;
        delete updates.role;
        delete updates.email; // keep the login email authoritative from step 1

        if (DRY_RUN) {
            dbAction = "would update profile fields";
            console.log(`  staffs   · row exists — would refresh ${Object.keys(updates).join(", ")}`);
        } else {
            await patchStaffRow(user.id, updates);
            dbAction = "profile refreshed (already linked)";
            console.log(`  staffs   · row exists — profile refreshed, id already linked`);
        }
    } else {
        const orphanByEmail = await getStaffRowByEmail(nurse.email);
        if (orphanByEmail) {
            console.log(
                `  staffs   · ⚠ a row with this email exists under a different id (${orphanByEmail.id})`
            );
        }

        if (DRY_RUN) {
            dbAction = "would insert";
            console.log(`  staffs   · would insert (role "${NURSE_ROLE}", status "${profile.status ?? "Active"}")`);
        } else {
            await insertStaffRow(profile);
            dbAction = "inserted";
            console.log(`  staffs   · inserted, linked to auth id`);
        }
    }

    // 3. Read back and prove what login will resolve to ────────────────────────
    let verify = null;
    if (!DRY_RUN) {
        verify = await getStaffRow(user.id);
        if (!verify) throw new Error(`staffs row for ${label} vanished right after the write.`);

        const roleMapped = normalizeUserRole(verify.role);
        if (roleMapped !== "Nurse") {
            return {
                nurse,
                userId: user.id,
                authAction,
                dbAction: `${dbAction}, but role did not normalize to Nurse`,
                password,
                passwordPrintable,
                created: true,
                warning: `staffs.role reads back as "${verify.role}", which normalizeUserRole() maps to "${roleMapped || "(nothing)"}". The proxy would send this nurse to the wrong dashboard — write exactly "${NURSE_ROLE}".`,
            };
        }
        console.log(`  verify   · role "${verify.role}" → Nurse ✔  (nurse workspace will open)`);
    }

    return {
        nurse,
        userId: user.id,
        authAction,
        dbAction: verify ? "inserted/updated, role verified" : dbAction,
        password,
        passwordPrintable,
        created: !existing,
    };
}

// ── PostgREST / GoTrue helpers ───────────────────────────────────────────────

async function insertStaffRow(payload) {
    let attempt = { ...payload };

    for (let guard = 0; guard < OPTIONAL_COLUMNS.length + 1; guard++) {
        const res = await rawApi("/rest/v1/staffs", {
            method: "POST",
            body: attempt,
            headers: { Prefer: "return=representation" },
        });

        if (res.status >= 200 && res.status < 300) return res.json?.[0] ?? attempt;

        if (!isUnknownColumnError(res)) {
            throw new Error(`staffs insert failed (${res.status}): ${res.text || res.error?.message || "no detail"}`);
        }

        // This deployment never gained one of the later columns (license_number,
        // facility_id, …) — drop exactly what it complained about and retry once.
        // No upsert preference here on purpose: if a row already holds this id we
        // want a loud primary-key error, not a silent overwrite of someone else.
        const unknown = namedColumns(res);
        const shrunk = omit(attempt, unknown);
        if (Object.keys(shrunk).length === Object.keys(attempt).length) {
            throw new Error(`staffs insert failed (${res.status}): ${res.text}`);
        }
        console.log(`  staffs   · ${unknown.join(", ")} absent in this deployment — retrying without`);
        attempt = shrunk;
    }

    throw new Error("staffs insert failed: too many unknown columns to reconcile.");
}

async function patchStaffRow(id, updates) {
    let attempt = { ...updates };
    for (let guard = 0; guard < OPTIONAL_COLUMNS.length + 1; guard++) {
        const res = await rawApi(`/rest/v1/staffs?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: attempt,
            headers: { Prefer: "return=representation" },
        });
        if (res.status >= 200 && res.status < 300) return res.json?.[0] ?? attempt;
        if (!isUnknownColumnError(res)) {
            throw new Error(`staffs update failed (${res.status}): ${res.text || res.error?.message || "no detail"}`);
        }
        attempt = omit(attempt, namedColumns(res));
    }
    throw new Error("staffs update failed: too many unknown columns to reconcile.");
}

async function getStaffRow(id) {
    const res = await rawApi(
        `/rest/v1/staffs?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
        { method: "GET" }
    );
    if (res.status === 406 || res.status === 404) return null;
    if (res.status >= 400 && res.status !== 406) {
        throw new Error(`Could not read staffs (is the table named "staffs"?): ${res.text}`);
    }
    return res.json?.[0] ?? null;
}

async function getStaffRowByEmail(email) {
    const res = await rawApi(
        `/rest/v1/staffs?select=*&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
        { method: "GET" }
    );
    if (res.status >= 400) return null;
    return res.json?.[0] ?? null;
}

/**
 * GoTrue's admin list endpoint has no reliable email filter, so page through and
 * match locally. Staff tables are small; bail out if the project turns out huge.
 */
async function findUserByEmail(email) {
    // Read-only, so it also runs under --dry-run and makes the plan accurate.
    const needle = email.toLowerCase();
    for (let page = 1; page <= 20; page++) {
        const res = await rawApi(`/auth/v1/admin/users?page=${page}&per_page=1000`, { method: "GET" });
        if (res.status >= 400) return null; // e.g. admin API disabled or key lacks rights
        const users = res.json?.users ?? [];
        const hit = users.find((u) => String(u.email ?? "").toLowerCase() === needle);
        if (hit) return hit;
        if (users.length < 1000) return null;
    }
    return null;
}

async function api(path, { method = "GET", body } = {}) {
    const res = await rawApi(path, { method, body });
    if (res.status >= 400) {
        throw new Error(`${method} ${path} → ${res.status}: ${res.text || res.error?.message || "no detail"}`);
    }
    return res.json;
}

async function rawApi(path, { method = "GET", body, headers = {} } = {}) {
    const url = `${URL_.replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, {
        method,
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
    }).catch((err) => {
        throw new Error(`${method} ${path} failed: ${err.message} (network, wrong project URL, or blocked by a proxy)`);
    });

    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        /* PostgREST returns XML/plain bodies for some errors — text is kept */
    }
    return { status: res.status, json, text, error: json };
}

// ── Small utilities ──────────────────────────────────────────────────────────

/** Mirrors lib/roles.ts#normalizeUserRole — keep the two in sync. */
function normalizeUserRole(role) {
    if (typeof role !== "string") return "";
    const compact = role.trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (!compact) return "";
    if (compact.includes("front") || compact.includes("reception")) return "FrontDesk";
    if (compact.includes("doctor") || compact.includes("physician") || compact.includes("consultant")) return "Doctor";
    if (compact.includes("nurse") || compact.includes("nursing")) return "Nurse";
    if (compact.startsWith("lab") || compact.includes("laboratory")) return "LabTechnician";
    if (compact.includes("pharm")) return "Pharmacist";
    if (compact.includes("radio") || compact.includes("imaging")) return "Radiologist";
    if (compact.includes("admin")) return "Admin";
    return "";
}

function validate(nurse) {
    if (!nurse?.name?.trim()) throw new Error("Every entry needs a name.");
    const email = String(nurse.email ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error(`"${nurse.name}" has an invalid email: "${nurse.email}".`);
    }
    nurse.email = email.toLowerCase();
    nurse.name = nurse.name.trim();
    const pw = nurse.password || forcedPassword;
    if (pw && pw.length < 6) {
        throw new Error(`Password for ${nurse.name} is shorter than 6 characters (Supabase minimum).`);
    }
}

function optionalFieldsFrom(nurse) {
    const out = {};
    for (const key of [...OPTIONAL_COLUMNS, "password"]) {
        if (nurse[key] !== undefined && nurse[key] !== null && nurse[key] !== "" && key !== "password") {
            out[key] = nurse[key];
        }
    }
    if (out.status && out.status !== "Active" && out.status !== "Inactive") {
        throw new Error(`status must be "Active" or "Inactive" for ${nurse.name}, got "${out.status}".`);
    }
    return out;
}

function generatePassword() {
    // 20 chars from a no-lookalike alphabet, then guarantee each character class
    // so it clears stricter password policies than Supabase's 6-char default.
    const sets = {
        upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
        lower: "abcdefghijkmnpqrstuvwxyz",
        digit: "23456789",
        symbol: "!@#$%&*_+-",
    };
    const groups = Object.values(sets);
    const all = groups.join("");
    const bytes = randomBytes(24);
    // Index the buffer numerically — bytes["upper"] is undefined on a Buffer.
    const chars = groups.map((g, i) => g[bytes[i] % g.length]);
    for (let i = chars.length; i < 20; i++) chars.push(all[bytes[i] % all.length]);
    // shuffle so the guaranteed classes aren't always in the leading positions
    for (let i = chars.length - 1; i > 0; i--) {
        const j = bytes[(i + 8) % bytes.length] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

function looksLikeAnonKey(key) {
    // Supabase anon keys carry "anonymous" in the JWT payload; service keys do not.
    try {
        const payload = key.split(".")[1];
        if (!payload) return false;
        const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        return json.role === "anon";
    } catch {
        return false;
    }
}

function isUnknownColumnError(res) {
    const t = `${res.text || ""} ${res.error?.message || ""} ${res.error?.code || ""}`;
    return /PGRST204|42703|column .* does not exist|Could not find .* column/i.test(t);
}

function namedColumns(res) {
    const t = `${res.text || ""} ${res.error?.message || ""}`;
    const names = new Set();
    // Postgres quotes identifiers with double quotes, PostgREST's PGRST204 hint with singles.
    for (const m of t.matchAll(/["']([a-z_][a-z0-9_]*)["']/gi)) names.add(m[1].toLowerCase());
    return [...names].filter((n) => OPTIONAL_COLUMNS.includes(n));
}

function omit(obj, keys) {
    return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
}

function readStaffFile(arg) {
    if (!arg) throw new Error("--from needs a path to a JSON array of staff objects.");
    const file = resolve(ROOT, arg);
    if (!existsSync(file)) throw new Error(`No such file: ${arg}`);
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
        throw new Error(`${arg} is not valid JSON: ${err.message}`);
    }
    if (!Array.isArray(parsed)) throw new Error(`${arg} must contain a JSON array of staff objects.`);
    return parsed;
}

function env(...names) {
    for (const n of names) if (process.env[n]?.trim()) return process.env[n].trim();
    return "";
}

/** Minimal .env reader so the app's existing .env.local just works. */
function loadLocalEnvFiles() {
    for (const name of [".env.local", ".env"]) {
        const file = resolve(ROOT, name);
        if (!existsSync(file)) continue;
        for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
            const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (!m || line.trim().startsWith("#")) continue;
            let value = m[2].trim();
            if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
            if (process.env[m[1]] === undefined) process.env[m[1]] = value;
        }
    }
}

function printSummary(results) {
    const created = results.filter((r) => r.created);
    console.log("\n" + "─".repeat(78));
    console.log(DRY_RUN ? "Dry run complete — no writes." : "Done. Log in at /login with:");

    for (const r of results) {
        console.log(`\n  ${r.nurse.name}`);
        console.log(`    email     ${r.nurse.email}`);
        const pwLine = DRY_RUN
            ? "    password  (dry run — a one-time password would be generated)"
            : r.passwordPrintable
              ? `    password  ${r.password}`
              : "    password  (unchanged — an auth account already existed; use their own password)";
        console.log(pwLine);
        console.log(`    auth      ${r.authAction}`);
        console.log(`    staffs    ${r.dbAction}`);
        console.log(`    user id   ${r.userId}`);
    }

    const warnings = results.filter((r) => r.warning);
    if (warnings.length) {
        console.log("\n⚠ Needs your attention (exiting non-zero so wrappers notice):");
        for (const w of warnings) console.log(`   · ${w.nurse.email}: ${w.warning}`);
    }

    if (!DRY_RUN && (created.length || results.some((r) => r.passwordPrintable))) {
        console.log(
            [
                "",
                "Next steps",
                "   1. Give each nurse the credentials above and have them change the password on their",
                "      first sign-in (Nurse → Settings). These are one-time generated secrets, so don't",
                "      paste them into a chat thread, ticket, or spreadsheet.",
                "   2. Confirm they show up in Admin → Staff with role Nurse.",
                "   3. To undo a test entry: delete the staffs row, then delete the auth user",
                "      (Dashboard → Authentication → Users), so no orphaned login is left behind:",
                "",
                "        delete from public.staffs where id = '<user id>;',",
                "",
                "      Note the staffs delete policy is Admin-only, so run it as an admin in the app or",
                "      in the SQL editor.",
            ].join("\n")
        );
    }
    console.log("\n   Docs, options and rollback: docs/SEED_NURSES.md\n");
    return warnings.length > 0;
}


