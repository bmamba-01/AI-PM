module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./packages/*/tsconfig.json"]
  },
  plugins: ["@typescript-eslint", "react", "import"],
  settings: {
    react: { version: "18.3" },
    "import/resolver": {
      typescript: { alwaysTryTypes: true }
    }
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        pathGroups: [
          { pattern: "@ai-pm/**", group: "internal" },
          { pattern: "@/**", group: "internal" }
        ],
        pathGroupsExcludedImportTypes: ["builtin"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true }
      }
    ],
    "react/react-in-jsx-scope": "off"
  },
  ignorePatterns: ["node_modules", "dist", "build", ".turbo", "*.config.*"]
}