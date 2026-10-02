/**
 * Node module hooks that let the repo's real TypeScript (including "use server"
 * service files and .tsx components) be imported and executed outside Next.js.
 *
 *   • `@/…`  → repo root
 *   • `next/headers` → a stub cookie store (server actions call cookies())
 *   • `.ts` / `.tsx` → transpiled with sucrase
 *
 * Registered from scripts/dev-harness/register.mjs via module.register().
 */
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const { transform } = require("sucrase");

const STUB_FILES = {
    "@/utils/supabase/server": path.join(ROOT, "scripts/dev-harness/supabase-server-stub.mjs"),
};

const STUBS = {
    "next/headers": `
        const jar = new Map();
        export function cookies() {
            return Promise.resolve({
                getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
                get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
                set: (name, value) => { jar.set(name, value); },
            });
        }
        export function headers() { return Promise.resolve({ get: () => null }); }
    `,
    "next/dynamic": `
        export default function dynamic(loader) { return loader; }
    `,
    "next/navigation": `
        export function useParams() { return {}; }
        export function useRouter() { return { push() {}, replace() {}, back() {} }; }
        export function usePathname() { return "/"; }
        export function useSearchParams() { return new URLSearchParams(); }
    `,
    "server-only": `export {};`,
};

const EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".mjs", ".js", "/index.ts", "/index.tsx", "/index.js"];

/** TypeScript imports omit extensions; Node ESM does not. Try the candidates. */
function withExtension(abs) {
    for (const ext of EXTENSIONS) {
        if (existsSync(abs + ext) && statSync(abs + ext).isFile()) return abs + ext;
    }
    return abs;
}

export async function resolve(specifier, context, nextResolve) {
    if (STUB_FILES[specifier]) {
        return nextResolve(pathToFileURL(STUB_FILES[specifier]).href, context);
    }
    if (STUBS[specifier]) {
        return { url: `stub:${specifier}`, shortCircuit: true, format: "module" };
    }
    if (specifier.startsWith("@/")) {
        const abs = withExtension(path.join(ROOT, specifier.slice(2)));
        return nextResolve(pathToFileURL(abs).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
        const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
        return nextResolve(pathToFileURL(withExtension(base)).href, context);
    }
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    if (url.startsWith("stub:")) {
        return { format: "module", source: STUBS[url.slice("stub:".length)], shortCircuit: true };
    }
    if (url.startsWith("file:") && /\.(ts|tsx|mts)$/.test(url)) {
        const source = await readFile(fileURLToPath(url), "utf8");
        const { code } = transform(source, {
            transforms: ["typescript", "jsx"],
            jsxRuntime: "automatic",
            filePath: fileURLToPath(url),
        });
        return { format: "module", source: code, shortCircuit: true };
    }
    // A relative/alias import with no extension → try .ts/.tsx
    if (url.startsWith("file:") && !path.extname(fileURLToPath(url))) {
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
            try {
                const source = await readFile(fileURLToPath(url) + ext, "utf8");
                const { code } = transform(source, {
                    transforms: ["typescript", "jsx"],
                    jsxRuntime: "automatic",
                });
                return { format: "module", source: code, shortCircuit: true };
            } catch { /* try the next candidate */ }
        }
    }
    return nextLoad(url, context);
}
