/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  transpilePackages: ["@eslee/db"],
  // The embedded development database locates its WASM files at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Production never opens it, so its 25 MB stay out of every function bundle.
  outputFileTracingExcludes: {
    "*": [
      "../../node_modules/.pnpm/@electric-sql+pglite@*/**",
      "node_modules/@electric-sql/pglite/**",
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
