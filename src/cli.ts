import { parseArgs } from "node:util";
import { consola } from "consola";
import { Pruner } from "./prune";
import { formatBytes, formatNumber, formatDuration, output } from "./utils";

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
    "dry-run": {
      type: "boolean",
      short: "d",
      default: false,
      description: "Show what would be pruned without actually removing files",
    },
  },
  strict: false,
  allowPositionals: true,
});

function showHelp() {
  consola.log(`
prune-mod - Remove unnecessary files from node_modules

Usage:
  prune-mod [options] [directory]

Options:
  -v, --verbose       Verbose log output
  --exclude <glob>    Glob of files that should not be pruned (can be specified multiple times)
  --include <glob>    Globs of files that should always be pruned (can be specified multiple times)
  -d, --dry-run       Show what would be pruned without actually removing files
  -h, --help          Show help

Examples:
  prune-mod           # Prune node_modules in current directory
  prune-mod ./my-project/node_modules
  prune-mod --exclude "*.config.js"
  prune-mod --include "*.log" --include "*.tmp"
`);
}

async function main() {
  if (values.help) {
    showHelp();
    process.exit(0);
  }

  const startTime = Date.now();
  const dir = positionals[0] || "node_modules";

  const pruner = new Pruner({
    dir,
    verbose: values.verbose as boolean,
    exceptions: Array.isArray(values.exclude) ? (values.exclude as string[]) : [],
    globs: Array.isArray(values.include) ? (values.include as string[]) : [],
    dryRun: values["dry-run"] as boolean,
  });

  try {
    const stats = await pruner.prune();

    consola.log("");
    output("files total", formatNumber(stats.filesTotal));
    output("files removed", formatNumber(stats.filesRemoved));
    output("size removed", formatBytes(stats.sizeRemoved));
    output("duration", formatDuration(Date.now() - startTime));
    consola.log("");
  } catch (error) {
    consola.error("Error:", error);
    process.exit(1);
  }
}

main().catch((error) => consola.error(error));
