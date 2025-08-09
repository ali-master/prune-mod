import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { WorkspaceDetector, WorkspaceType, WorkspaceInfo } from "../src/workspace";
import { createTestSuite } from "./test-utils";

describe("WorkspaceDetector", () => {
  const testSuite = createTestSuite("WorkspaceDetector", {
    fileManager: true,
    loggerMock: true,
  });
  let testDir: string;
  let detector: WorkspaceDetector;

  beforeEach(async () => {
    const { fileManager } = await testSuite.setup("workspace-test");
    testDir = fileManager!.testDirectory;
    detector = new WorkspaceDetector();
  });

  afterEach(async () => {
    detector.clearCache();
    await testSuite.teardown();
  });

  describe("detect", () => {
    it("should detect no workspace for regular projects", async () => {
      // Create a simple package.json without workspaces
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "simple-project", version: "1.0.0" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.None);
      expect(info.root).toBe(testDir);
      expect(info.packages).toEqual([]);
    });

    it("should cache detection results", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", version: "1.0.0" }),
      );

      const info1 = await detector.detect(testDir);
      const info2 = await detector.detect(testDir);
      expect(info1).toBe(info2); // Same object reference
    });

    it("should clear cache properly", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", version: "1.0.0" }),
      );

      const info1 = await detector.detect(testDir);
      detector.clearCache();
      const info2 = await detector.detect(testDir);
      expect(info1).not.toBe(info2); // Different object reference
    });
  });

  describe("npm workspaces", () => {
    it("should detect npm workspaces", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "npm-workspace",
          workspaces: ["packages/*"],
        }),
      );

      // Create package directories
      await fs.promises.mkdir(path.join(testDir, "packages", "pkg-a"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "packages", "pkg-b"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "pkg-a", "package.json"),
        JSON.stringify({ name: "pkg-a" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "packages", "pkg-b", "package.json"),
        JSON.stringify({ name: "pkg-b" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Npm);
      expect(info.root).toBe(testDir);
      expect(info.packages).toHaveLength(2);
      expect(info.packages).toContain(path.join(testDir, "packages", "pkg-a"));
      expect(info.packages).toContain(path.join(testDir, "packages", "pkg-b"));
    });

    it("should handle workspaces object format", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "npm-workspace",
          workspaces: {
            packages: ["apps/*", "libs/*"],
          },
        }),
      );

      // Create directories
      await fs.promises.mkdir(path.join(testDir, "apps", "app1"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "libs", "lib1"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "app1", "package.json"),
        JSON.stringify({ name: "app1" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "libs", "lib1", "package.json"),
        JSON.stringify({ name: "lib1" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Npm);
      expect(info.packages).toHaveLength(2);
    });
  });

  describe("yarn workspaces", () => {
    it("should detect yarn workspaces", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "yarn-workspace",
          workspaces: ["packages/*"],
        }),
      );
      // yarn.lock file indicates Yarn
      await fs.promises.writeFile(path.join(testDir, "yarn.lock"), "");

      // Create package directories
      await fs.promises.mkdir(path.join(testDir, "packages", "pkg-a"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "pkg-a", "package.json"),
        JSON.stringify({ name: "pkg-a" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Yarn);
      expect(info.root).toBe(testDir);
      expect(info.packages).toHaveLength(1);
    });
  });

  describe("pnpm workspaces", () => {
    it("should detect pnpm workspaces with yaml file", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "pnpm-workspace.yaml"),
        `packages:
  - 'packages/*'
  - 'apps/**'`,
      );

      // Create package directories
      await fs.promises.mkdir(path.join(testDir, "packages", "pkg-a"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "apps", "frontend"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "pkg-a", "package.json"),
        JSON.stringify({ name: "pkg-a" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "apps", "frontend", "package.json"),
        JSON.stringify({ name: "frontend" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Pnpm);
      expect(info.root).toBe(testDir);
      expect(info.packages).toHaveLength(2);
    });

    it("should detect pnpm workspaces with yml file", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "pnpm-workspace.yml"),
        `packages:
  - packages/*`,
      );

      await fs.promises.mkdir(path.join(testDir, "packages", "test"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "test", "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Pnpm);
    });
  });

  describe("lerna workspaces", () => {
    it("should detect lerna workspaces", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "lerna.json"),
        JSON.stringify({
          version: "1.0.0",
          packages: ["packages/*"],
        }),
      );

      // Create package
      await fs.promises.mkdir(path.join(testDir, "packages", "core"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "core", "package.json"),
        JSON.stringify({ name: "@monorepo/core" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Lerna);
      expect(info.root).toBe(testDir);
      expect(info.packages).toHaveLength(1);
      expect(info.hoistedNodeModules).toBe(path.join(testDir, "node_modules"));
    });

    it("should use default packages pattern if not specified", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "lerna.json"),
        JSON.stringify({ version: "1.0.0" }),
      );

      // Create default packages directory
      await fs.promises.mkdir(path.join(testDir, "packages", "util"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "packages", "util", "package.json"),
        JSON.stringify({ name: "util" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Lerna);
      expect(info.packages).toHaveLength(1);
    });
  });

  describe("nx workspaces", () => {
    it("should detect nx with workspace.json", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "workspace.json"),
        JSON.stringify({
          version: 2,
          projects: {
            app1: "apps/app1",
            lib1: { root: "libs/lib1" },
          },
        }),
      );
      await fs.promises.writeFile(path.join(testDir, "nx.json"), "{}");

      // Create project directories
      await fs.promises.mkdir(path.join(testDir, "apps", "app1"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "libs", "lib1"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "app1", "package.json"),
        JSON.stringify({ name: "app1" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "libs", "lib1", "package.json"),
        JSON.stringify({ name: "lib1" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Nx);
      expect(info.packages).toHaveLength(2);
    });

    it("should detect nx with inferred projects", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(path.join(testDir, "nx.json"), "{}");

      // Create standard Nx directories
      await fs.promises.mkdir(path.join(testDir, "apps", "web"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "libs", "shared"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "web", "package.json"),
        JSON.stringify({ name: "web" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "libs", "shared", "package.json"),
        JSON.stringify({ name: "shared" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Nx);
      expect(info.packages).toHaveLength(2);
    });
  });

  describe("turbo workspaces", () => {
    it("should detect turbo with turbo.json and npm workspaces", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
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
          name: "turbo-monorepo",
          workspaces: ["apps/*", "packages/*"],
        }),
      );

      // Create apps and packages
      await fs.promises.mkdir(path.join(testDir, "apps", "web"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "packages", "ui"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "web", "package.json"),
        JSON.stringify({ name: "web" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "packages", "ui", "package.json"),
        JSON.stringify({ name: "@turbo/ui" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Turbo);
      expect(info.packages).toHaveLength(2);
      expect(info.packages).toContain(path.join(testDir, "apps", "web"));
      expect(info.packages).toContain(path.join(testDir, "packages", "ui"));
    });

    it("should detect turbo with pnpm workspaces", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(path.join(testDir, "turbo.json"), "{}");
      await fs.promises.writeFile(
        path.join(testDir, "pnpm-workspace.yaml"),
        `packages:
  - 'apps/*'
  - 'packages/*'`,
      );

      await fs.promises.mkdir(path.join(testDir, "apps", "api"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "api", "package.json"),
        JSON.stringify({ name: "api" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Turbo);
      expect(info.packages).toHaveLength(1);
    });

    it("should use default turbo conventions when no workspace config", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(path.join(testDir, "turbo.json"), "{}");

      // Create default structure
      await fs.promises.mkdir(path.join(testDir, "apps", "mobile"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "packages", "core"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "mobile", "package.json"),
        JSON.stringify({ name: "mobile" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "packages", "core", "package.json"),
        JSON.stringify({ name: "core" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Turbo);
      expect(info.packages).toHaveLength(2);
    });
  });

  describe("rush workspaces", () => {
    it("should detect rush workspaces", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "rush.json"),
        JSON.stringify({
          rushVersion: "5.0.0",
          projects: [
            { packageName: "app", projectFolder: "apps/app" },
            { packageName: "lib", projectFolder: "libraries/lib" },
          ],
        }),
      );

      // Create project directories
      await fs.promises.mkdir(path.join(testDir, "apps", "app"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "libraries", "lib"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "apps", "app", "package.json"),
        JSON.stringify({ name: "app" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "libraries", "lib", "package.json"),
        JSON.stringify({ name: "lib" }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Rush);
      expect(info.packages).toHaveLength(2);
      expect(info.packages).toContain(path.join(testDir, "apps", "app"));
      expect(info.packages).toContain(path.join(testDir, "libraries", "lib"));
    });
  });

  describe("findWorkspaceRoot", () => {
    it("should find workspace root from nested directory", async () => {
      // Create workspace root
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "pnpm-workspace.yaml"),
        "packages:\n  - packages/*",
      );

      // Create nested directory
      const nestedDir = path.join(testDir, "packages", "nested", "deep");
      await fs.promises.mkdir(nestedDir, { recursive: true });

      const info = await detector.detect(nestedDir);
      expect(info.type).toBe(WorkspaceType.Pnpm);
      expect(info.root).toBe(testDir);
    });

    it("should return None type when no workspace found", async () => {
      const isolatedDir = path.join(testDir, "isolated");
      await fs.promises.mkdir(isolatedDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(isolatedDir, "package.json"),
        JSON.stringify({ name: "isolated" }),
      );

      const info = await detector.detect(isolatedDir);
      expect(info.type).toBe(WorkspaceType.None);
      expect(info.root).toBe(isolatedDir);
    });
  });

  describe("resolveWorkspacePatterns", () => {
    it("should handle direct paths", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          workspaces: ["specific-package"],
        }),
      );

      await fs.promises.mkdir(path.join(testDir, "specific-package"), { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "specific-package", "package.json"),
        JSON.stringify({ name: "specific" }),
      );

      const info = await detector.detect(testDir);
      expect(info.packages).toHaveLength(1);
      expect(info.packages[0]).toBe(path.join(testDir, "specific-package"));
    });

    it("should handle glob patterns", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          workspaces: ["packages/*", "apps/*"],
        }),
      );

      // Create multiple matching directories
      await fs.promises.mkdir(path.join(testDir, "packages", "a"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "packages", "b"), { recursive: true });
      await fs.promises.mkdir(path.join(testDir, "apps", "web"), { recursive: true });

      // Create package.json files
      await fs.promises.writeFile(
        path.join(testDir, "packages", "a", "package.json"),
        JSON.stringify({ name: "a" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "packages", "b", "package.json"),
        JSON.stringify({ name: "b" }),
      );
      await fs.promises.writeFile(
        path.join(testDir, "apps", "web", "package.json"),
        JSON.stringify({ name: "web" }),
      );

      // Create non-package directory (should be ignored)
      await fs.promises.mkdir(path.join(testDir, "packages", "not-a-package"), { recursive: true });

      const info = await detector.detect(testDir);
      expect(info.packages).toHaveLength(3);
      expect(info.packages).toContain(path.join(testDir, "packages", "a"));
      expect(info.packages).toContain(path.join(testDir, "packages", "b"));
      expect(info.packages).toContain(path.join(testDir, "apps", "web"));
      expect(info.packages).not.toContain(path.join(testDir, "packages", "not-a-package"));
    });

    it("should handle missing directories gracefully", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          workspaces: ["non-existent/*", "also-missing"],
        }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Npm);
      expect(info.packages).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle invalid JSON gracefully", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(path.join(testDir, "package.json"), "{ invalid json");

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.None);
    });

    it("should handle empty workspace patterns", async () => {
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          workspaces: [],
        }),
      );

      const info = await detector.detect(testDir);
      expect(info.packages).toHaveLength(0);
    });

    it("should handle nested workspaces", async () => {
      // Create root workspace
      await fs.promises.mkdir(testDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "root",
          workspaces: ["packages/*"],
        }),
      );

      // Create a package that is also a workspace
      const nestedWorkspace = path.join(testDir, "packages", "nested");
      await fs.promises.mkdir(nestedWorkspace, { recursive: true });
      await fs.promises.writeFile(
        path.join(nestedWorkspace, "package.json"),
        JSON.stringify({
          name: "nested",
          workspaces: ["sub-packages/*"],
        }),
      );

      const info = await detector.detect(testDir);
      expect(info.type).toBe(WorkspaceType.Npm);
      expect(info.packages).toContain(nestedWorkspace);
    });
  });
});
