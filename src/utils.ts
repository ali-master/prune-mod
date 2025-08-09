import { consola } from "consola";

// Pre-computed constants for better performance
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const KILO = 1024;
const LOG_KILO = Math.log(KILO);

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0.0 B";
  if (bytes < KILO) return `${bytes.toFixed(1)} B`;

  // Use logarithm for faster unit calculation instead of while loop
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / LOG_KILO), UNITS.length - 1);
  const size = bytes / Math.pow(KILO, unitIndex);

  return `${size.toFixed(1)} ${UNITS[unitIndex]}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Pre-computed constants
const MS_IN_SECOND = 1000;
const SEC_IN_MINUTE = 60;
const MS_IN_MINUTE = MS_IN_SECOND * SEC_IN_MINUTE;

export function formatDuration(ms: number): string {
  if (ms < MS_IN_SECOND) {
    return `${ms}ms`;
  }
  if (ms < MS_IN_MINUTE) {
    return `${(ms / MS_IN_SECOND).toFixed(1)}s`;
  }
  return `${(ms / MS_IN_MINUTE).toFixed(1)}m`;
}

export function output(name: string, value: string): void {
  // Use consola.info for formatted output
  consola.info(`${name.padStart(20)}: ${value}`);
}

/**
 * Detects the current runtime environment (Bun, Deno, Node.js, or Browser).
 */
export function getRuntime() {
  // @ts-expect-error
  const isBun: boolean = !!globalThis.Bun;
  // @ts-expect-error
  const isDeno: boolean = !!globalThis.Deno;
  const isNode: boolean = !!globalThis.process?.versions?.node && !isBun;
  // @ts-expect-error
  const isBrowser: boolean = globalThis.window && !isDeno;
  let currentRuntime: "bun" | "deno" | "node" | "browser" | "unknown";
  switch (true) {
    case isBun:
      currentRuntime = "bun";
      break;
    case isDeno:
      currentRuntime = "deno";
      break;
    case isNode:
      currentRuntime = "node";
      break;
    case isBrowser:
      currentRuntime = "browser";
      break;
    default:
      currentRuntime = "unknown";
      break;
  }

  return {
    isBun,
    isDeno,
    isNode,
    isBrowser,
    currentRuntime,
  };
}
