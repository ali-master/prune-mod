import { describe, it, expect } from "vitest";
import { getRuntime } from "../src/utils";

describe("getRuntime", () => {
  describe("Current runtime detection", () => {
    it("should detect the current runtime environment", () => {
      const runtime = getRuntime();

      // We're running tests in either Node or Bun
      expect(runtime).toBeDefined();
      expect(runtime.currentRuntime).toBeDefined();

      // Check that we're detecting either Bun or Node (the test runners we support)
      expect(["bun", "node"]).toContain(runtime.currentRuntime);

      // Exactly one runtime should be detected
      const runtimeFlags = [runtime.isBun, runtime.isDeno, runtime.isNode, runtime.isBrowser];
      const detectedRuntimes = runtimeFlags.filter(Boolean);
      expect(detectedRuntimes.length).toBe(1);
    });

    it("should correctly identify Bun runtime if running in Bun", () => {
      const runtime = getRuntime();

      // If Bun global exists, isBun should be true
      if ((globalThis as any).Bun) {
        expect(runtime.isBun).toBe(true);
        expect(runtime.currentRuntime).toBe("bun");
        expect(runtime.isNode).toBe(false);
        expect(runtime.isDeno).toBe(false);
        expect(runtime.isBrowser).toBe(false);
      }
    });

    it("should correctly identify Node.js runtime if running in Node", () => {
      const runtime = getRuntime();

      // If we're not in Bun and process.versions.node exists, we're in Node
      if (!(globalThis as any).Bun && globalThis.process?.versions?.node) {
        expect(runtime.isNode).toBe(true);
        expect(runtime.currentRuntime).toBe("node");
        expect(runtime.isBun).toBe(false);
        expect(runtime.isDeno).toBe(false);
        expect(runtime.isBrowser).toBe(false);
      }
    });
  });

  describe("Return value structure", () => {
    it("should always return an object with all expected properties", () => {
      const runtime = getRuntime();

      expect(runtime).toBeDefined();
      expect(runtime).toHaveProperty("isBun");
      expect(runtime).toHaveProperty("isDeno");
      expect(runtime).toHaveProperty("isNode");
      expect(runtime).toHaveProperty("isBrowser");
      expect(runtime).toHaveProperty("currentRuntime");
    });

    it("should return boolean values for runtime checks", () => {
      const runtime = getRuntime();

      expect(typeof runtime.isBun).toBe("boolean");
      expect(typeof runtime.isDeno).toBe("boolean");
      expect(typeof runtime.isNode).toBe("boolean");
      expect(typeof runtime.isBrowser).toBe("boolean");
    });

    it("should return a string value for currentRuntime", () => {
      const runtime = getRuntime();

      expect(typeof runtime.currentRuntime).toBe("string");
      expect(["bun", "deno", "node", "browser", "unknown"]).toContain(runtime.currentRuntime);
    });

    it("should have exactly one true runtime flag when a runtime is detected", () => {
      const runtime = getRuntime();

      const trueFlags = [runtime.isBun, runtime.isDeno, runtime.isNode, runtime.isBrowser].filter(
        Boolean,
      );

      if (runtime.currentRuntime !== "unknown") {
        expect(trueFlags.length).toBe(1);
      }
    });
  });

  describe("Runtime logic verification", () => {
    it("should check for Bun global existence", () => {
      const runtime = getRuntime();

      // Verify the logic: if Bun global exists, isBun should be true
      const hasBunGlobal = !!(globalThis as any).Bun;

      if (hasBunGlobal) {
        expect(runtime.isBun).toBe(true);
        // When Bun is detected, Node should be false even though process.versions.node exists
        expect(runtime.isNode).toBe(false);
      }
    });

    it("should check for process.versions.node for Node detection", () => {
      const runtime = getRuntime();

      const hasNodeVersion = !!globalThis.process?.versions?.node;
      const hasBunGlobal = !!(globalThis as any).Bun;

      // Node is only true if process.versions.node exists AND Bun doesn't exist
      if (hasNodeVersion && !hasBunGlobal) {
        expect(runtime.isNode).toBe(true);
      }

      // If Bun exists, Node should always be false
      if (hasBunGlobal) {
        expect(runtime.isNode).toBe(false);
      }
    });

    it("should never detect Deno in Node/Bun test environment", () => {
      const runtime = getRuntime();

      // We're not running in Deno, so this should always be false
      expect(runtime.isDeno).toBe(false);

      // Deno global should not exist in our test environment
      expect((globalThis as any).Deno).toBeUndefined();
    });

    it("should never detect browser in Node/Bun test environment", () => {
      const runtime = getRuntime();

      // We're not running in a browser, so this should always be false
      expect(runtime.isBrowser).toBe(false);

      // Window should not exist in our test environment (unless mocked)
      if (!(globalThis as any).window) {
        expect((globalThis as any).window).toBeUndefined();
      }
    });
  });

  describe("Priority and edge cases", () => {
    it("should correctly handle the current runtime environment", () => {
      const runtime = getRuntime();

      // Get actual global state
      const hasBun = !!(globalThis as any).Bun;
      const hasDeno = !!(globalThis as any).Deno;
      const hasWindow = !!(globalThis as any).window;
      const hasNodeProcess = !!globalThis.process?.versions?.node;

      // Test priority logic based on actual globals
      if (hasBun) {
        expect(runtime.currentRuntime).toBe("bun");
        expect(runtime.isBun).toBe(true);
      } else if (hasDeno) {
        expect(runtime.currentRuntime).toBe("deno");
        expect(runtime.isDeno).toBe(true);
      } else if (hasNodeProcess) {
        expect(runtime.currentRuntime).toBe("node");
        expect(runtime.isNode).toBe(true);
      } else if (hasWindow) {
        expect(runtime.currentRuntime).toBe("browser");
        expect(runtime.isBrowser).toBe(true);
      } else {
        expect(runtime.currentRuntime).toBe("unknown");
      }
    });

    it("should handle Bun's Node.js compatibility layer correctly", () => {
      const runtime = getRuntime();

      // Bun provides process.versions.node for compatibility
      // but should still be detected as Bun, not Node
      if ((globalThis as any).Bun) {
        expect(runtime.isBun).toBe(true);
        expect(runtime.isNode).toBe(false);
        expect(runtime.currentRuntime).toBe("bun");

        // Bun does provide process.versions.node for compatibility
        expect(globalThis.process?.versions?.node).toBeDefined();
      }
    });
  });

  describe("Type safety and consistency", () => {
    it("should return consistent types", () => {
      const runtime = getRuntime();

      // All boolean flags should be actual booleans
      expect([true, false]).toContain(runtime.isBun);
      expect([true, false]).toContain(runtime.isDeno);
      expect([true, false]).toContain(runtime.isNode);
      expect([true, false]).toContain(runtime.isBrowser);

      // currentRuntime should be one of the expected values
      const validRuntimes = ["bun", "deno", "node", "browser", "unknown"];
      expect(validRuntimes).toContain(runtime.currentRuntime);
    });

    it("should match currentRuntime with the corresponding boolean flag", () => {
      const runtime = getRuntime();

      switch (runtime.currentRuntime) {
        case "bun":
          expect(runtime.isBun).toBe(true);
          expect([runtime.isDeno, runtime.isNode, runtime.isBrowser]).toEqual([
            false,
            false,
            false,
          ]);
          break;
        case "deno":
          expect(runtime.isDeno).toBe(true);
          expect([runtime.isBun, runtime.isNode, runtime.isBrowser]).toEqual([false, false, false]);
          break;
        case "node":
          expect(runtime.isNode).toBe(true);
          expect([runtime.isBun, runtime.isDeno, runtime.isBrowser]).toEqual([false, false, false]);
          break;
        case "browser":
          expect(runtime.isBrowser).toBe(true);
          expect([runtime.isBun, runtime.isDeno, runtime.isNode]).toEqual([false, false, false]);
          break;
        case "unknown":
          expect([runtime.isBun, runtime.isDeno, runtime.isNode, runtime.isBrowser]).toEqual([
            false,
            false,
            false,
            false,
          ]);
          break;
      }
    });
  });
});
