import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { getRuntime } from "./utils";
import { logger } from "./logger";
import { dirname, joinPath } from "./fs";

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

const { isBun, isBrowser, isDeno, currentRuntime } = getRuntime();

if (isBrowser || isDeno) {
  logger.error(
    `This script cannot be run in a ${currentRuntime} environment. Please use Node.js or Bun.`,
  );

  process.exit(1);
}

const scriptPath = isBun
  ? joinPath(currentDirname, "bun", "cli.js")
  : joinPath(currentDirname, "node", "cli.js");

const runtime = isBun ? "bun" : "node";

const child = spawn(runtime, [scriptPath, ...process.argv.slice(2)], {
  stdio: "pipe",
  env: process.env,
  cwd: process.cwd(),
});

// Debug: Log when spawning
if (process.env.DEBUG_CLI) {
  logger.debug(`DEBUG: Spawning ${runtime} with args:`, [scriptPath, ...process.argv.slice(2)]);
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
    logger.debug(`DEBUG: Child process exited with code:`, code);
  }
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  logger.error(`Failed to start ${runtime}:`, err);
  process.exit(1);
});
