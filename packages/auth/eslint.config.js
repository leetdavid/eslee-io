import baseConfig, { restrictEnvAccess } from "@eslee/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [],
  },
  ...baseConfig,
  ...restrictEnvAccess,
];
