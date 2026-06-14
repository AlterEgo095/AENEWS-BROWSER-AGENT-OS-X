import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production deployment
  // This generates a minimal server in .next/standalone
  output: "standalone",

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
