import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    server: {
      sourcemap: "inline",
    },
    fileParallelism: true,
    name: "Prune Mod",
    coverage: {
      all: false,
      clean: true,
      provider: "v8",
      cleanOnRerun: true,
      reportOnFailure: true,
      include: ["**/src/**"],
      exclude: ["tests/fixtures/**", "tests/temp-test-pruner-test/**", "tests/test-utils.ts"],
      reporter: ["clover", "json", "html", "html-spa"],
      reportsDirectory: path.resolve(__dirname, "./coverage"),
    },
    dir: path.resolve(__dirname, "./tests"),
    exclude: ["tests/fixtures/**", "tests/temp-test-pruner-test/**", "tests/test-utils.ts"],
    cache: false,
    globals: true,
    pool: "forks",
    poolOptions: {
      threads: {
        singleThread: true,
      },
      forks: {
        singleFork: true,
      },
    },
  },
});
