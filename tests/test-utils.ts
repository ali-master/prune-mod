import { vi } from "vitest";
import { spawn } from "child_process";
import { consola } from "consola";
import * as path from "path";
import * as fs from "fs";

// Common test directory paths
export const TEST_PATHS = {
  fixtures: path.join(__dirname, "fixtures", "node_modules"),
  cliPath: path.join(__dirname, "..", "dist", "node", "cli.js"),
  getTestDir: (suffix: string) => path.join(__dirname, `temp-test-${suffix}`),
} as const;

// File and directory management utilities
export class TestFileManager {
  private testDir: string;

  constructor(testDirSuffix: string = "default") {
    this.testDir = TEST_PATHS.getTestDir(testDirSuffix);
  }

  get testDirectory() {
    return this.testDir;
  }

  async setupTestDirectory(): Promise<void> {
    await fs.promises.cp(TEST_PATHS.fixtures, this.testDir, { recursive: true });
  }

  async cleanupTestDirectory(): Promise<void> {
    try {
      await this.fixPermissions(this.testDir);
      const exists = await this.fileExists(this.testDir);
      if (exists) {
        await fs.promises.rm(this.testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors - the OS will clean up temp files
    }
  }

  private async fixPermissions(dir: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(dir);
      if (stats.isDirectory()) {
        await fs.promises.chmod(dir, 0o755);
        const items = await fs.promises.readdir(dir);
        for (const item of items) {
          await this.fixPermissions(path.join(dir, item));
        }
      } else {
        await fs.promises.chmod(dir, 0o644);
      }
    } catch {
      // Ignore chmod errors
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getDirectoryStats(): Promise<{ fileCount: number; totalSize: number }> {
    let fileCount = 0;
    let totalSize = 0;

    const walk = async (currentDir: string): Promise<void> => {
      try {
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
      } catch {
        // Ignore errors
      }
    };

    await walk(this.testDir);
    return { fileCount, totalSize };
  }
}

// CLI testing utilities
export interface CLIResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export class CLITestRunner {
  async runCLI(args: string[] = [], timeout: number = 5000): Promise<CLIResult> {
    return new Promise((resolve) => {
      const child = spawn("node", [TEST_PATHS.cliPath, ...args], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let resolved = false;

      const timeoutHandler = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          child.kill("SIGTERM");
          resolve({ stdout: "", stderr: "Timeout after 5s", code: 1 });
        }
      }, timeout);

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandler);
          resolve({ stdout, stderr, code });
        }
      });

      child.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandler);
          resolve({ stdout, stderr: err.message, code: 1 });
        }
      });
    });
  }
}

// Console mock utilities
export class ConsolaMockManager {
  private mocks: Map<string, ReturnType<typeof vi.spyOn>> = new Map();

  mockConsola(): void {
    consola.mockTypes(() => vi.fn());
  }

  spyOnMethod(method: keyof typeof consola): ReturnType<typeof vi.spyOn> {
    const spy = vi.spyOn(consola, method);
    this.mocks.set(method as string, spy);
    return spy;
  }

  restoreAll(): void {
    this.mocks.forEach((spy) => spy.mockRestore());
    this.mocks.clear();
    vi.clearAllMocks();
  }

  restoreMethod(method: keyof typeof consola): void {
    const spy = this.mocks.get(method as string);
    if (spy) {
      spy.mockRestore();
      this.mocks.delete(method as string);
    }
  }
}

// Test data generators
export class TestDataGenerator {
  static createMockDirent(name: string, isDirectory: boolean = false): fs.Dirent {
    return {
      name,
      isDirectory: () => isDirectory,
      isFile: () => !isDirectory,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as fs.Dirent;
  }

  static async createTestFile(filePath: string, content: string = "test content"): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content);
  }

  static async createTestDirectory(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

// Assertion helpers
export class TestAssertions {
  static async expectFileToExist(filePath: string): Promise<void> {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      throw new Error(`Expected file to exist: ${filePath}`);
    }
  }

  static async expectFileNotToExist(filePath: string): Promise<void> {
    try {
      await fs.promises.access(filePath);
      throw new Error(`Expected file not to exist: ${filePath}`);
    } catch {
      // File doesn't exist, which is what we expect
    }
  }

  static expectArrayToContainItems<T>(array: T[], items: T[]): void {
    for (const item of items) {
      if (!array.includes(item)) {
        throw new Error(`Expected array to contain: ${item}`);
      }
    }
  }

  static expectStringToContainPatterns(str: string, patterns: (string | RegExp)[]): void {
    for (const pattern of patterns) {
      if (typeof pattern === "string") {
        if (!str.includes(pattern)) {
          throw new Error(`Expected string to contain: ${pattern}`);
        }
      } else {
        if (!pattern.test(str)) {
          throw new Error(`Expected string to match pattern: ${pattern}`);
        }
      }
    }
  }
}

// Common test setup and teardown
export function createTestSuite<T = any>(
  suiteName: string,
  options: {
    fileManager?: boolean;
    consolaMock?: boolean;
    cliRunner?: boolean;
  } = {},
) {
  const resources: {
    fileManager?: TestFileManager;
    consolaMock?: ConsolaMockManager;
    cliRunner?: CLITestRunner;
  } = {};

  const setup = async (testId: string = "default") => {
    if (options.fileManager) {
      resources.fileManager = new TestFileManager(testId);
      await resources.fileManager.setupTestDirectory();
    }

    if (options.consolaMock) {
      resources.consolaMock = new ConsolaMockManager();
      resources.consolaMock.mockConsola();
    }

    if (options.cliRunner) {
      resources.cliRunner = new CLITestRunner();
    }

    return resources;
  };

  const teardown = async () => {
    if (resources.fileManager) {
      await resources.fileManager.cleanupTestDirectory();
    }

    if (resources.consolaMock) {
      resources.consolaMock.restoreAll();
    }
  };

  return { setup, teardown, resources };
}

// Common test patterns
export const TEST_PATTERNS = {
  // File existence patterns
  async verifyFilesRemoved(testDir: string, filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      const fullPath = path.join(testDir, filePath);
      await TestAssertions.expectFileNotToExist(fullPath);
    }
  },

  async verifyFilesKept(testDir: string, filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      const fullPath = path.join(testDir, filePath);
      await TestAssertions.expectFileToExist(fullPath);
    }
  },

  // Console output patterns
  verifyConsoleOutput(spy: ReturnType<typeof vi.spyOn>, expectedPatterns: string[]): void {
    TestAssertions.expectStringToContainPatterns(
      spy.mock.calls.map((call) => call.join(" ")).join(" "),
      expectedPatterns,
    );
  },

  // CLI output patterns
  verifyCLIOutput(result: CLIResult, expectedPatterns: (string | RegExp)[]): void {
    TestAssertions.expectStringToContainPatterns(result.stdout, expectedPatterns);
  },

  // Stats validation patterns
  validateStats(
    stats: any,
    expectations: {
      filesTotal?: number | "greater-than-zero";
      filesRemoved?: number | "greater-than-zero";
      sizeRemoved?: number | "greater-than-zero";
    },
  ): void {
    Object.entries(expectations).forEach(([key, expected]) => {
      const actual = stats[key];
      if (expected === "greater-than-zero") {
        if (actual <= 0) {
          throw new Error(`Expected ${key} to be greater than zero, got ${actual}`);
        }
      } else if (typeof expected === "number") {
        if (actual !== expected) {
          throw new Error(`Expected ${key} to be ${expected}, got ${actual}`);
        }
      }
    });
  },
} as const;

// Export commonly used constants
export const COMMON_TEST_FILES = {
  README: "README.md",
  LICENSE: "LICENSE",
  PACKAGE_JSON: "package.json",
  INDEX_JS: "index.js",
  ESLINTRC: ".eslintrc",
  PRETTIERRC: ".prettierrc",
} as const;

export const COMMON_TEST_DIRS = {
  TEST: "test",
  TESTS: "tests",
  DOCS: "docs",
  EXAMPLES: "examples",
  COVERAGE: "coverage",
} as const;
