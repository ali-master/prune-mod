import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";
import { getRuntime } from "./utils";
import { logger } from "./logger";
import { dirname, joinPath } from "./fs";

/** Current file path derived from import.meta.url */
const currentFilename = fileURLToPath(import.meta.url);

/** Directory path of the current module */
const currentDirname = dirname(currentFilename);

/** Runtime detection results */
const { isBun, isBrowser, isDeno, currentRuntime } = getRuntime();

/**
 * Validate runtime environment
 * Exit if running in unsupported environments (browser, Deno)
 */
if (isBrowser || isDeno) {
  logger.error(
    `This script cannot be run in a ${currentRuntime} environment. Please use Node.js or Bun.`,
  );

  process.exit(1);
}

/**
 * Check if Bun runtime is available on the system
 * Prefer Bun to Node.js when available for better performance
 */
let bunAvailable: boolean;
let bunVersion: string = "";

if (isBun) {
  // Already running in Bun runtime
  bunAvailable = true;
  // @ts-expect-error - Bun global is available in Bun runtime
  bunVersion = Bun.version;
} else {
  // Running in Node.js, check if Bun is installed
  try {
    bunVersion = execSync("bun --version", { encoding: "utf8" }).trim();
    bunAvailable = true;
  } catch {
    // Bun is not installed, will use Node.js
    bunAvailable = false;
  }
}

/** Determine which runtime to use based on availability */
const useBun = bunAvailable;

/** Path to the appropriate CLI script based on runtime */
const scriptPath = useBun
  ? joinPath(currentDirname, "bun", "cli.js")
  : joinPath(currentDirname, "node", "cli.js");

/** Runtime executable name */
const runtime = useBun ? "bun" : "node";

/** Build command arguments for spawning the child process */
const args = [scriptPath, ...process.argv.slice(2)];
/**
 * Configure runtime-specific arguments
 */
if (useBun) {
  // Prepend the "--bun" flag for Bun runtime
  args.unshift("--bun");
  logger.info();
  logger.info(`Using Bun v${bunVersion}.`);
} else {
  logger.info();
  logger.info(`Using Node.js ${process.version}.`);
}

/**
 * Spawn the child process with the appropriate runtime
 * The child process will execute the actual CLI logic
 */
const child = spawn(runtime, args, {
  stdio: "pipe",
  env: process.env,
  cwd: process.cwd(),
});

/** Log debug information when DEBUG_CLI environment variable is set */
if (process.env.DEBUG_CLI) {
  logger.debug(`DEBUG: Spawning ${runtime} with args:`, args);
  logger.debug(`DEBUG: Child process started with PID: ${child.pid}`);
  logger.debug(`DEBUG: Running script at ${scriptPath} with runtime ${runtime}`);
}

/**
 * Set up stream handlers to forward child process output to parent
 */
child.stdout?.on("data", (data) => {
  process.stdout.write(data);
});

child.stderr?.on("data", (data) => {
  process.stderr.write(data);
});

/**
 * Handle child process lifecycle events
 */
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

/**
 * Signal forwarding handlers
 * Forward common POSIX signals from parent process to child process
 * This ensures proper cleanup and graceful shutdown
 */
process.on("SIGINT", () => {
  if (process.env.DEBUG_CLI) {
    logger.debug("DEBUG: Forwarding SIGINT to child process");
  }
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  if (process.env.DEBUG_CLI) {
    logger.debug("DEBUG: Forwarding SIGTERM to child process");
  }
  child.kill("SIGTERM");
});

process.on("SIGUSR1", () => {
  if (process.env.DEBUG_CLI) {
    logger.debug("DEBUG: Forwarding SIGUSR1 to child process");
  }
  child.kill("SIGUSR1");
});

process.on("SIGUSR2", () => {
  if (process.env.DEBUG_CLI) {
    logger.debug("DEBUG: Forwarding SIGUSR2 to child process");
  }
  child.kill("SIGUSR2");
});

/**
 * Global error handlers
 * Ensure the process exits cleanly on uncaught errors
 */
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

/**
 * Handle child process close event
 * Exit parent process with the same code as the child
 */
child.on("close", (code) => {
  if (process.env.DEBUG_CLI) {
    logger.debug(`DEBUG: Child process closed with code: ${code}`);
  }
  process.exit(code ?? 0);
});
