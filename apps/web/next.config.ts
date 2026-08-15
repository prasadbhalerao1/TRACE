import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // `lucide-react` and `recharts` are NOT listed here on purpose: Next 16 optimizes
    // both by default (see node_modules/next/dist/docs/.../optimizePackageImports.md),
    // so repeating them would be a no-op that reads like a win.
    //
    // `framer-motion` is the one barrel this app imports by name that isn't covered.
    // `@base-ui/react` is already imported via deep subpaths (`@base-ui/react/button`),
    // so there is no barrel to tree-shake there either.
    optimizePackageImports: ["framer-motion"],
  },

  images: {
    // Candidate avatars come straight from GitHub's CDN. Without an allowlist,
    // next/image refuses the host outright.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },

  compiler: {
    // Strip console noise from production bundles but keep `console.error` — it is the
    // only channel several catch-blocks use to report a genuine failure, and dropping it
    // would make production faults invisible rather than merely quieter.
    removeConsole: { exclude: ["error"] },
  },
};

export default nextConfig;
