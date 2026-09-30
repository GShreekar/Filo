import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["lib/**", "generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      quotes: ["error", "double"],
    },
  },
  {
    // Type-aware parsing is scoped to the actual source — applying it to
    // this config file too would require tsconfig.dev.json to cover a
    // .mjs file, which needs allowJs and isn't worth it just to lint the
    // linter config with type information it doesn't need.
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["tsconfig.json"],
        sourceType: "module",
      },
    },
  },
);
