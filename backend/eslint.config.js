import { defineConfig } from "eslint/config";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  {
    ignores: ["node_modules", "dist", "build"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "module", // 👈 this is the critical part
      globals: globals.node,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules,
    },
  },

  // CJS files: .cjs
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs", // 👈 Important for require()
      globals: globals.node,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules,
    },
  },
]);
