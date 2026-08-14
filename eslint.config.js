import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // scripts/ holds shell tools and a snippet meant to be pasted into a
    // browser console — neither is extension source, and neither type-checks.
    ignores: ["dist/**", "coverage/**", "node_modules/**", "scripts/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      complexity: ["error", 5],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests favour expressiveness over strictness.
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
