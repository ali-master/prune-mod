import { defineConfig, type DefineConfigItem } from "bunup";
import { shims, exports } from "bunup/plugins";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { version, name as pkg_name } from "package.json" assert { type: "json" };

// Get git commit hash
let commitHash = "unknown";
try {
  if (existsSync(".git")) {
    commitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  }
} catch {
  // Fallback if git command fails
  commitHash = "dev";
}

// Get build timestamp
const buildTime = new Date().toISOString();

// Create footer with version and build info
const createFooter = () =>
  `
// 🚀 prune-mod v${version} (${commitHash})
// Built on ${buildTime}
// Created with ❤️ by Ali Torki <ali_4286@live.com>
// https://github.com/ali-master/prune-mod
`.trim();

const MINIFY_OPTIONS: Pick<
  DefineConfigItem,
  "clean" | "minify" | "minifyWhitespace" | "minifyIdentifiers" | "minifySyntax"
> = {
  clean: true,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
};
const CLI_BASE_CONFIG: DefineConfigItem = {
  entry: ["src/cli.ts"],
  format: ["esm"],
  footer: createFooter(),
  dts: false,
  plugins: [shims()],
  env: {
    VERSION: version,
    COMMIT_HASH: commitHash,
    BUILD_TIME: buildTime,
    PKG_NAME: pkg_name,
  },
  ...MINIFY_OPTIONS,
};
/**
 * @internal
 */
const config = defineConfig([
  {
    entry: ["src/runtime.ts"],
    format: ["esm"],
    outDir: "./dist",
    name: "Runtime Detector",
    target: "node",
    banner: `#!/usr/bin/env node`,
    dts: false,
    footer: createFooter(),
    plugins: [shims()],
    ...MINIFY_OPTIONS,
  },
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    outDir: "./dist",
    name: "Library Build",
    target: "node",
    banner: `#!/usr/bin/env node`,
    dts: true,
    footer: createFooter(),
    plugins: [shims(), exports()],
    ...MINIFY_OPTIONS,
  },
  {
    ...CLI_BASE_CONFIG,
    outDir: "./dist/node",
    name: "NodeJS Build",
    target: "node",
  },
  {
    ...CLI_BASE_CONFIG,
    outDir: "./dist/bun",
    name: "Bun Build",
    target: "bun",
  },
]);

export default config;
