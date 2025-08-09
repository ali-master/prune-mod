import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatBytes, formatNumber, formatDuration, output } from "../src/utils";

describe("Utils", () => {
  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0.0 B");
      expect(formatBytes(100)).toBe("100.0 B");
      expect(formatBytes(1023)).toBe("1023.0 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(2048)).toBe("2.0 KB");
      expect(formatBytes(1024 * 1023)).toBe("1023.0 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(1024 * 1024 * 1.5)).toBe("1.5 MB");
      expect(formatBytes(1024 * 1024 * 10)).toBe("10.0 MB");
      expect(formatBytes(1024 * 1024 * 1023)).toBe("1023.0 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe("2.5 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 100)).toBe("100.0 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 1023)).toBe("1023.0 GB");
    });

    it("should format terabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB");
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 5)).toBe("5.0 TB");
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 10.5)).toBe("10.5 TB");
    });

    it("should handle maximum unit (TB) for very large values", () => {
      const petabyte = 1024 * 1024 * 1024 * 1024 * 1024;
      expect(formatBytes(petabyte)).toBe("1024.0 TB");
      expect(formatBytes(petabyte * 10)).toBe("10240.0 TB");
    });

    it("should handle edge cases", () => {
      expect(formatBytes(1)).toBe("1.0 B");
      expect(formatBytes(1023.99)).toBe("1024.0 B");
      expect(formatBytes(1024.01)).toBe("1.0 KB");
    });

    it("should round to 1 decimal place", () => {
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1536.512)).toBe("1.5 KB");
      expect(formatBytes(1587.2)).toBe("1.6 KB"); // 1587.2 / 1024 = 1.55
      expect(formatBytes(1638.4)).toBe("1.6 KB");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with locale separators", () => {
      const result = formatNumber(1000);
      expect(result).toMatch(/1,000|1.000|1 000/); // Different locales use different separators
    });

    it("should handle small numbers", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(1)).toBe("1");
      expect(formatNumber(99)).toBe("99");
      expect(formatNumber(999)).toBe("999");
    });

    it("should handle large numbers", () => {
      const million = formatNumber(1000000);
      expect(million).toMatch(/1,000,000|1.000.000|1 000 000/);

      const billion = formatNumber(1000000000);
      expect(billion).toMatch(/1,000,000,000|1.000.000.000|1 000 000 000/);
    });

    it("should handle negative numbers", () => {
      const result = formatNumber(-1000);
      expect(result).toMatch(/-1,000|-1.000|-1 000/);
    });

    it("should handle decimal numbers", () => {
      const result = formatNumber(1234.56);
      expect(result).toMatch(/1,234\.56|1.234,56|1 234,56/);
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(1)).toBe("1ms");
      expect(formatDuration(100)).toBe("100ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("should format seconds", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(2000)).toBe("2.0s");
      expect(formatDuration(59999)).toBe("60.0s");
    });

    it("should format minutes", () => {
      expect(formatDuration(60000)).toBe("1.0m");
      expect(formatDuration(90000)).toBe("1.5m");
      expect(formatDuration(120000)).toBe("2.0m");
      expect(formatDuration(3600000)).toBe("60.0m");
    });

    it("should handle edge cases between units", () => {
      expect(formatDuration(999)).toBe("999ms");
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(59999)).toBe("60.0s");
      expect(formatDuration(60000)).toBe("1.0m");
    });

    it("should round to 1 decimal place for seconds and minutes", () => {
      expect(formatDuration(1234)).toBe("1.2s");
      expect(formatDuration(1567)).toBe("1.6s");
      expect(formatDuration(61234)).toBe("1.0m");
      expect(formatDuration(93456)).toBe("1.6m");
    });

    it("should handle very large durations", () => {
      expect(formatDuration(7200000)).toBe("120.0m"); // 2 hours
      expect(formatDuration(86400000)).toBe("1440.0m"); // 24 hours
    });
  });

  describe("output", () => {
    let consolaSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      const consola = (await import("consola")).consola;
      consolaSpy = vi.spyOn(consola, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consolaSpy.mockRestore();
    });

    it("should format output with padded name and value", () => {
      output("Test", "Value");

      expect(consolaSpy).toHaveBeenCalledOnce();
      const call = consolaSpy.mock.calls[0][0];

      // Check for content with new format (name: value)
      expect(call).toContain("Test");
      expect(call).toContain("Value");
      expect(call).toContain(":");
    });

    it("should pad name to 20 characters", () => {
      output("Short", "Value");

      const call = consolaSpy.mock.calls[0][0];
      // "Short" padded to 20 chars should have 15 leading spaces before the colon
      expect(call).toMatch(/\s{15}Short:/);
    });

    it("should handle long names", () => {
      output("VeryLongNameThatExceedsTwentyChars", "Value");

      expect(consolaSpy).toHaveBeenCalledOnce();
      const call = consolaSpy.mock.calls[0][0];
      expect(call).toContain("VeryLongNameThatExceedsTwentyChars");
      expect(call).toContain("Value");
    });

    it("should handle empty strings", () => {
      output("", "");

      expect(consolaSpy).toHaveBeenCalledOnce();
      const call = consolaSpy.mock.calls[0][0];
      expect(call).toBe("                    : ");
    });

    it("should handle special characters in name and value", () => {
      output("Name with spaces", "Value with $pecial ch@rs!");

      expect(consolaSpy).toHaveBeenCalledOnce();
      const call = consolaSpy.mock.calls[0][0];
      expect(call).toContain("Name with spaces");
      expect(call).toContain("Value with $pecial ch@rs!");
    });

    it("should produce correctly formatted output", () => {
      output("Files", "1,234");

      const call = consolaSpy.mock.calls[0][0];
      // Should contain "Files" padded to 20 chars, followed by ": " and the value
      expect(call).toBe("               Files: 1,234");
    });

    it("should handle numeric values converted to strings", () => {
      output("Count", String(42));

      expect(consolaSpy).toHaveBeenCalledOnce();
      const call = consolaSpy.mock.calls[0][0];
      expect(call).toContain("Count");
      expect(call).toContain("42");
    });

    it("should handle multiple outputs in sequence", () => {
      output("First", "Value1");
      output("Second", "Value2");
      output("Third", "Value3");

      expect(consolaSpy).toHaveBeenCalledTimes(3);

      const calls = consolaSpy.mock.calls.map((c) => c[0]);
      expect(calls[0]).toContain("First");
      expect(calls[0]).toContain("Value1");
      expect(calls[1]).toContain("Second");
      expect(calls[1]).toContain("Value2");
      expect(calls[2]).toContain("Third");
      expect(calls[2]).toContain("Value3");
    });
  });
});
