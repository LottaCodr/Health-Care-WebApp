// Production-only regression check for the patient lookup Server Action.
//
// Usage:
//   npx next build
//   node scripts/repro-patient-lookup-action.cjs
//
// This boots the real production build with a fake Supabase (GoTrue +
// PostgREST) and invokes `lookupPatient` the way the browser does: a Next-
// Action header and a React Flight `encodeReply` body. It verifies the result
// the browser receives, not just the service function in isolation. This is
// important because the erased-type re-export regression only appeared when
// Next's production Server Action compiler loaded the action bundle.
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
    const hit = args.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const NEXT_PORT = Number(argOf("port", "3112"));
const DB_PORT = Number(argOf("dbport", "54322"));

const STAFF_ID = "6f1d0f0a-1111-4a1a-9f0f-0f0f0f0f0f0f";
const PATIENT_ID = "1f5a1b72-2a7d-4bcb-8fe8-fb77d19ea801";
const MISSING_PATIENT_ID = "00000000-0000-4000-8000-000000000999";
const DATABASE_500_MESSAGE = "simulated PostgreSQL 500: database read unavailable";
const STAFF_LOOKUP_MESSAGE = "simulated staff-profile database read failure";
const PATIENT = {
    id: PATIENT_ID,
    hospital_number: "NVH-000042",
    name: "Grace Adeyemi",
    email: "grace.patient@hospital.test",
    phone: "+2348035551212",
    status: "registered",
    created_at: "2026-10-02T09:00:00.000Z",
};

// ─── Fake Supabase: only the auth and two reads used by lookupPatient ─────────
function startFakeSupabase(port) {
    let scenario = "patient-exists";
    const requests = [];

    const server = http.createServer((req, res) => {
        const url = new URL(req.url || "/", "http://fake-supabase.local");
        requests.push({ method: req.method, path: url.pathname, search: url.search, scenario });

        const sendJson = (status, value, contentType = "application/json") => {
            const body = JSON.stringify(value);
            res.writeHead(status, {
                "content-type": contentType,
                "content-length": Buffer.byteLength(body),
            });
            res.end(body);
        };

        if (url.pathname === "/auth/v1/user") {
            return sendJson(200, {
                id: STAFF_ID,
                aud: "authenticated",
                role: "authenticated",
                email: "nurse@hospital.test",
                app_metadata: { provider: "email" },
                user_metadata: {},
                created_at: "2026-01-01T00:00:00.000Z",
            });
        }

        if (url.pathname === "/rest/v1/staffs") {
            if (scenario === "staff-lookup-failure") {
                // resolveStaff retries transient 5xx reads once; return the
                // same failure on both attempts so the action must report it.
                return sendJson(503, {
                    code: "XX000",
                    message: STAFF_LOOKUP_MESSAGE,
                    details: null,
                    hint: null,
                });
            }
            return sendJson(200, [{ role: "Nurse", email: "nurse@hospital.test" }]);
        }

        if (url.pathname === "/rest/v1/patients") {
            if (scenario === "patient-missing") return sendJson(200, []);
            if (scenario === "patient-read-refused") {
                return sendJson(403, {
                    code: "42501",
                    message: "permission denied for table patients",
                    details: "row-level security policy blocked SELECT",
                    hint: null,
                });
            }
            if (scenario === "database-500") {
                return sendJson(500, {
                    code: "XX000",
                    message: DATABASE_500_MESSAGE,
                    details: "The fake database is intentionally returning HTTP 500.",
                    hint: null,
                });
            }
            return sendJson(200, [PATIENT]);
        }

        return sendJson(404, {
            code: "FAKE_ROUTE_NOT_FOUND",
            message: `Unhandled fake Supabase route: ${req.method} ${url.pathname}`,
        });
    });

    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve({
                server,
                requests,
                setScenario(value) {
                    scenario = value;
                },
                close() {
                    return new Promise((done) => {
                        server.close(done);
                        server.closeAllConnections?.();
                    });
                },
            });
        });
    });
}

function sessionCookie(dbUrl) {
    const storageKey = `sb-${new URL(dbUrl).hostname.split(".")[0]}-auth-token`;
    const session = {
        access_token: "fake.access.token",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: STAFF_ID,
            email: "nurse@hospital.test",
            aud: "authenticated",
            role: "authenticated",
        },
    };
    // @supabase/ssr reads plain JSON cookies unless the value has its
    // `base64-` marker, so encode the JSON as a normal cookie value.
    return `${storageKey}=${encodeURIComponent(JSON.stringify(session))}`;
}

// ─── Find the production Server Action ID in Next's build manifest ────────────
function findLookupActionId() {
    const manifestPath = path.join(ROOT, ".next/server/server-reference-manifest.json");
    if (!fs.existsSync(manifestPath)) {
        throw new Error("No production action manifest found; run `npx next build` first.");
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const hit = Object.entries(manifest.node || {}).find(
        ([, info]) =>
            info?.filename === "lib/services/patient.service.ts" &&
            info?.exportedName === "lookupPatient"
    );
    if (!hit) throw new Error("lookupPatient action ID not found in the production manifest.");
    return hit[0];
}

function loadFlightClient() {
    const clientPath = path.join(
        ROOT,
        "node_modules/next/dist/compiled/react-server-dom-webpack/client.edge.js"
    );
    const { encodeReply, createFromReadableStream } = require(clientPath);
    return { encodeReply, createFromReadableStream };
}

async function callLookupAction({ actionId, patientId, nextPort, cookie, flight }) {
    const body = await flight.encodeReply([patientId]);
    const response = await fetch(`http://127.0.0.1:${nextPort}/front-desk/patient/${PATIENT_ID}`, {
        method: "POST",
        headers: {
            "next-action": actionId,
            "content-type": "text/plain;charset=UTF-8",
            accept: "text/x-component",
            origin: `http://127.0.0.1:${nextPort}`,
            cookie,
        },
        body,
    });
    const text = await response.text();

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
        const serverModuleMap = new Proxy({}, { get: () => ({ id: "stub" }) });
        const serverConsumerManifest = {
            moduleMap: stubModules,
            serverModuleMap,
            moduleLoading: null,
        };
        const payload = await flight.createFromReadableStream(stream, {
            // `serverConsumerManifest` is the current RSC client API. Keep the
            // legacy fields too so this repro stays usable across nearby Next
            // versions that expose the older shape.
            serverConsumerManifest,
            moduleMap: stubModules,
            ssrManifest: { moduleMap: stubModules, moduleLoading: null },
            serverModuleMap,
        });
        return { status: response.status, text, result: await payload.a, decodeError: null };
    } catch (decodeError) {
        return { status: response.status, text, result: undefined, decodeError };
    }
}

function describeResponse(response) {
    const body = response.text.split("\n").filter(Boolean).slice(0, 8).join("\n");
    return `HTTP ${response.status}; decoded result=${JSON.stringify(response.result)}; ` +
        `decode error=${response.decodeError?.message ?? "none"}; Flight body=${body}`;
}

function waitForReady(child, getLog) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            clearInterval(poll);
            if (error) reject(error);
            else resolve();
        };
        const timer = setTimeout(
            () => finish(new Error(`next start did not become ready.\n${getLog()}`)),
            60_000
        );
        const poll = setInterval(() => {
            if (/Ready in|started server on/i.test(getLog())) finish();
        }, 200);
        child.once("error", (error) => finish(error));
        child.once("exit", (code, signal) => {
            finish(new Error(`next start exited before becoming ready (code=${code}, signal=${signal}).\n${getLog()}`));
        });
    });
}

function stopChild(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
    return new Promise((resolve) => {
        const killTimer = setTimeout(() => child.kill("SIGKILL"), 5_000);
        killTimer.unref();
        child.once("exit", () => {
            clearTimeout(killTimer);
            resolve();
        });
        child.kill("SIGTERM");
    });
}

async function main() {
    const actionId = findLookupActionId();
    const flight = loadFlightClient();
    const fake = await startFakeSupabase(DB_PORT);
    const dbUrl = `http://127.0.0.1:${fake.server.address().port}`;
    const cookie = sessionCookie(dbUrl);
    let serverLog = "";

    console.log(`Production lookup action: ${actionId}`);
    console.log(`Fake Supabase: ${dbUrl}; next start port: ${NEXT_PORT}`);

    const next = spawn(
        process.execPath,
        [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(NEXT_PORT), "-H", "127.0.0.1"],
        {
            cwd: ROOT,
            env: {
                ...process.env,
                NODE_ENV: "production",
                NEXT_TELEMETRY_DISABLED: "1",
                NEXT_PUBLIC_SUPABASE_URL: dbUrl,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-test-anon-key",
            },
            stdio: ["ignore", "pipe", "pipe"],
        }
    );
    next.stdout.on("data", (chunk) => (serverLog += chunk));
    next.stderr.on("data", (chunk) => (serverLog += chunk));

    try {
        await waitForReady(next, () => serverLog);

        const cases = [
            {
                name: "existing patient returns its record",
                scenario: "patient-exists",
                patientId: PATIENT_ID,
                verify(result) {
                    assert.deepEqual(result, { ok: true, data: PATIENT });
                },
            },
            {
                name: "missing patient returns ok/null",
                scenario: "patient-missing",
                patientId: MISSING_PATIENT_ID,
                verify(result) {
                    assert.deepEqual(result, { ok: true, data: null });
                },
            },
            {
                name: "database permission refusal returns its real reason",
                scenario: "patient-read-refused",
                patientId: PATIENT_ID,
                verify(result) {
                    assert.equal(result?.ok, false);
                    assert.equal(result?.code, "42501");
                    assert.match(result?.message ?? "", /permission denied for table patients/i);
                    assert.match(result?.message ?? "", /row-level security/i);
                },
            },
            {
                name: "staff lookup failure returns its real reason",
                scenario: "staff-lookup-failure",
                patientId: PATIENT_ID,
                verify(result) {
                    assert.equal(result?.ok, false);
                    assert.match(result?.message ?? "", /STAFF_LOOKUP_FAILED/i);
                    assert.match(result?.message ?? "", new RegExp(STAFF_LOOKUP_MESSAGE));
                    assert.doesNotMatch(result?.message ?? "", /must be signed in/i);
                },
            },
            {
                name: "database HTTP 500 returns its real reason",
                scenario: "database-500",
                patientId: PATIENT_ID,
                verify(result) {
                    assert.equal(result?.ok, false);
                    assert.equal(result?.code, "XX000");
                    assert.match(result?.message ?? "", new RegExp(DATABASE_500_MESSAGE));
                },
            },
        ];

        for (const testCase of cases) {
            fake.setScenario(testCase.scenario);
            const response = await callLookupAction({
                actionId,
                patientId: testCase.patientId,
                nextPort: NEXT_PORT,
                cookie,
                flight,
            });
            assert.equal(response.status, 200, `${testCase.name}: ${describeResponse(response)}`);
            assert.equal(response.decodeError, null, `${testCase.name}: ${describeResponse(response)}`);
            try {
                testCase.verify(response.result);
            } catch (error) {
                error.message = `${testCase.name}: ${error.message}\n${describeResponse(response)}\nServer log:\n${serverLog}`;
                throw error;
            }
            console.log(`✓ ${testCase.name}`);
        }

        assert.ok(
            fake.requests.some((request) => request.path === "/rest/v1/patients"),
            "the production action should have reached the fake patients table"
        );
        console.log("\nPatient lookup production-action checks passed.");
    } finally {
        await stopChild(next);
        await fake.close();
    }
}

main().catch((error) => {
    console.error("Patient lookup production-action check failed:", error);
    process.exitCode = 1;
});
