import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  sassOptions: {
    includePaths: [path.join(process.cwd(), "src/styles")],
  },
};

export default nextConfig;
