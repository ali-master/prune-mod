import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getRuntime } from "./utils";
import { consola } from "consola";

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

const { isBun, isBrowser, isDeno, currentRuntime } = getRuntime();

if (isBrowser || isDeno) {
  consola.error(
    `This script cannot be run in a ${currentRuntime} environment. Please use Node.js or Bun.`,
  );

  process.exit(1);
}

const scriptPath = isBun
  ? join(currentDirname, "bun", "cli.js")
  : join(currentDirname, "node", "cli.js");

const runtime = isBun ? "bun" : "node";

const child = spawn(runtime, [scriptPath, ...process.argv.slice(2)], {
  stdio: "pipe",
  env: process.env,
  cwd: process.cwd(),
});

// Debug: Log when spawning
if (process.env.DEBUG_CLI) {
  consola.info(`DEBUG: Spawning ${runtime} with args:`, [scriptPath, ...process.argv.slice(2)]);
}

// Forward stdout and stderr to parent process
child.stdout?.on("data", (data) => {
  process.stdout.write(data);
});

child.stderr?.on("data", (data) => {
  process.stderr.write(data);
});

child.on("exit", (code) => {
  if (process.env.DEBUG_CLI) {
    consola.info(`DEBUG: Child process exited with code:`, code);
  }
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  consola.error(`Failed to start ${runtime}:`, err);
  process.exit(1);
});
