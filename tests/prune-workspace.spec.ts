import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { Pruner } from "../src/prune";
import { createTestSuite } from "./test-utils";

describe("Pruner - Workspace Mode", () => {
  const testSuite = createTestSuite("PrunerWorkspace", {
    fileManager: true,
    loggerMock: true,
  });
  let testDir: string;

  beforeEach(async () => {
    const { fileManager } = await testSuite.setup("pruner-workspace-test");
    testDir = fileManager!.testDirectory;
  });

  afterEach(async () => {
    await testSuite.teardown();
  });

  async function createWorkspaceStructure(type: "npm" | "yarn" | "pnpm" | "lerna" | "turbo") {
    // Create root workspace
    await fs.promises.mkdir(testDir, { recursive: true });

    // Create root node_modules with test files
    const rootNodeModules = path.join(testDir, "node_modules");
    await fs.promises.mkdir(path.join(rootNodeModules, "lodash", "docs"), { recursive: true });
    await fs.promises.writeFile(path.join(rootNodeModules, "lodash", "README.md"), "Lodash readme");
    await fs.promises.writeFile(
      path.join(rootNodeModules, "lodash", "index.js"),
      "module.exports = {}",
    );
    await fs.promises.writeFile(
      path.join(rootNodeModules, "lodash", "package.json"),
      JSON.stringify({ name: "lodash", main: "index.js" }),
    );

    // Create packages
    const packagesDir = path.join(testDir, "packages");
    await fs.promises.mkdir(packagesDir, { recursive: true });

    // Package A with node_modules
    const pkgA = path.join(packagesDir, "pkg-a");
    await fs.promises.mkdir(path.join(pkgA, "node_modules", "express", "test"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(pkgA, "package.json"),
      JSON.stringify({ name: "@workspace/pkg-a" }),
    );
    await fs.promises.writeFile(
      path.join(pkgA, "node_modules", "express", "package.json"),
      JSON.stringify({ name: "express", main: "index.js" }),
    );
    await fs.promises.writeFile(
      path.join(pkgA, "node_modules", "express", "index.js"),
      "// express",
    );
    await fs.promises.writeFile(
      path.join(pkgA, "node_modules", "express", "README.md"),
      "Express readme",
    );
    await fs.promises.writeFile(
      path.join(pkgA, "node_modules", "express", "test", "test.js"),
      "// test",
    );

    // Package B with node_modules
    const pkgB = path.join(packagesDir, "pkg-b");
    await fs.promises.mkdir(path.join(pkgB, "node_modules", "react", ".github"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(pkgB, "package.json"),
      JSON.stringify({ name: "@workspace/pkg-b" }),
    );
    await fs.promises.writeFile(
      path.join(pkgB, "node_modules", "react", "package.json"),
      JSON.stringify({ name: "react", main: "index.js" }),
    );
    await fs.promises.writeFile(path.join(pkgB, "node_modules", "react", "index.js"), "// react");
    await fs.promises.writeFile(
      path.join(pkgB, "node_modules", "react", "CHANGELOG.md"),
      "Changelog",
    );

    // Configure workspace based on type
    switch (type) {
      case "npm":
        await fs.promises.writeFile(
          path.join(testDir, "package.json"),
          JSON.stringify({
            name: "test-workspace",
            workspaces: ["packages/*"],
          }),
        );
        break;
      case "yarn":
        await fs.promises.writeFile(
          path.join(testDir, "package.json"),
          JSON.stringify({
            name: "test-workspace",
            workspaces: ["packages/*"],
          }),
        );
        await fs.promises.writeFile(path.join(testDir, "yarn.lock"), "");
        break;
      case "pnpm":
        await fs.promises.writeFile(
          path.join(testDir, "pnpm-workspace.yaml"),
          "packages:\n  - 'packages/*'",
        );
        break;
      case "lerna":
        await fs.promises.writeFile(
          path.join(testDir, "lerna.json"),
          JSON.stringify({
            version: "1.0.0",
            packages: ["packages/*"],
          }),
        );
        break;
      case "turbo":
        await fs.promises.writeFile(
          path.join(testDir, "turbo.json"),
          JSON.stringify({
            pipeline: {
              build: { dependsOn: ["^build"] },
              test: { dependsOn: ["build"] },
            },
          }),
        );
        await fs.promises.writeFile(
          path.join(testDir, "package.json"),
          JSON.stringify({
            name: "turbo-workspace",
            workspaces: ["packages/*"],
          }),
        );
        break;
    }

    return { rootNodeModules, pkgA, pkgB };
  }

  describe("workspace detection", () => {
    it("should detect and prune npm workspace", async () => {
      await createWorkspaceStructure("npm");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();

      // Should have removed files from both root and package node_modules
      expect(stats.filesRemoved).toBeGreaterThan(0);
      expect(stats.sizeRemoved).toBeGreaterThan(0);

      // Check that README files were removed
      const rootReadme = path.join(testDir, "node_modules", "lodash", "README.md");
      const pkgAReadme = path.join(
        testDir,
        "packages",
        "pkg-a",
        "node_modules",
        "express",
        "README.md",
      );
      await expect(fs.promises.access(rootReadme)).rejects.toThrow();
      await expect(fs.promises.access(pkgAReadme)).rejects.toThrow();

      // Check that main files were kept
      const rootMain = path.join(testDir, "node_modules", "lodash", "index.js");
      const pkgAMain = path.join(
        testDir,
        "packages",
        "pkg-a",
        "node_modules",
        "express",
        "index.js",
      );
      expect(
        await fs.promises
          .access(rootMain)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      expect(
        await fs.promises
          .access(pkgAMain)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
    });

    it("should detect and prune yarn workspace", async () => {
      await createWorkspaceStructure("yarn");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);

      // Test directory should be removed
      const testDir1 = path.join(testDir, "packages", "pkg-a", "node_modules", "express", "test");
      await expect(fs.promises.access(testDir1)).rejects.toThrow();
    });

    it("should detect and prune pnpm workspace", async () => {
      await createWorkspaceStructure("pnpm");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);

      // Check .github directory was removed
      const githubDir = path.join(testDir, "packages", "pkg-b", "node_modules", "react", ".github");
      await expect(fs.promises.access(githubDir)).rejects.toThrow();
    });

    it("should detect and prune lerna workspace", async () => {
      await createWorkspaceStructure("lerna");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);

      // CHANGELOG should be removed
      const changelog = path.join(
        testDir,
        "packages",
        "pkg-b",
        "node_modules",
        "react",
        "CHANGELOG.md",
      );
      await expect(fs.promises.access(changelog)).rejects.toThrow();
    });

    it("should detect and prune turbo workspace", async () => {
      await createWorkspaceStructure("turbo");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);
      expect(stats.sizeBefore).toBeGreaterThan(0);
      expect(stats.sizeAfter).toBeLessThan(stats.sizeBefore);

      // Test files should be removed
      const testDir1 = path.join(testDir, "packages", "pkg-a", "node_modules", "express", "test");
      await expect(fs.promises.access(testDir1)).rejects.toThrow();
    });
  });

  describe("workspace options", () => {
    it("should skip root node_modules when includeRoot is false", async () => {
      await createWorkspaceStructure("npm");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        includeRoot: false,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();

      // Root README should still exist
      const rootReadme = path.join(testDir, "node_modules", "lodash", "README.md");
      expect(
        await fs.promises
          .access(rootReadme)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);

      // Package README should be removed
      const pkgReadme = path.join(
        testDir,
        "packages",
        "pkg-a",
        "node_modules",
        "express",
        "README.md",
      );
      await expect(fs.promises.access(pkgReadme)).rejects.toThrow();
    });

    it("should use custom workspace root", async () => {
      // Create workspace in a subdirectory
      const workspaceDir = path.join(testDir, "my-workspace");
      await fs.promises.mkdir(workspaceDir, { recursive: true });

      // Move testDir temporarily
      const originalTestDir = testDir;
      testDir = workspaceDir;
      await createWorkspaceStructure("npm");
      testDir = originalTestDir;

      const pruner = new Pruner({
        dir: path.join(workspaceDir, "node_modules"),
        workspace: true,
        workspaceRoot: workspaceDir,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);
    });

    it("should handle dry-run mode", async () => {
      await createWorkspaceStructure("npm");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: true,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);

      // Files should still exist in dry-run mode
      const rootReadme = path.join(testDir, "node_modules", "lodash", "README.md");
      expect(
        await fs.promises
          .access(rootReadme)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
    });

    it("should handle verbose mode", async () => {
      await createWorkspaceStructure("npm");

      const logSpy = vi.spyOn(console, "log");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: true,
      });

      await pruner.prune();

      // Should log workspace detection and package processing
      const logs = logSpy.mock.calls.map((call) => call[0]);
      expect(logs.some((log) => log.includes("Detected"))).toBe(true);
      expect(logs.some((log) => log.includes("workspace"))).toBe(true);

      logSpy.mockRestore();
    });
  });

  describe("workspace edge cases", () => {
    it("should fall back to standard pruning when no workspace detected", async () => {
      // Create a non-workspace structure
      await fs.promises.mkdir(path.join(testDir, "node_modules", "test-pkg", "docs"), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "regular-project" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "node_modules", "test-pkg", "README.md"),
        "readme",
      );

      const pruner = new Pruner({
        dir: path.join(testDir, "node_modules"),
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThan(0);

      // Should still prune files even without workspace
      const readme = path.join(testDir, "node_modules", "test-pkg", "README.md");
      await expect(fs.promises.access(readme)).rejects.toThrow();
    });

    it("should handle missing node_modules in packages", async () => {
      // Create workspace with some packages missing node_modules
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "workspace",
          workspaces: ["packages/*"],
        }),
      );

      // Package without node_modules
      await fs.promises.mkdir(path.join(testDir, "packages", "empty"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "empty", "package.json"),
        JSON.stringify({ name: "empty" }),
      );

      // Package with node_modules
      await fs.promises.mkdir(path.join(testDir, "packages", "with-deps", "node_modules", "test"), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "with-deps", "package.json"),
        JSON.stringify({ name: "with-deps" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "packages", "with-deps", "node_modules", "test", "README.md"),
        "readme",
      );

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      // Should not throw even with missing node_modules
      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThanOrEqual(1);
    });

    it("should handle workspace with no packages", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "empty-workspace",
          workspaces: [],
        }),
      );

      // Only root node_modules
      await fs.promises.mkdir(path.join(testDir, "node_modules", "pkg"), { recursive: true });
      await fs.promises.writeFile(path.join(testDir, "node_modules", "pkg", "README.md"), "readme");

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThanOrEqual(1);
    });

    it("should handle deeply nested workspace structures", async () => {
      // Create multi-level workspace
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "root",
          workspaces: ["apps/*", "packages/*", "tools/*"],
        }),
      );

      // Create various nested structures
      const dirs = [
        "apps/frontend/node_modules/react",
        "apps/backend/node_modules/express",
        "packages/shared/node_modules/lodash",
        "tools/cli/node_modules/commander",
      ];

      for (const dir of dirs) {
        const fullPath = path.join(testDir, dir);
        await fs.promises.mkdir(fullPath, { recursive: true });
        await fs.promises.writeFile(path.join(fullPath, "README.md"), "readme");

        // Add package.json to each workspace package
        const pkgDir = path.dirname(path.dirname(fullPath));
        const pkgJsonPath = path.join(pkgDir, "package.json");
        if (
          !(await fs.promises
            .access(pkgJsonPath)
            .then(() => true)
            .catch(() => false))
        ) {
          await fs.promises.writeFile(pkgJsonPath, JSON.stringify({ name: path.basename(pkgDir) }));
        }
      }

      const pruner = new Pruner({
        dir: testDir,
        workspace: true,
        dryRun: false,
        verbose: false,
      });

      const stats = await pruner.prune();
      expect(stats.filesRemoved).toBeGreaterThanOrEqual(4);

      // All READMEs should be removed
      for (const dir of dirs) {
        const readme = path.join(testDir, dir, "README.md");
        await expect(fs.promises.access(readme)).rejects.toThrow();
      }
    });
  });
});
