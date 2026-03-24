import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["@eslee/auth", "@eslee/db"],
};

export default config;
