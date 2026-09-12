import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/chat", destination: "/build", permanent: false },
      { source: "/dashboard", destination: "/calendar", permanent: false },
      { source: "/models", destination: "/resources", permanent: false },
      { source: "/graph", destination: "/data?tab=connections", permanent: false },
    ];
  },
};

export default nextConfig;
