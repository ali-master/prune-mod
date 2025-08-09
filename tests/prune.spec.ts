import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { consola } from "consola";
import * as fs from "fs";
import * as path from "path";
import {
  Pruner,
  DefaultFiles,
  DefaultDirectories,
  DefaultExtensions,
  type PrunerOptions,
  type Stats,
} from "../src/prune";

describe("Pruner", () => {
  const fixturesDir = path.join(__dirname, "fixtures", "node_modules");
  const testDir = path.join(__dirname, "temp-test");

  beforeEach(async () => {
    // Create a copy of fixtures for testing
    await fs.promises.cp(fixturesDir, testDir, { recursive: true });
    // Mock consola for each test
    consola.mockTypes(() => vi.fn());
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
    // Restore consola after each test
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use default values when no options provided", () => {
      const pruner = new Pruner();
      expect(pruner).toBeDefined();
      expect(pruner["dir"]).toBe("node_modules");
      expect(pruner["verbose"]).toBe(false);
    });

    it("should accept custom options", () => {
      const options: PrunerOptions = {
        dir: "custom-dir",
        verbose: true,
        extensions: [".custom"],
        directories: ["custom-dir"],
        files: ["custom-file"],
        exceptions: ["*.keep"],
        globs: ["*.remove"],
      };
      const pruner = new Pruner(options);
      expect(pruner["dir"]).toBe("custom-dir");
      expect(pruner["verbose"]).toBe(true);
      expect(pruner["exts"]).toContain(".custom");
      expect(pruner["dirs"]).toContain("custom-dir");
      expect(pruner["files"]).toContain("custom-file");
      expect(pruner["excepts"]).toContain("*.keep");
      expect(pruner["globs"]).toContain("*.remove");
    });

    it("should use custom options without merging defaults", () => {
      const pruner = new Pruner({
        extensions: [".custom"],
      });
      expect(pruner["exts"]).toContain(".custom");
      expect(pruner["exts"].size).toBe(1); // Only custom extensions
    });
  });

  describe("shouldPrune", () => {
    let pruner: Pruner;

    beforeEach(() => {
      pruner = new Pruner();
    });

    it("should not prune files matching exception patterns", () => {
      pruner = new Pruner({ exceptions: ["*.keep", "important.*"] });
      const dirent = { name: "file.keep", isDirectory: () => false } as fs.Dirent;
      expect(pruner["shouldPrune"]("file.keep", dirent)).toBe(false);
    });

    it("should prune files matching glob patterns", () => {
      pruner = new Pruner({ globs: ["*.temp", "cache-*"] });
      const dirent = { name: "file.temp", isDirectory: () => false } as fs.Dirent;
      expect(pruner["shouldPrune"]("file.temp", dirent)).toBe(true);
    });

    it("should prune directories in the default list", () => {
      const dirent = { name: "test", isDirectory: () => true } as fs.Dirent;
      expect(pruner["shouldPrune"]("test", dirent)).toBe(true);
    });

    it("should prune files in the default list", () => {
      const dirent = { name: "LICENSE", isDirectory: () => false } as fs.Dirent;
      expect(pruner["shouldPrune"]("LICENSE", dirent)).toBe(true);
    });

    it("should prune files with default extensions", () => {
      const dirent = { name: "README.md", isDirectory: () => false } as fs.Dirent;
      expect(pruner["shouldPrune"]("README.md", dirent)).toBe(true);
    });

    it("should not prune files not matching any criteria", () => {
      const dirent = { name: "index.js", isDirectory: () => false } as fs.Dirent;
      expect(pruner["shouldPrune"]("index.js", dirent)).toBe(false);
    });

    it("should check exact path match", () => {
      pruner = new Pruner({ files: ["specific/path/file.js"] });
      const dirent = { name: "file.js", isDirectory: () => false } as fs.Dirent;
      expect(pruner["shouldPrune"]("specific/path/file.js", dirent)).toBe(true);
    });
  });

  describe("getDirStats", () => {
    it("should calculate directory statistics correctly", async () => {
      const pruner = new Pruner({ dir: testDir });
      const stats = await pruner["getDirStats"](path.join(testDir, "test-package", "test"));

      expect(stats.filesTotal).toBeGreaterThan(0);
      expect(stats.filesRemoved).toBe(stats.filesTotal);
      expect(stats.sizeRemoved).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      const pruner = new Pruner();
      const stats = await pruner["getDirStats"]("/non/existent/path");

      expect(stats.filesTotal).toBe(0);
      expect(stats.filesRemoved).toBe(0);
      expect(stats.sizeRemoved).toBe(0);
    });
  });

  describe("prune", () => {
    it("should prune test directories", async () => {
      const pruner = new Pruner({ dir: testDir });
      const stats = await pruner.prune();

      expect(stats.filesTotal).toBeGreaterThan(0);
      expect(stats.filesRemoved).toBeGreaterThan(0);
      expect(stats.sizeRemoved).toBeGreaterThan(0);

      // Check that test directories are removed
      const testPackageTestDir = path.join(testDir, "test-package", "test");
      await expect(fs.promises.access(testPackageTestDir)).rejects.toThrow();
    });

    it("should prune documentation files", async () => {
      const pruner = new Pruner({ dir: testDir });
      await pruner.prune();

      // Check that docs directories are removed
      const docsDir = path.join(testDir, "test-package", "docs");
      await expect(fs.promises.access(docsDir)).rejects.toThrow();

      // Check that README files are removed
      const readmePath = path.join(testDir, "test-package", "README.md");
      await expect(fs.promises.access(readmePath)).rejects.toThrow();
    });

    it("should prune configuration files", async () => {
      const pruner = new Pruner({ dir: testDir });
      await pruner.prune();

      // Check that config files are removed
      const eslintPath = path.join(testDir, "test-package", ".eslintrc");
      await expect(fs.promises.access(eslintPath)).rejects.toThrow();

      const prettierPath = path.join(testDir, "test-package", ".prettierrc");
      await expect(fs.promises.access(prettierPath)).rejects.toThrow();
    });

    it("should keep main entry files", async () => {
      const pruner = new Pruner({ dir: testDir });
      await pruner.prune();

      // Check that index.js is kept
      const indexPath = path.join(testDir, "test-package", "index.js");
      await expect(fs.promises.access(indexPath)).resolves.toBe(undefined);

      // Check that package.json is kept
      const packagePath = path.join(testDir, "test-package", "package.json");
      await expect(fs.promises.access(packagePath)).resolves.toBe(undefined);
    });

    it("should respect exception patterns", async () => {
      // Create a file that would normally be pruned
      const keepFile = path.join(testDir, "test-package", "README.keep.md");
      await fs.promises.writeFile(keepFile, "Keep this file");

      const pruner = new Pruner({
        dir: testDir,
        exceptions: ["*.keep.*"],
      });
      await pruner.prune();

      // Check that the excepted file is kept
      await expect(fs.promises.access(keepFile)).resolves.toBe(undefined);

      // But other README files should be removed
      const readmePath = path.join(testDir, "test-package", "README.md");
      await expect(fs.promises.access(readmePath)).rejects.toThrow();
    });

    it("should handle verbose mode", async () => {
      const consolaLogSpy = vi.spyOn(consola, "log");
      const pruner = new Pruner({ dir: testDir, verbose: true });
      await pruner.prune();

      expect(consolaLogSpy).toHaveBeenCalled();
      expect(consolaLogSpy.mock.calls.some((call) => call[0].includes("Prune"))).toBe(true);

      consolaLogSpy.mockRestore();
    });

    it("should handle errors during pruning", async () => {
      const consolaErrorSpy = vi.spyOn(consola, "error");
      const pruner = new Pruner({ dir: "/non/existent/path", verbose: true });
      const stats = await pruner.prune();

      expect(stats.filesTotal).toBe(0);
      expect(stats.filesRemoved).toBe(0);
      expect(consolaErrorSpy).toHaveBeenCalled();

      consolaErrorSpy.mockRestore();
    });

    it("should process remove queue with concurrency limit", async () => {
      const pruner = new Pruner({ dir: testDir });

      // Add many items to the remove queue
      for (let i = 0; i < 25; i++) {
        pruner["removeQueue"].push({
          path: path.join(testDir, `file${i}.txt`),
          isDir: false,
        });
      }

      const stats: Stats = {
        filesTotal: 0,
        filesRemoved: 0,
        sizeRemoved: 0,
      };

      await pruner["processRemoveQueue"](stats);

      // The method should complete without errors
      expect(pruner["removeQueue"].length).toBe(25);
    });

    it("should handle removal errors gracefully", async () => {
      const consolaErrorSpy = vi.spyOn(consola, "error");
      const pruner = new Pruner({ dir: testDir, verbose: true });

      // Add a non-existent file to remove queue
      pruner["removeQueue"].push({
        path: "/non/existent/file.txt",
        isDir: false,
      });

      const stats: Stats = {
        filesTotal: 0,
        filesRemoved: 0,
        sizeRemoved: 0,
      };

      await pruner["processRemoveQueue"](stats);

      expect(consolaErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error removing"),
        expect.anything(),
      );

      consolaErrorSpy.mockRestore();
    });
  });

  describe("Dry run functionality", () => {
    it("should not remove files in dry run mode", async () => {
      const pruner = new Pruner({ dir: testDir, dryRun: true });

      const beforeStats = await getDirectoryStats(testDir);
      await pruner.prune();
      const afterStats = await getDirectoryStats(testDir);

      // Files should not be removed in dry run mode
      expect(afterStats.fileCount).toBe(beforeStats.fileCount);
      expect(afterStats.totalSize).toBe(beforeStats.totalSize);
    });

    it("should log dry run actions when verbose", async () => {
      const consolaInfoSpy = vi.spyOn(consola, "info");
      const pruner = new Pruner({ dir: testDir, dryRun: true, verbose: true });

      await pruner.prune();

      const dryRunLogs = consolaInfoSpy.mock.calls.filter((call) =>
        call[0]?.includes?.("[DRY RUN]"),
      );

      expect(dryRunLogs.length).toBeGreaterThan(0);
      consolaInfoSpy.mockRestore();
    });

    it("should still calculate correct stats in dry run mode", async () => {
      const pruner = new Pruner({ dir: testDir, dryRun: true });
      const stats = await pruner.prune();

      expect(stats.filesTotal).toBeGreaterThan(0);
      expect(stats.filesRemoved).toBeGreaterThan(0);
      expect(stats.sizeRemoved).toBeGreaterThan(0);
    });

    it("should work with dry run disabled (normal mode)", async () => {
      const pruner = new Pruner({ dir: testDir, dryRun: false });

      const beforeStats = await getDirectoryStats(testDir);
      await pruner.prune();
      const afterStats = await getDirectoryStats(testDir);

      // Files should be removed in normal mode
      expect(afterStats.fileCount).toBeLessThan(beforeStats.fileCount);
    });
  });

  async function getDirectoryStats(dir: string): Promise<{ fileCount: number; totalSize: number }> {
    let fileCount = 0;
    let totalSize = 0;

    async function walk(currentDir: string) {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          fileCount++;
          const stat = await fs.promises.stat(fullPath);
          totalSize += stat.size;
        }
      }
    }

    try {
      await walk(dir);
    } catch {
      // Ignore errors
    }

    return { fileCount, totalSize };
  }

  describe("Default exports", () => {
    it("should export default files list", () => {
      expect(DefaultFiles).toBeInstanceOf(Array);
      expect(DefaultFiles).toContain("LICENSE");
      expect(DefaultFiles).toContain("README");
      expect(DefaultFiles).toContain(".eslintrc");
    });

    it("should export default directories list", () => {
      expect(DefaultDirectories).toBeInstanceOf(Array);
      expect(DefaultDirectories).toContain("test");
      expect(DefaultDirectories).toContain("docs");
      expect(DefaultDirectories).toContain(".github");
    });

    it("should export default extensions list", () => {
      expect(DefaultExtensions).toBeInstanceOf(Array);
      expect(DefaultExtensions).toContain(".md");
      expect(DefaultExtensions).toContain(".ts");
      expect(DefaultExtensions).toContain(".coffee");
    });
  });

  describe("walkDirectory", () => {
    it("should walk through all files and directories", async () => {
      const pruner = new Pruner({ dir: testDir });
      const stats: Stats = {
        filesTotal: 0,
        filesRemoved: 0,
        sizeRemoved: 0,
      };

      await pruner["walkDirectory"](testDir, stats);

      expect(stats.filesTotal).toBeGreaterThan(0);
      expect(pruner["removeQueue"].length).toBeGreaterThan(0);
    });

    it("should handle directory read errors", async () => {
      const consolaErrorSpy = vi.spyOn(consola, "error");
      const pruner = new Pruner({ dir: testDir, verbose: true });
      const stats: Stats = {
        filesTotal: 0,
        filesRemoved: 0,
        sizeRemoved: 0,
      };

      await pruner["walkDirectory"]("/non/existent/path", stats);

      expect(consolaErrorSpy).toHaveBeenCalled();
      expect(stats.filesTotal).toBe(0);

      consolaErrorSpy.mockRestore();
    });

    it("should recursively process subdirectories", async () => {
      const pruner = new Pruner({
        dir: testDir,
        directories: [], // Don't prune any directories
        files: ["test.spec.js"], // Only prune spec files by exact name
        extensions: [],
      });
      const stats: Stats = {
        filesTotal: 0,
        filesRemoved: 0,
        sizeRemoved: 0,
      };

      await pruner["walkDirectory"](testDir, stats);

      // Should have walked through all files
      expect(stats.filesTotal).toBeGreaterThan(0);

      // Should have marked spec files for removal
      const specFiles = pruner["removeQueue"].filter((item) => item.path.endsWith("test.spec.js"));
      expect(specFiles.length).toBeGreaterThan(0);
    });
  });
});
