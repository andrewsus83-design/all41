import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Instant-navigation checks run only for pages that opt in with
    // `export const instant = true`: the pages guests open. The dashboard
    // belongs to a signed-in person and may wait for their session, and
    // checking a session reads the clock, which the checker reports in dev.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
