import { createRequire } from "module";

const require = createRequire(import.meta.url);
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Raised from the 1MB default so uploads up to the app's 20MB file-size
      // limit don't fail with 413. Patient documents are sent to the upload
      // server action base64-encoded (~33% larger ≈ ~27MB), so the limit
      // needs headroom above 20MB.
      bodySizeLimit: "30mb",
    },
  },
  typescript: {
    // Surface type errors at build time (previously masked, hiding 53 errors).
    ignoreBuildErrors: false,
  },
  headers: async () => [
    {
      source: "/fonts/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/:path*\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=604800",
        },
      ],
    },
  ],
};

export default withBundleAnalyzer(nextConfig);
