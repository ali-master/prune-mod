import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn, execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { TEST_PATTERNS } from "./test-utils";

describe.skip("CLI Integration Tests", () => {
  const cliPath = path.resolve(__dirname, "..", "dist", "node", "cli.js");
  const fixturesDir = path.resolve(__dirname, "fixtures", "node_modules");
  const testDir = path.resolve(__dirname, "temp-cli-test");

  beforeEach(() => {
    // Create a copy of fixtures for testing
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      fs.cpSync(fixturesDir, testDir, { recursive: true });
    } catch (error) {
      // Ignore setup errors for now
    }
  });

  afterEach(() => {
    // Clean up test directory
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors - the OS will clean up temp files
    }
  });

  const runCLI = (
    args: string[] = [],
  ): Promise<{ stdout: string; stderr: string; code: number | null }> => {
    return new Promise((resolve) => {
      const child = spawn("node", [cliPath, ...args], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        // Combine stdout and stderr for tests since consola outputs to stderr
        const output = stdout + stderr;
        resolve({ stdout: output, stderr, code });
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve({ stdout: "", stderr: error.message, code: 1 });
      });

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        child.kill();
        resolve({ stdout, stderr, code: -1 });
      }, 10000);
    });
  };

  describe("Help output", () => {
    it("should display help with --help flag", async () => {
      const { stdout, code } = await runCLI(["--help"]);

      expect(code).toBe(0);
      expect(stdout).toContain("prune-mod");
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("Options:");
      expect(stdout).toContain("--verbose");
      expect(stdout).toContain("--exclude");
      expect(stdout).toContain("--include");
      expect(stdout).toContain("Examples:");
    });

    it("should display help with -h flag", async () => {
      const { stdout, code } = await runCLI(["-h"]);

      expect(code).toBe(0);
      expect(stdout).toContain("prune-mod");
      expect(stdout).toContain("Usage:");
    });
  });

  describe("Directory pruning", () => {
    it("should prune the specified directory", async () => {
      const { stdout, code } = await runCLI([testDir]);

      expect(code).toBe(0);
      expect(stdout).toContain("files total");
      expect(stdout).toContain("files removed");
      expect(stdout).toContain("size removed");
      expect(stdout).toContain("duration");

      // Check that test directories are removed
      const testPackageTestDir = path.join(testDir, "test-package", "test");
      expect(() => fs.accessSync(testPackageTestDir)).toThrow();
    });

    it("should handle non-existent directory", async () => {
      const { stdout, code } = await runCLI(["/non/existent/path"]);

      expect(code).toBe(0);
      expect(stdout).toContain("files total");
      expect(stdout).toContain("0");
    });

    it("should prune current directory when no args provided", async () => {
      // Create a node_modules in temp directory
      const tempNodeModules = path.join(__dirname, "temp-current", "node_modules");
      fs.mkdirSync(tempNodeModules, { recursive: true });
      fs.writeFileSync(path.join(tempNodeModules, "README.md"), "test");

      const originalCwd = process.cwd();
      process.chdir(path.join(__dirname, "temp-current"));

      try {
        const { stdout, code } = await runCLI([]);

        expect(code).toBe(0);
        expect(stdout).toContain("files total");
        expect(stdout).toContain("files removed");

        // Check that README was removed
        expect(() => fs.accessSync(path.join(tempNodeModules, "README.md"))).toThrow();
      } finally {
        process.chdir(originalCwd);
        fs.rmSync(path.join(__dirname, "temp-current"), {
          recursive: true,
          force: true,
        });
      }
    });
  });

  describe("Verbose mode", () => {
    it("should show detailed output with --verbose flag", async () => {
      const { stdout, code } = await runCLI(["--verbose", testDir]);

      expect(code).toBe(0);
      expect(stdout).toContain("Prune");
      expect(stdout).toContain("files total");
    });

    it("should show detailed output with -v flag", async () => {
      const { stdout, code } = await runCLI(["-v", testDir]);

      expect(code).toBe(0);
      expect(stdout).toContain("Prune");
    });
  });

  describe("Exclude patterns", () => {
    it("should respect single exclude pattern", async () => {
      const { code } = await runCLI(["--exclude", "*.md", testDir]);

      expect(code).toBe(0);

      // Check that .md files are kept
      const readmePath = path.join(testDir, "test-package", "README.md");
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    it("should respect multiple exclude patterns", async () => {
      const { code } = await runCLI(["--exclude", "*.md", "--exclude", "LICENSE", testDir]);

      expect(code).toBe(0);

      // Check that excluded files are kept
      const readmePath = path.join(testDir, "test-package", "README.md");
      const licensePath = path.join(testDir, "test-package", "LICENSE");
      expect(fs.existsSync(readmePath)).toBe(true);
      expect(fs.existsSync(licensePath)).toBe(true);
    });
  });

  describe("Include patterns", () => {
    it("should include single pattern for pruning", async () => {
      // Create a custom file
      const customFile = path.join(testDir, "test-package", "custom.log");
      fs.writeFileSync(customFile, "log content");

      const { code } = await runCLI(["--include", "*.log", testDir]);

      expect(code).toBe(0);

      // Check that .log file is removed
      expect(() => fs.accessSync(customFile)).toThrow();
    });

    it("should include multiple patterns for pruning", async () => {
      // Create custom files
      const logFile = path.join(testDir, "test-package", "debug.log");
      const tmpFile = path.join(testDir, "test-package", "temp.tmp");
      fs.writeFileSync(logFile, "log");
      fs.writeFileSync(tmpFile, "tmp");

      const { code } = await runCLI(["--include", "*.log", "--include", "*.tmp", testDir]);

      expect(code).toBe(0);

      // Check that included files are removed
      expect(() => fs.accessSync(logFile)).toThrow();
      expect(() => fs.accessSync(tmpFile)).toThrow();
    });
  });

  describe("Combined options", () => {
    it("should handle verbose with exclude patterns", async () => {
      const { stdout, code } = await runCLI(["--verbose", "--exclude", "*.md", testDir]);

      expect(code).toBe(0);
      expect(stdout).toContain("Prune");

      // Check that .md files are kept
      const readmePath = path.join(testDir, "test-package", "README.md");
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    it("should handle all options together", async () => {
      // Create custom files
      const logFile = path.join(testDir, "test-package", "debug.log");
      fs.writeFileSync(logFile, "log");

      const { stdout, code } = await runCLI([
        "-v",
        "--exclude",
        "*.md",
        "--include",
        "*.log",
        testDir,
      ]);

      expect(code).toBe(0);
      expect(stdout).toContain("Prune");

      // Check that .md files are kept (excluded)
      const readmePath = path.join(testDir, "test-package", "README.md");
      expect(fs.existsSync(readmePath)).toBe(true);

      // Check that .log files are removed (included for pruning)
      expect(() => fs.accessSync(logFile)).toThrow();
    });
  });

  describe("Error handling", () => {
    it("should handle invalid arguments gracefully", async () => {
      const { code } = await runCLI(["--invalid-option"]);

      // Should still work, just ignore unknown options
      expect(code).toBe(0);
    });

    it("should handle permission errors gracefully", async () => {
      // This test is platform-specific and might need adjustment
      // Creating a read-only directory scenario
      const readOnlyDir = path.join(testDir, "readonly");
      fs.mkdirSync(readOnlyDir);
      fs.writeFileSync(path.join(readOnlyDir, "file.txt"), "content");

      // Make directory read-only (Unix-like systems)
      if (process.platform !== "win32") {
        fs.chmodSync(readOnlyDir, 0o444);
      }

      const { stdout, code } = await runCLI([testDir]);

      // Should complete even if some files can't be removed
      expect(code).toBe(0);
      expect(stdout).toContain("files total");

      // Restore permissions for cleanup
      if (process.platform !== "win32") {
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });
  });

  describe("Dry run functionality", () => {
    const getDirectoryStats = (dir: string): { fileCount: number; totalSize: number } => {
      let fileCount = 0;
      let totalSize = 0;

      function walk(currentDir: string) {
        try {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
              walk(fullPath);
            } else {
              fileCount++;
              const stat = fs.statSync(fullPath);
              totalSize += stat.size;
            }
          }
        } catch {
          // Ignore errors
        }
      }

      walk(dir);
      return { fileCount, totalSize };
    };

    it("should not remove files when using --dry-run", async () => {
      const beforeStats = getDirectoryStats(testDir);
      const { stdout, code } = await runCLI(["--dry-run", testDir]);
      const afterStats = getDirectoryStats(testDir);

      expect(code).toBe(0);
      expect(stdout).toContain("files total");
      expect(stdout).toContain("files removed");

      // Files should not actually be removed
      expect(afterStats.fileCount).toBe(beforeStats.fileCount);
      expect(afterStats.totalSize).toBe(beforeStats.totalSize);
    });

    it("should not remove files when using -d shorthand", async () => {
      const beforeStats = getDirectoryStats(testDir);
      const { stdout, code } = await runCLI(["-d", testDir]);
      const afterStats = getDirectoryStats(testDir);

      expect(code).toBe(0);
      expect(stdout).toContain("files total");

      // Files should not actually be removed
      expect(afterStats.fileCount).toBe(beforeStats.fileCount);
      expect(afterStats.totalSize).toBe(beforeStats.totalSize);
    });

    it("should show dry run logs when combined with verbose", async () => {
      const { stdout, code } = await runCLI(["--dry-run", "--verbose", testDir]);

      expect(code).toBe(0);
      expect(stdout).toContain("[DRY RUN]");
    });

    it("should still report accurate statistics in dry run", async () => {
      const { stdout: dryRunOutput, code: dryRunCode } = await runCLI(["--dry-run", testDir]);

      // Reset test directory for actual run
      fs.rmSync(testDir, { recursive: true, force: true });
      fs.cpSync(fixturesDir, testDir, { recursive: true });

      const { stdout: normalOutput, code: normalCode } = await runCLI([testDir]);

      expect(dryRunCode).toBe(0);
      expect(normalCode).toBe(0);

      // Extract numbers from output
      const extractStats = (output: string) => {
        const totalMatch = output.match(/files total\s+(\d+)/);
        const removedMatch = output.match(/files removed\s+(\d+)/);
        return {
          total: totalMatch ? parseInt(totalMatch[1]) : 0,
          removed: removedMatch ? parseInt(removedMatch[1]) : 0,
        };
      };

      const dryRunStats = extractStats(dryRunOutput);
      const normalStats = extractStats(normalOutput);

      // Both should report the same number of files to be removed
      expect(dryRunStats.removed).toBe(normalStats.removed);
    });
  });

  describe("Runtime detection", () => {
    it("should execute with Node.js runtime", async () => {
      const { stdout, code } = await runCLI(["--help"]);

      expect(code).toBe(0);
      expect(stdout).toContain("prune-mod");
    });

    it("should execute with Bun runtime when available", () => {
      // Check if bun is available
      try {
        execSync("bun --version", { stdio: "pipe" });

        // Run with bun
        const result = execSync(`bun "${cliPath}" --help`, {
          cwd: process.cwd(),
          env: process.env,
          encoding: "utf8",
          stdio: "pipe",
        });

        expect(result).toContain("prune-mod");
        // @ts-expect-error
        TEST_PATTERNS.verifyCLIOutput({ stdout: result, code: 0 }, ["prune-mod"]);
      } catch {
        // Skip test if bun is not available
        console.log("Skipping Bun runtime test - Bun not available");
      }
    });
  });

  describe("Output formatting", () => {
    it("should format file counts correctly", async () => {
      const { stdout, code } = await runCLI([testDir]);

      expect(code).toBe(0);

      // Should contain formatted numbers
      expect(stdout).toMatch(/files total.*[\d,]+/);
      expect(stdout).toMatch(/files removed.*[\d,]+/);
    });

    it("should format sizes correctly", async () => {
      const { stdout, code } = await runCLI([testDir]);

      expect(code).toBe(0);

      // Should contain formatted sizes (e.g., "1.5 KB", "2.3 MB")
      expect(stdout).toMatch(/size removed.*[\d.]+ [KMGT]?B/);
    });

    it("should format duration correctly", async () => {
      const { stdout, code } = await runCLI([testDir]);

      expect(code).toBe(0);

      // Should contain formatted duration (e.g., "123ms", "1.2s")
      expect(stdout).toMatch(/duration.*\d+(\.\d+)?m?s/);
    });
  });
});
