import { consola } from "consola";

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
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
