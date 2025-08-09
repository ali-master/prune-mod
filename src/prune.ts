import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";
import { minimatch } from "minimatch";
import { DefaultDirectories, DefaultExtensions, DefaultFiles } from "./constants";
import type { PrunerOptions, Stats } from "./types";
import { WorkspaceDetector, type WorkspaceInfo, WorkspaceType } from "./workspace";

export class Pruner {
  private readonly dir: string;
  private readonly verbose: boolean;
  private readonly dryRun: boolean;
  private dirs: Set<string>;
  private exts: Set<string>;
  private readonly excepts: string[];
  private readonly globs: string[];
  private files: Set<string>;
  private removeQueue: Array<{ path: string; isDir: boolean; size?: number }> = [];
  private packageJsonCache = new Map<string, any>();
  private readonly DIRECTORY_CONCURRENCY = 5;
  private readonly REMOVAL_CONCURRENCY = 10;
  private readonly workspace: boolean;
  private readonly workspaceRoot?: string;
  private readonly includeRoot: boolean;
  private workspaceDetector: WorkspaceDetector;
  private workspaceInfo?: WorkspaceInfo;

  constructor(options: PrunerOptions = {}) {
    this.dir = options.dir || "node_modules";
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.exts = new Set(options.extensions || DefaultExtensions);
    this.excepts = options.exceptions || [];
    this.globs = options.globs || [];
    this.dirs = new Set(options.directories || DefaultDirectories);
    this.files = new Set(options.files || DefaultFiles);
    this.workspace = options.workspace || false;
    this.workspaceRoot = options.workspaceRoot;
    this.includeRoot = options.includeRoot !== false; // Default to true
    this.workspaceDetector = new WorkspaceDetector();
  }

  async prune(): Promise<Stats> {
    // Calculate initial size before pruning
    const sizeBefore = await this.calculateTotalSize();

    const stats: Stats = {
      filesTotal: 0,
      filesRemoved: 0,
      sizeRemoved: 0,
      sizeBefore: sizeBefore,
      sizeAfter: 0,
    };

    // Clear caches to free memory
    this.packageJsonCache.clear();
    this.removeQueue.length = 0;

    if (this.workspace) {
      await this.pruneWorkspace(stats);
    } else {
      await this.walkDirectory(this.dir, stats);
    }

    await this.processRemoveQueue(stats);

    // Calculate final size
    stats.sizeAfter = stats.sizeBefore - stats.sizeRemoved;

    // Clear caches after processing
    this.packageJsonCache.clear();
    this.removeQueue.length = 0;

    return stats;
  }

  private async pruneWorkspace(stats: Stats): Promise<void> {
    // Detect workspace configuration
    const workspaceRoot = this.workspaceRoot || this.dir;
    this.workspaceInfo = await this.workspaceDetector.detect(workspaceRoot);

    if (this.workspaceInfo.type === WorkspaceType.None) {
      logger.info("No workspace configuration detected, falling back to standard pruning");
      await this.walkDirectory(this.dir, stats);
      return;
    }

    logger.info(`Detected ${this.workspaceInfo.type} workspace at ${this.workspaceInfo.root}`);

    if (this.verbose) {
      logger.info(`Found ${this.workspaceInfo.packages.length} workspace packages`);
    }

    // Prune root node_modules if requested
    if (this.includeRoot && this.workspaceInfo.hoistedNodeModules) {
      const rootNodeModules = this.workspaceInfo.hoistedNodeModules;
      try {
        await fs.promises.access(rootNodeModules);
        if (this.verbose) {
          logger.info(`Pruning root node_modules at ${rootNodeModules}`);
        }
        await this.walkDirectory(rootNodeModules, stats);
      } catch {
        if (this.verbose) {
          logger.info(`Root node_modules not found at ${rootNodeModules}`);
        }
      }
    }

    // Prune each package's node_modules
    for (const packagePath of this.workspaceInfo.packages) {
      const packageNodeModules = path.join(packagePath, "node_modules");
      try {
        await fs.promises.access(packageNodeModules);
        if (this.verbose) {
          logger.info(`Pruning package node_modules at ${packageNodeModules}`);
        }
        await this.walkDirectory(packageNodeModules, stats);
      } catch {
        // Package doesn't have node_modules, skip
        if (this.verbose) {
          logger.info(`No node_modules found in package at ${packagePath}`);
        }
      }
    }
  }

  private async walkDirectory(dir: string, stats: Stats): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      // Process entries in batches for better memory management
      const batchSize = 50;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await this.processBatch(batch, dir, stats);
      }
    } catch (err) {
      if (this.verbose) {
        logger.error(`Error walking directory ${dir}:`, err);
      }
    }
  }

  private async processBatch(entries: fs.Dirent[], dir: string, stats: Stats): Promise<void> {
    const directoriesToWalk: string[] = [];
    const filesToStat: Array<{ path: string; entry: fs.Dirent }> = [];

    // First pass: categorize entries
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      stats.filesTotal++;

      if (entry.isDirectory()) {
        const shouldPruneResult = this.shouldPrune(fullPath, entry);
        if (shouldPruneResult) {
          if (this.verbose) {
            const prefix = this.dryRun ? "[DRY RUN] " : "";
            logger.info(`${prefix}Prune directory: ${fullPath}`);
          }
          // Get directory stats efficiently
          const dirStats = await this.getDirStats(fullPath);
          stats.filesTotal += dirStats.filesTotal;
          stats.filesRemoved += dirStats.filesRemoved;
          stats.sizeRemoved += dirStats.sizeRemoved;
          this.removeQueue.push({ path: fullPath, isDir: true, size: dirStats.sizeRemoved });
        } else {
          directoriesToWalk.push(fullPath);
        }
      } else {
        // Use sync version first for better performance
        const shouldPruneSync = this.shouldPrune(fullPath, entry);
        if (shouldPruneSync) {
          filesToStat.push({ path: fullPath, entry });
        } else {
          // Only use async version if sync returns false, and we need to check package.json main files
          const shouldPruneAsync = await this.shouldPruneAsync(fullPath, entry);
          if (shouldPruneAsync) {
            filesToStat.push({ path: fullPath, entry });
          }
        }
      }
    }

    // Batch stat operations for files
    if (filesToStat.length > 0) {
      await this.processFilesBatch(filesToStat, stats);
    }

    // Recursively walk directories with concurrency control
    if (directoriesToWalk.length > 0) {
      await this.walkDirectoriesConcurrently(directoriesToWalk, stats);
    }
  }

  private async processFilesBatch(
    files: Array<{ path: string; entry: fs.Dirent }>,
    stats: Stats,
  ): Promise<void> {
    // Process files in smaller concurrent batches to avoid overwhelming the system
    const promises = files.map(async ({ path: fullPath }) => {
      try {
        const stat = await fs.promises.stat(fullPath);
        stats.filesRemoved++;
        stats.sizeRemoved += stat.size;
        this.removeQueue.push({ path: fullPath, isDir: false, size: stat.size });

        if (this.verbose) {
          const prefix = this.dryRun ? "[DRY RUN] " : "";
          logger.info(`${prefix}Prune file: ${fullPath}`);
        }
      } catch (err) {
        // File might have been deleted or moved, ignore stat errors
      }
    });

    await Promise.all(promises);
  }

  private async walkDirectoriesConcurrently(directories: string[], stats: Stats): Promise<void> {
    // Process directories with concurrency limit
    for (let i = 0; i < directories.length; i += this.DIRECTORY_CONCURRENCY) {
      const batch = directories.slice(i, i + this.DIRECTORY_CONCURRENCY);
      await Promise.all(batch.map((dir) => this.walkDirectory(dir, stats)));
    }
  }

  // Keep the sync version for tests and simple cases
  private shouldPrune(filePath: string, entry: fs.Dirent): boolean {
    return this.shouldPruneWithoutPackageJsonCheck(filePath, entry);
  }

  private async shouldPruneAsync(filePath: string, entry: fs.Dirent): Promise<boolean> {
    // This method is only used for additional async checks beyond the sync version
    // Currently only handles package.json main file checking for non-directories

    if (entry.isDirectory()) {
      return false; // Directories are handled by sync version
    }

    // The sync version returned false, but we need to check if this file might be
    // prunable after checking if it's a package.json main entry file
    const packageDir = path.dirname(filePath);
    const isMainFile = await this.isMainEntryFile(filePath, packageDir);
    if (isMainFile) {
      return false; // Don't prune main entry files
    }

    // If it's not a main entry file, re-run the sync logic but without the package.json check
    // to see if it would be prunable based on other criteria
    return this.shouldPruneWithoutPackageJsonCheck(filePath, entry);
  }

  private shouldPruneWithoutPackageJsonCheck(filePath: string, entry: fs.Dirent): boolean {
    const name = entry.name;

    // Never prune package.json files
    if (name === "package.json") {
      return false;
    }

    // Check exceptions first (most likely to exclude)
    for (const glob of this.excepts) {
      if (minimatch(name, glob)) {
        return false;
      }
    }

    // Check additional globs
    for (const glob of this.globs) {
      if (minimatch(name, glob)) {
        return true;
      }
    }

    // Check directories
    if (entry.isDirectory()) {
      return this.dirs.has(name);
    }

    // Check files (exact name match is faster than path operations)
    if (this.files.has(name)) {
      return true;
    }

    // Check exact path match (less common, check later)
    if (this.files.has(filePath)) {
      return true;
    }

    // Check extensions (path.extname is expensive, do last)
    const ext = path.extname(name);
    return this.exts.has(ext);
  }

  private async isMainEntryFile(filePath: string, packageDir: string): Promise<boolean> {
    const packageJsonPath = path.join(packageDir, "package.json");

    // Check cache first
    if (this.packageJsonCache.has(packageJsonPath)) {
      const cached = this.packageJsonCache.get(packageJsonPath);
      if (!cached || !cached.main) {
        return false;
      }
      return path.resolve(packageDir, cached.main) === path.resolve(filePath);
    }

    try {
      // Use async file operations
      await fs.promises.access(packageJsonPath);
      const content = await fs.promises.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(content);

      // Cache the result (including null/undefined for non-existent)
      this.packageJsonCache.set(packageJsonPath, packageJson);

      const mainFile = packageJson.main;
      if (mainFile && path.resolve(packageDir, mainFile) === path.resolve(filePath)) {
        return true;
      }
    } catch {
      // Cache negative result to avoid repeated failed attempts
      this.packageJsonCache.set(packageJsonPath, null);
    }

    return false;
  }

  private async getDirStats(dir: string): Promise<Stats> {
    const stats: Stats = {
      filesTotal: 0,
      filesRemoved: 0,
      sizeRemoved: 0,
    };

    const walkQueue: string[] = [dir];
    const concurrentLimit = 3; // Limit concurrent operations to avoid overwhelming the system

    while (walkQueue.length > 0) {
      // Process directories in batches
      const currentBatch = walkQueue.splice(0, concurrentLimit);

      await Promise.all(
        currentBatch.map(async (currentDir) => {
          try {
            const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

            const filesToStat: string[] = [];
            const dirsToQueue: string[] = [];

            // Separate files and directories
            for (const entry of entries) {
              const fullPath = path.join(currentDir, entry.name);
              stats.filesTotal++;
              stats.filesRemoved++;

              if (entry.isDirectory()) {
                dirsToQueue.push(fullPath);
              } else {
                filesToStat.push(fullPath);
              }
            }

            // Add directories to queue for next iteration
            walkQueue.push(...dirsToQueue);

            // Stat files in parallel but with controlled concurrency
            if (filesToStat.length > 0) {
              const statPromises = filesToStat.map(async (filePath) => {
                try {
                  const stat = await fs.promises.stat(filePath);
                  stats.sizeRemoved += stat.size;
                } catch {
                  // Ignore stat errors
                }
              });

              await Promise.all(statPromises);
            }
          } catch {
            // Ignore directory read errors
          }
        }),
      );
    }

    return stats;
  }

  private async processRemoveQueue(_stats: Stats): Promise<void> {
    if (this.dryRun) {
      if (this.verbose) {
        logger.info(`[DRY RUN] Would remove ${this.removeQueue.length} items`);
      }
      return;
    }

    if (this.removeQueue.length === 0) {
      return;
    }

    // Sort queue to process directories first (more efficient removal)
    this.removeQueue.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return 0;
    });

    // Process removals in batches with controlled concurrency
    for (let i = 0; i < this.removeQueue.length; i += this.REMOVAL_CONCURRENCY) {
      const chunk = this.removeQueue.slice(i, i + this.REMOVAL_CONCURRENCY);

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
              logger.error(`Error removing ${itemPath}:`, err);
            }
          }
        }),
      );

      // Allow garbage collection between batches for large operations
      if (i % 100 === 0 && i > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  private async calculateTotalSize(): Promise<number> {
    let totalSize = 0;
    const directories: string[] = [];

    if (this.workspace) {
      // Calculate size for workspace
      const workspaceRoot = this.workspaceRoot || this.dir;
      const info = await this.workspaceDetector.detect(workspaceRoot);

      if (info.type !== WorkspaceType.None) {
        // Add root node_modules if it exists and includeRoot is true
        if (this.includeRoot && info.hoistedNodeModules) {
          try {
            await fs.promises.access(info.hoistedNodeModules);
            directories.push(info.hoistedNodeModules);
          } catch {
            // Directory doesn't exist
          }
        }

        // Add package node_modules
        for (const packagePath of info.packages) {
          const nodeModules = path.join(packagePath, "node_modules");
          try {
            await fs.promises.access(nodeModules);
            directories.push(nodeModules);
          } catch {
            // Directory doesn't exist
          }
        }
      } else {
        directories.push(this.dir);
      }
    } else {
      directories.push(this.dir);
    }

    // Calculate total size for all directories
    for (const dir of directories) {
      totalSize += await this.getDirectorySize(dir);
    }

    return totalSize;
  }

  private async getDirectorySize(dir: string): Promise<number> {
    let size = 0;

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      const promises = entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          return this.getDirectorySize(fullPath);
        } else {
          try {
            const stat = await fs.promises.stat(fullPath);
            return stat.size;
          } catch {
            return 0;
          }
        }
      });

      const sizes = await Promise.all(promises);
      size = sizes.reduce((acc, s) => acc + s, 0);
    } catch {
      // Error reading directory
    }

    return size;
  }
}
