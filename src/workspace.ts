import * as fs from "fs";
import { logger } from "./logger";
import {
  fileExists,
  readFile,
  readJsonFile,
  joinPath,
  resolvePath,
  dirname,
  basename,
  readdir,
  parsePath,
} from "./fs";

export enum WorkspaceType {
  None = "none",
  Npm = "npm",
  Yarn = "yarn",
  Pnpm = "pnpm",
  Lerna = "lerna",
  Nx = "nx",
  Rush = "rush",
  Bun = "bun",
  Turbo = "turbo",
}

export interface WorkspaceInfo {
  type: WorkspaceType;
  root: string;
  packages: string[];
  hoistedNodeModules?: string;
  packageNodeModules?: string[];
}

export interface WorkspaceConfig {
  workspaces?: string[] | { packages?: string[] };
  bolt?: { workspaces?: string[] };
}

export class WorkspaceDetector {
  private cache = new Map<string, WorkspaceInfo>();

  async detect(directory: string): Promise<WorkspaceInfo> {
    const cached = this.cache.get(directory);
    if (cached) return cached;

    const info = await this.detectWorkspace(directory);
    this.cache.set(directory, info);
    return info;
  }

  private async detectWorkspace(directory: string): Promise<WorkspaceInfo> {
    const rootDir = await this.findWorkspaceRoot(directory);
    if (!rootDir) {
      return {
        type: WorkspaceType.None,
        root: directory,
        packages: [],
      };
    }

    const workspaceType = await this.detectWorkspaceType(rootDir);
    const packages = await this.getWorkspacePackages(rootDir, workspaceType);

    return {
      type: workspaceType,
      root: rootDir,
      packages,
      hoistedNodeModules: joinPath(rootDir, "node_modules"),
      packageNodeModules: packages.map((pkg) => joinPath(pkg, "node_modules")),
    };
  }

  private async findWorkspaceRoot(directory: string): Promise<string | null> {
    let currentDir = resolvePath(directory);
    const root = parsePath(currentDir).root;

    while (currentDir !== root) {
      const hasWorkspaceConfig = await this.hasWorkspaceConfiguration(currentDir);
      if (hasWorkspaceConfig) {
        return currentDir;
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    return null;
  }

  private async hasWorkspaceConfiguration(dir: string): Promise<boolean> {
    const configFiles = [
      "lerna.json",
      "nx.json",
      "rush.json",
      "pnpm-workspace.yaml",
      "pnpm-workspace.yml",
      "turbo.json",
    ];

    for (const file of configFiles) {
      if (await fileExists(joinPath(dir, file))) {
        return true;
      }
    }

    try {
      const packageJson = await readJsonFile(joinPath(dir, "package.json"));
      if (packageJson.workspaces || packageJson.bolt?.workspaces) {
        return true;
      }
    } catch {
      // No package.json or invalid JSON
    }

    return false;
  }

  private async detectWorkspaceType(rootDir: string): Promise<WorkspaceType> {
    // Check for specific workspace config files
    const checks: Array<[string, WorkspaceType]> = [
      ["turbo.json", WorkspaceType.Turbo],
      ["lerna.json", WorkspaceType.Lerna],
      ["nx.json", WorkspaceType.Nx],
      ["rush.json", WorkspaceType.Rush],
      ["pnpm-workspace.yaml", WorkspaceType.Pnpm],
      ["pnpm-workspace.yml", WorkspaceType.Pnpm],
    ];

    for (const [file, type] of checks) {
      if (await fileExists(joinPath(rootDir, file))) {
        return type;
      }
    }

    // Check package.json for workspaces
    try {
      const packageJson = await readJsonFile(joinPath(rootDir, "package.json"));

      if (packageJson.workspaces) {
        // Check for yarn.lock to distinguish between npm and yarn
        if (await fileExists(joinPath(rootDir, "yarn.lock"))) {
          return WorkspaceType.Yarn;
        } else {
          return WorkspaceType.Npm;
        }
      }
    } catch {
      // No package.json or invalid JSON
    }

    return WorkspaceType.None;
  }

  private async getWorkspacePackages(rootDir: string, type: WorkspaceType): Promise<string[]> {
    switch (type) {
      case WorkspaceType.Npm:
      case WorkspaceType.Yarn:
        return this.getNpmYarnWorkspaces(rootDir);
      case WorkspaceType.Pnpm:
        return this.getPnpmWorkspaces(rootDir);
      case WorkspaceType.Lerna:
        return this.getLernaWorkspaces(rootDir);
      case WorkspaceType.Nx:
        return this.getNxWorkspaces(rootDir);
      case WorkspaceType.Rush:
        return this.getRushWorkspaces(rootDir);
      case WorkspaceType.Turbo:
        return this.getTurboWorkspaces(rootDir);
      default:
        return [];
    }
  }

  private async getNpmYarnWorkspaces(rootDir: string): Promise<string[]> {
    try {
      const packageJson: WorkspaceConfig = await readJsonFile(joinPath(rootDir, "package.json"));

      let patterns: string[] = [];
      if (Array.isArray(packageJson.workspaces)) {
        patterns = packageJson.workspaces;
      } else if (packageJson.workspaces?.packages) {
        patterns = packageJson.workspaces.packages;
      }

      return this.resolveWorkspacePatterns(rootDir, patterns);
    } catch (error) {
      logger.error("Error reading npm/yarn workspaces:", error);
      return [];
    }
  }

  private async getPnpmWorkspaces(rootDir: string): Promise<string[]> {
    try {
      const yamlFiles = ["pnpm-workspace.yaml", "pnpm-workspace.yml"];

      for (const file of yamlFiles) {
        const workspacePath = joinPath(rootDir, file);
        if (await fileExists(workspacePath)) {
          try {
            const content = await readFile(workspacePath);
            // Simple YAML parsing for packages array
            const packagesMatch = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
            if (packagesMatch) {
              const patterns = packagesMatch[1]
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.startsWith("-"))
                .map((line) => line.replace(/^-\s*['"]?(.+?)['"]?$/, "$1"));

              return this.resolveWorkspacePatterns(rootDir, patterns);
            }
          } catch {
            // Error reading file, try next
          }
        }
      }
    } catch (error) {
      logger.error("Error reading pnpm workspaces:", error);
    }
    return [];
  }

  private async getLernaWorkspaces(rootDir: string): Promise<string[]> {
    try {
      const lernaConfig = await readJsonFile(joinPath(rootDir, "lerna.json"));
      const patterns = lernaConfig.packages || ["packages/*"];
      return this.resolveWorkspacePatterns(rootDir, patterns);
    } catch (error) {
      logger.error("Error reading lerna workspaces:", error);
      return [];
    }
  }

  private async getNxWorkspaces(rootDir: string): Promise<string[]> {
    try {
      const workspaceJsonPath = joinPath(rootDir, "workspace.json");
      const nxJsonPath = joinPath(rootDir, "nx.json");

      // Try workspace.json first
      if (await fileExists(workspaceJsonPath)) {
        try {
          const workspaceConfig = await readJsonFile(workspaceJsonPath);
          if (workspaceConfig.projects) {
            return Object.values(workspaceConfig.projects).map((project: any) =>
              joinPath(rootDir, typeof project === "string" ? project : project.root),
            );
          }
        } catch {
          // Error reading workspace.json
        }
      }

      // Check nx.json for project patterns
      if (await fileExists(nxJsonPath)) {
        // In newer Nx, projects are inferred from file structure
        const patterns = ["apps/*", "libs/*", "packages/*"];
        return this.resolveWorkspacePatterns(rootDir, patterns);
      }
    } catch (error) {
      logger.error("Error reading nx workspaces:", error);
    }
    return [];
  }

  private async getRushWorkspaces(rootDir: string): Promise<string[]> {
    try {
      const rushConfig = await readJsonFile(joinPath(rootDir, "rush.json"));

      if (rushConfig.projects) {
        return rushConfig.projects.map((project: any) => joinPath(rootDir, project.projectFolder));
      }
    } catch (error) {
      logger.error("Error reading rush workspaces:", error);
    }
    return [];
  }

  private async getTurboWorkspaces(rootDir: string): Promise<string[]> {
    try {
      // Turbo doesn't define packages itself, it relies on the underlying package manager
      // Check package.json for workspaces configuration
      const packageJson = await readJsonFile(joinPath(rootDir, "package.json"));

      // Turbo works with npm/yarn/pnpm workspaces
      if (packageJson.workspaces) {
        let patterns: string[] = [];
        if (Array.isArray(packageJson.workspaces)) {
          patterns = packageJson.workspaces;
        } else if (packageJson.workspaces?.packages) {
          patterns = packageJson.workspaces.packages;
        }
        return this.resolveWorkspacePatterns(rootDir, patterns);
      }

      // Check for pnpm-workspace.yaml if using pnpm with Turbo
      const pnpmWorkspaces = await this.getPnpmWorkspaces(rootDir);
      if (pnpmWorkspaces.length > 0) {
        return pnpmWorkspaces;
      }

      // Default Turbo convention
      return this.resolveWorkspacePatterns(rootDir, ["apps/*", "packages/*"]);
    } catch (error) {
      logger.error("Error reading turbo workspaces:", error);
      // Fall back to common Turbo conventions
      return this.resolveWorkspacePatterns(rootDir, ["apps/*", "packages/*"]);
    }
  }

  private async resolveWorkspacePatterns(rootDir: string, patterns: string[]): Promise<string[]> {
    const packages: string[] = [];

    for (const pattern of patterns) {
      // Handle glob patterns
      if (pattern.includes("*")) {
        const baseDir = pattern.substring(0, pattern.indexOf("*"));
        const resolvedBase = joinPath(rootDir, baseDir);

        try {
          const entries = (await readdir(resolvedBase, { withFileTypes: true })) as fs.Dirent[];
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const packagePath = joinPath(resolvedBase, entry.name);
              // Check if it has a package.json
              if (await fileExists(joinPath(packagePath, "package.json"))) {
                packages.push(packagePath);
              }
            }
          }
        } catch {
          // Directory doesn't exist
        }
      } else {
        // Direct path
        const packagePath = joinPath(rootDir, pattern);
        if (await fileExists(joinPath(packagePath, "package.json"))) {
          packages.push(packagePath);
        }
      }
    }

    return packages;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
