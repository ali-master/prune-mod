import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger } from "../src/logger";
import * as fs from "fs";
import * as path from "path";
import { Pruner } from "../src/prune";
import {
  DefaultFiles,
  DefaultDirectories,
  DefaultExtensions,
  ExperimentalDefaultFiles,
} from "../src/constants";
import type { PrunerOptions, Stats } from "../src/types";
import {
  createTestSuite,
  TestDataGenerator,
  TestAssertions,
  TEST_PATTERNS,
  COMMON_TEST_FILES,
  COMMON_TEST_DIRS,
} from "./test-utils";

describe("Pruner", () => {
  const testSuite = createTestSuite("Pruner", {
    fileManager: true,
    loggerMock: true,
  });
  let testDir: string;

  beforeEach(async () => {
    const { fileManager } = await testSuite.setup("pruner-test");
    testDir = fileManager!.testDirectory;
  });

  afterEach(async () => {
    await testSuite.teardown();
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

    it("should use default files when experimental mode is disabled", () => {
      const pruner = new Pruner();
      const defaultFileCount = DefaultFiles.length;
      expect(pruner["files"].size).toBe(defaultFileCount);

      // Check some standard default files
      expect(pruner["files"]).toContain("README");
      expect(pruner["files"]).toContain("LICENSE");
      expect(pruner["files"]).toContain(".babelrc");
    });

    it("should include experimental files when experimental mode is enabled", () => {
      const pruner = new Pruner({
        experimental: {
          defaultFiles: true,
        },
        verbose: true,
      });

      const expectedCount = DefaultFiles.length + ExperimentalDefaultFiles.length;
      expect(pruner["files"].size).toBe(expectedCount);

      // Check that default files are still included
      expect(pruner["files"]).toContain("README");
      expect(pruner["files"]).toContain("LICENSE");
      expect(pruner["files"]).toContain(".babelrc");

      // Check that experimental files are included
      expect(pruner["files"]).toContain("README.md");
      expect(pruner["files"]).toContain("CHANGELOG.md");
      expect(pruner["files"]).toContain(".gitignore");
      expect(pruner["files"]).toContain("webpack.config.js");
      expect(pruner["files"]).toContain("docker-compose.yml");
      expect(pruner["files"]).toContain(".env.example");
    });

    it("should log experimental mode message when verbose and experimental enabled", () => {
      const loggerSpy = vi.spyOn(logger, "info");

      new Pruner({
        experimental: { defaultFiles: true },
        verbose: true,
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Experimental mode: Using extended file list with ${ExperimentalDefaultFiles.length} additional files`,
        ),
      );
    });

    it("should not log experimental mode message when not verbose", () => {
      const loggerSpy = vi.spyOn(logger, "info");

      new Pruner({
        experimental: { defaultFiles: true },
        verbose: false,
      });

      expect(loggerSpy).not.toHaveBeenCalledWith(expect.stringContaining("Experimental mode"));
    });

    it("should handle custom files with experimental mode", () => {
      const customFiles = ["custom.file"];
      const pruner = new Pruner({
        files: customFiles,
        experimental: { defaultFiles: true },
      });

      // When custom files are provided, they should be used instead of defaults
      expect(pruner["files"].size).toBe(1);
      expect(pruner["files"]).toContain("custom.file");
    });
  });

  describe("shouldPrune", () => {
    let pruner: Pruner;

    beforeEach(() => {
      pruner = new Pruner();
    });

    it("should not prune files matching exception patterns", () => {
      pruner = new Pruner({ exceptions: ["*.keep", "important.*"] });
      const dirent = TestDataGenerator.createMockDirent("file.keep", false);
      expect(pruner["shouldPrune"]("file.keep", dirent)).toBe(false);
    });

    it("should prune files matching glob patterns", () => {
      pruner = new Pruner({ globs: ["*.temp", "cache-*"] });
      const dirent = TestDataGenerator.createMockDirent("file.temp", false);
      expect(pruner["shouldPrune"]("file.temp", dirent)).toBe(true);
    });

    it("should prune directories in the default list", () => {
      const dirent = TestDataGenerator.createMockDirent(COMMON_TEST_DIRS.TEST, true);
      expect(pruner["shouldPrune"](COMMON_TEST_DIRS.TEST, dirent)).toBe(true);
    });

    it("should prune files in the default list", () => {
      const dirent = TestDataGenerator.createMockDirent(COMMON_TEST_FILES.LICENSE, false);
      expect(pruner["shouldPrune"](COMMON_TEST_FILES.LICENSE, dirent)).toBe(true);
    });

    it("should prune files with default extensions", () => {
      const dirent = TestDataGenerator.createMockDirent(COMMON_TEST_FILES.README, false);
      expect(pruner["shouldPrune"](COMMON_TEST_FILES.README, dirent)).toBe(true);
    });

    it("should not prune files not matching any criteria", () => {
      const dirent = TestDataGenerator.createMockDirent(COMMON_TEST_FILES.INDEX_JS, false);
      expect(pruner["shouldPrune"](COMMON_TEST_FILES.INDEX_JS, dirent)).toBe(false);
    });

    it("should check exact path match", () => {
      pruner = new Pruner({ files: ["specific/path/file.js"] });
      const dirent = TestDataGenerator.createMockDirent("file.js", false);
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
      await TestAssertions.expectFileNotToExist(testPackageTestDir);
    });

    it("should prune documentation files", async () => {
      const pruner = new Pruner({ dir: testDir });
      await pruner.prune();

      // Check that documentation files and directories are removed
      await TEST_PATTERNS.verifyFilesRemoved(testDir, [
        "test-package/docs",
        "test-package/README.md",
      ]);
    });

    it("should prune configuration files", async () => {
      const pruner = new Pruner({ dir: testDir });
      await pruner.prune();

      // Check that config files are removed
      await TEST_PATTERNS.verifyFilesRemoved(testDir, [
        "test-package/.eslintrc",
        "test-package/.prettierrc",
      ]);
    });

    it("should keep main entry files", async () => {
      const pruner = new Pruner({ dir: testDir });
      await pruner.prune();

      // Check that essential files are kept
      await TEST_PATTERNS.verifyFilesKept(testDir, [
        "test-package/index.js",
        "test-package/package.json",
      ]);
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
      expect(fs.existsSync(keepFile)).toBe(true);

      // But other README files should be removed
      await TEST_PATTERNS.verifyFilesRemoved(testDir, ["test-package/README.md"]);
    });

    it("should handle verbose mode", async () => {
      const loggerInfoSpy = vi.spyOn(logger, "info");
      const pruner = new Pruner({ dir: testDir, verbose: true });
      await pruner.prune();

      expect(loggerInfoSpy).toHaveBeenCalled();
      expect(loggerInfoSpy.mock.calls.some((call) => call[0].includes("Prune"))).toBe(true);

      loggerInfoSpy.mockRestore();
    });

    it("should handle errors during pruning", async () => {
      const loggerErrorSpy = vi.spyOn(logger, "error");
      const pruner = new Pruner({ dir: "/non/existent/path", verbose: true });
      const stats = await pruner.prune();

      expect(stats.filesTotal).toBe(0);
      expect(stats.filesRemoved).toBe(0);
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
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
      const loggerErrorSpy = vi.spyOn(logger, "error");
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

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error removing"),
        expect.anything(),
      );

      loggerErrorSpy.mockRestore();
    });

    it("should prune experimental files when experimental mode is enabled", async () => {
      // Create experimental files that should be pruned
      const experimentalFiles = [
        "test-package/README.md",
        "test-package/CHANGELOG.md",
        "test-package/.gitignore",
        "test-package/webpack.config.js",
        "test-package/docker-compose.yml",
        "test-package/.env.example",
        "test-package/dist/index.js",
        "test-package/.next/build-manifest.json",
      ];

      // Create the files
      for (const filePath of experimentalFiles) {
        const fullPath = path.join(testDir, filePath);
        await TestDataGenerator.createTestFile(fullPath, `Test content for ${filePath}`);
      }

      // Prune with experimental mode enabled
      const experimentalPruner = new Pruner({
        dir: testDir,
        experimental: { defaultFiles: true },
      });
      await experimentalPruner.prune();

      // Check that experimental files are removed
      for (const experimentalFile of [
        "README.md",
        "CHANGELOG.md",
        ".gitignore",
        "webpack.config.js",
      ]) {
        const fullPath = path.join(testDir, "test-package", experimentalFile);
        expect(fs.existsSync(fullPath)).toBe(false);
      }

      // Essential files should remain
      const essentialFile = path.join(testDir, "test-package", "package.json");
      expect(fs.existsSync(essentialFile)).toBe(true);
    });
  });

  describe("Dry run functionality", () => {
    it("should not remove files in dry run mode", async () => {
      const pruner = new Pruner({ dir: testDir, dryRun: true });
      const fileManager = testSuite.resources.fileManager!;

      const beforeStats = await fileManager.getDirectoryStats();
      await pruner.prune();
      const afterStats = await fileManager.getDirectoryStats();

      // Files should not be removed in dry run mode
      expect(afterStats.fileCount).toBe(beforeStats.fileCount);
      expect(afterStats.totalSize).toBe(beforeStats.totalSize);
    });

    it("should log dry run actions when verbose", async () => {
      const loggerInfoSpy = vi.spyOn(logger, "info");
      const pruner = new Pruner({ dir: testDir, dryRun: true, verbose: true });

      await pruner.prune();

      const dryRunLogs = loggerInfoSpy.mock.calls.filter((call) =>
        call[0]?.includes?.("[DRY RUN]"),
      );

      expect(dryRunLogs.length).toBeGreaterThan(0);
      loggerInfoSpy.mockRestore();
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
      const fileManager = testSuite.resources.fileManager!;

      const beforeStats = await fileManager.getDirectoryStats();
      await pruner.prune();
      const afterStats = await fileManager.getDirectoryStats();

      // Files should be removed in normal mode
      expect(afterStats.fileCount).toBeLessThan(beforeStats.fileCount);
    });
  });

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
      const loggerErrorSpy = vi.spyOn(logger, "error");
      const pruner = new Pruner({ dir: testDir, verbose: true });
      const stats: Stats = {
        filesTotal: 0,
        filesRemoved: 0,
        sizeRemoved: 0,
      };

      await pruner["walkDirectory"]("/non/existent/path", stats);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(stats.filesTotal).toBe(0);

      loggerErrorSpy.mockRestore();
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
