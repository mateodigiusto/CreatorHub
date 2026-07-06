import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import creatorhub from "./eslint-plugin-creatorhub/index.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /* CreatorHub custom rules — enforce Phase 1 invariants. */
  {
    plugins: { creatorhub },
    rules: {
      "creatorhub/no-raw-db-import-in-app": "error",
      "creatorhub/escape-hatch-justified": "error",
      "creatorhub/no-third-party-in-with-audit": "error",
      "creatorhub/no-bare-video": "error",
      /* Honor the codebase's `_unused` convention for intentionally unused
         args and locals (used in stubs, signature placeholders, and
         destructured-but-ignored values). */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  /* Tests get a wider runway — they need to import dbInternal for fixtures. */
  {
    files: ["tests/**/*.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "creatorhub/no-raw-db-import-in-app": "off",
      "creatorhub/no-bare-video": "off",
    },
  },
  /* The custom plugin itself is plain CommonJS — that's how ESLint
     plugins are traditionally authored. Exempt from the TS rules that
     ban require(). */
  {
    files: ["eslint-plugin-creatorhub/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    "supabase/.branches/**",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
