import { parseArgs } from "node:util";
import { logger } from "./logger";
import { Pruner } from "./prune";
import updateNotifier from "update-notifier";
import { formatBytes, formatNumber, formatDuration, output } from "./utils";

const VERSION = process.env.VERSION || "unknown";
const COMMIT_HASH = process.env.COMMIT_HASH || "unknown";
const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();
const PKG_NAME = process.env.PKG_NAME || "";

const { values, positionals } = parseArgs({
  options: {
    verbose: {
      type: "boolean",
      short: "v",
      default: false,
      description: "Verbose log output",
    },
    exclude: {
      type: "string",
      multiple: true,
      default: [],
      description: "Glob of files that should not be pruned",
    },
    include: {
      type: "string",
      multiple: true,
      default: [],
      description: "Globs of files that should always be pruned in addition to the defaults",
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
      description: "Show help",
    },
    version: {
      type: "boolean",
      short: "V",
      default: false,
      description: "Show version",
    },
    "dry-run": {
      type: "boolean",
      short: "d",
      default: false,
      description: "Show what would be pruned without actually removing files",
    },
    workspace: {
      type: "boolean",
      short: "w",
      default: false,
      description: "Enable workspace/monorepo mode to prune all packages",
    },
    "workspace-root": {
      type: "string",
      default: undefined,
      description: "Specify the workspace root directory (auto-detected if not provided)",
    },
    "no-root": {
      type: "boolean",
      default: false,
      description: "Skip pruning the root node_modules in workspace mode",
    },
    "experimental-default-files": {
      type: "boolean",
      default: false,
      description: "Enable experimental extended file list for more aggressive pruning",
    },
  },
  strict: false,
  allowPositionals: true,
});

function showHelp() {
  logger.info(`
prune-mod - Remove unnecessary files from node_modules

Usage:
  prune-mod [options] [directory]

Options:
  -v, --verbose                   Verbose log output
  --exclude <glob>                Glob of files that should not be pruned (can be specified multiple times)
  --include <glob>                Globs of files that should always be pruned (can be specified multiple times)
  -d, --dry-run                   Show what would be pruned without actually removing files
  -w, --workspace                 Enable workspace/monorepo mode to prune all packages
  --workspace-root <dir>          Specify the workspace root directory (auto-detected if not provided)
  --no-root                       Skip pruning the root node_modules in workspace mode
  --experimental-default-files    Enable experimental extended file list for more aggressive pruning
  -h, --help                      Show help
  -V, --version                   Show version

Examples:
  prune-mod                    # Prune node_modules in current directory
  prune-mod ./my-project/node_modules
  prune-mod --exclude "*.config.js"
  prune-mod --include "*.log" --include "*.tmp"
  
Workspace/Monorepo Examples:
  prune-mod --workspace        # Auto-detect and prune all packages in workspace
  prune-mod -w --no-root       # Prune only package node_modules, skip root
  prune-mod -w --workspace-root /path/to/monorepo  # Specify workspace root
  
Experimental Examples:
  prune-mod --experimental-default-files  # Use extended file list for more aggressive pruning
  prune-mod -w --experimental-default-files  # Combine workspace mode with experimental files
`);
}

async function main() {
  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (values.version) {
    logger.info(`v${VERSION} (${COMMIT_HASH}) - Built on ${BUILD_TIME}`);

    process.exit(0);
  }

  const startTime = process.hrtime.bigint(); // More precise timing
  const dir = positionals[0] || "node_modules";

  // Optimize array creation - avoid unnecessary checks
  const exceptions = values.exclude || [];
  const globs = values.include || [];

  const pruner = new Pruner({
    dir,
    verbose: Boolean(values.verbose),
    exceptions: Array.isArray(exceptions) ? (exceptions as Array<string>) : [],
    globs: Array.isArray(globs) ? (globs as Array<string>) : [],
    dryRun: Boolean(values["dry-run"]),
    workspace: Boolean(values.workspace),
    workspaceRoot: values["workspace-root"] as string | undefined,
    includeRoot: !Boolean(values["no-root"]),
    experimental: {
      defaultFiles: Boolean(values["experimental-default-files"]),
    },
  });

  try {
    const stats = await pruner.prune();

    // Calculate duration in nanoseconds for better precision, then convert to ms
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    // Calculate size reduction percentage
    const reductionPercent =
      stats.sizeBefore > 0 ? ((stats.sizeRemoved / stats.sizeBefore) * 100).toFixed(1) : "0.0";

    logger.info("");
    output("files total", formatNumber(stats.filesTotal));
    output("files removed", formatNumber(stats.filesRemoved));
    output("size before", formatBytes(stats.sizeBefore));
    output("size after", formatBytes(stats.sizeAfter));
    output("size removed", `${formatBytes(stats.sizeRemoved)} (${reductionPercent}%)`);
    output("duration", formatDuration(durationMs));
    logger.info("");
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  }
}

updateNotifier({
  pkg: {
    name: PKG_NAME,
    version: VERSION,
  },
  updateCheckInterval: 1000 * 60 * 60 * 24, // Check daily
  shouldNotifyInNpmScript: true,
}).notify({
  isGlobal: true,
  defer: false, // Show immediately
});
main().catch((error) => logger.error(error));
