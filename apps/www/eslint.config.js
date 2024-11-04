import baseConfig, { restrictEnvAccess } from "@eslee/eslint-config/base";
import nextjsConfig from "@eslee/eslint-config/nextjs";
import reactConfig from "@eslee/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
