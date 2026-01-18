/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3002",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "cms.eslee.io",
        pathname: "/media/**",
      },
    ],
  },
};

export default config;
