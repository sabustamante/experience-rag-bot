import { existsSync } from "fs";
import { resolve } from "path";
import type { NextConfig } from "next";

// ui.ts (gitignored) takes priority over ui.example.ts (committed default)
const uiConfigPath = existsSync(resolve(__dirname, "app/config/ui.ts"))
  ? "./app/config/ui.ts"
  : "./app/config/ui.example.ts";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "@ui-config": uiConfigPath,
    },
  },
};

export default nextConfig;
