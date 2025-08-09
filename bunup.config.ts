import { defineConfig, type DefineConfigItem } from "bunup";
import { shims, exports } from "bunup/plugins";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

// Get version from package.json
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const version = pkg.version;

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

const BASE_CONFIG: DefineConfigItem = {
  entry: ["src/cli.ts"],
  format: ["esm"],
  footer: createFooter(),
  clean: false,
  dts: false,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  plugins: [shims()],
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
    clean: true,
    dts: false,
    minify: true,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    footer: createFooter(),
    plugins: [shims()],
  },
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    outDir: "./dist",
    name: "Library Build",
    target: "node",
    banner: `#!/usr/bin/env node`,
    clean: true,
    dts: true,
    minify: true,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    footer: createFooter(),
    plugins: [shims(), exports()],
  },
  {
    ...BASE_CONFIG,
    outDir: "./dist/node",
    name: "NodeJS Build",
    target: "node",
  },
  {
    ...BASE_CONFIG,
    outDir: "./dist/bun",
    name: "Bun Build",
    target: "bun",
  },
]);

export default config;
