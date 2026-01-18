import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@eslee/ui", "@eslee/db"],
};

export default withPayload(nextConfig);
