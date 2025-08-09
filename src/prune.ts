import * as fs from "fs";
import * as path from "path";
import { minimatch as minimatchFn } from "minimatch";
import { consola } from "consola";
import { DefaultDirectories, DefaultExtensions, DefaultFiles } from "./constants.ts";
import type { PrunerOptions, Stats } from "./types.ts";

export { DefaultDirectories, DefaultExtensions, DefaultFiles };
export type { PrunerOptions, Stats };

export class Pruner {
  private readonly dir: string;
  private readonly verbose: boolean;
  private readonly dryRun: boolean;
  private dirs: Set<string>;
  private exts: Set<string>;
  private readonly excepts: string[];
  private readonly globs: string[];
  private files: Set<string>;
  private removeQueue: Array<{ path: string; isDir: boolean }> = [];

  constructor(options: PrunerOptions = {}) {
    this.dir = options.dir || "node_modules";
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.exts = new Set(options.extensions || DefaultExtensions);
    this.excepts = options.exceptions || [];
    this.globs = options.globs || [];
    this.dirs = new Set(options.directories || DefaultDirectories);
    this.files = new Set(options.files || DefaultFiles);
  }

  async prune(): Promise<Stats> {
    const stats: Stats = {
      filesTotal: 0,
      filesRemoved: 0,
      sizeRemoved: 0,
    };

    await this.walkDirectory(this.dir, stats);
    await this.processRemoveQueue(stats);

    return stats;
  }

  private async walkDirectory(dir: string, stats: Stats): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        stats.filesTotal++;

        if (entry.isDirectory()) {
          if (this.shouldPrune(fullPath, entry)) {
            if (this.verbose) {
              if (this.dryRun) {
                consola.info(`[DRY RUN] Prune directory: ${fullPath}`);
              } else {
                consola.log(`Prune directory: ${fullPath}`);
              }
            }
            const dirStats = await this.getDirStats(fullPath);
            stats.filesTotal += dirStats.filesTotal;
            stats.filesRemoved += dirStats.filesRemoved;
            stats.sizeRemoved += dirStats.sizeRemoved;
            this.removeQueue.push({ path: fullPath, isDir: true });
          } else {
            await this.walkDirectory(fullPath, stats);
          }
        } else {
          if (this.shouldPrune(fullPath, entry)) {
            if (this.verbose) {
              if (this.dryRun) {
                consola.info(`[DRY RUN] Prune file: ${fullPath}`);
              } else {
                consola.log(`Prune file: ${fullPath}`);
              }
            }
            const stat = await fs.promises.stat(fullPath);
            stats.filesRemoved++;
            stats.sizeRemoved += stat.size;
            this.removeQueue.push({ path: fullPath, isDir: false });
          }
        }
      }
    } catch (err) {
      if (this.verbose) {
        consola.error(`Error walking directory ${dir}:`, err);
      }
    }
  }

  private shouldPrune(filePath: string, entry: fs.Dirent): boolean {
    const name = entry.name;

    // Check exceptions first
    for (const glob of this.excepts) {
      if (minimatchFn(name, glob)) {
        return false;
      }
    }

    // Check additional globs
    for (const glob of this.globs) {
      if (minimatchFn(name, glob)) {
        return true;
      }
    }

    // Check directories
    if (entry.isDirectory()) {
      return this.dirs.has(name);
    }

    // Check files
    if (this.files.has(name)) {
      return true;
    }

    // Check exact path match
    if (this.files.has(filePath)) {
      return true;
    }

    // Check extensions
    const ext = path.extname(filePath);
    return this.exts.has(ext);
  }

  private async getDirStats(dir: string): Promise<Stats> {
    const stats: Stats = {
      filesTotal: 0,
      filesRemoved: 0,
      sizeRemoved: 0,
    };

    async function walk(currentDir: string): Promise<void> {
      try {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          stats.filesTotal++;
          stats.filesRemoved++;

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else {
            const stat = await fs.promises.stat(fullPath);
            stats.sizeRemoved += stat.size;
          }
        }
      } catch (err) {
        // Ignore errors when getting stats
      }
    }

    await walk(dir);
    return stats;
  }

  private async processRemoveQueue(_stats: Stats): Promise<void> {
    if (this.dryRun) {
      if (this.verbose) {
        consola.info(`[DRY RUN] Would remove ${this.removeQueue.length} items`);
      }
      return;
    }

    // Process removals in parallel with a concurrency limit
    const concurrency = 10;
    const chunks: Array<{ path: string; isDir: boolean }[]> = [];

    for (let i = 0; i < this.removeQueue.length; i += concurrency) {
      chunks.push(this.removeQueue.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async ({ path: itemPath, isDir }) => {
          try {
            if (isDir) {
              await fs.promises.rm(itemPath, { recursive: true, force: true });
            } else {
              await fs.promises.unlink(itemPath);
            }
          } catch (err) {
            if (this.verbose) {
              consola.error(`Error removing ${itemPath}:`, err);
            }
          }
        }),
      );
    }
  }
}
