import js from "@eslint/js";
import tseslintParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * ESLint 9 flat config.
 *
 * `next lint` is deprecated in Next 16 and the production build ignores ESLint
 * (`eslint.ignoreDuringBuilds: true` in next.config.mjs), so this config exists
 * mainly so `npm run lint` / `npx eslint .` runs again — the project previously
 * only shipped the legacy `.eslintrc.json`, which ESLint 9 ignores.
 *
 * TypeScript files are parsed with `@typescript-eslint/parser`; type-level
 * checks (no-undef / no-unused-vars) are left to `tsc`, which is the source of
 * truth for types in this repo. `react-hooks` is registered so existing inline
 * disable directives keep working.
 */
export default [
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "proxy.ts",
        ],
    },
    {
        files: ["**/*.{js,jsx}"],
        ...js.configs.recommended,
    },
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tseslintParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            // Type-checking is handled by `tsc --noEmit`.
            "no-undef": "off",
            "no-unused-vars": "off",
            // Keep the existing inline disable directives meaningful.
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },
];
