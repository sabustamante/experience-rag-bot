import { existsSync } from "fs";
import { resolve } from "path";
import type { NextConfig } from "next";

// ui.ts (gitignored) takes priority over ui.example.ts (committed default)
// Turbopack (used by Next.js 16 for both dev and build) requires relative paths here.
const uiConfigPath = existsSync(resolve(__dirname, "app/config/ui.ts"))
  ? "./app/config/ui.ts"
  : "./app/config/ui.example.ts";

const nextConfig: NextConfig = {
  // Static export for S3/CloudFront hosting (Stage 5 — AWS deployment)
  output: "export",
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "@ui-config": uiConfigPath,
    },
  },
};

export default nextConfig;
