import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
      "@typescript-eslint/ban-ts-comment": "off",
      "no-prototype-builtins": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
];
