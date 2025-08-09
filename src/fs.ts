import * as fs from "fs";
import * as path from "path";

// Path utilities
export const joinPath = path.join;
export const resolvePath = path.resolve;
export const dirname = path.dirname;
export const basename = path.basename;
export const extname = path.extname;
export const parsePath = path.parse;
export const pathSep = path.sep;

// File system operations
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function readFile(
  filePath: string,
  encoding: BufferEncoding = "utf-8",
): Promise<string> {
  return fs.promises.readFile(filePath, encoding);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  return fs.promises.writeFile(filePath, content, "utf-8");
}

export async function readdir(
  dirPath: string,
  options?: { withFileTypes?: boolean },
): Promise<string[] | fs.Dirent[]> {
  if (options?.withFileTypes) {
    return fs.promises.readdir(dirPath, { withFileTypes: true });
  }
  return fs.promises.readdir(dirPath);
}

export async function stat(filePath: string): Promise<fs.Stats> {
  return fs.promises.stat(filePath);
}

export async function mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
  await fs.promises.mkdir(dirPath, options);
}

export async function removeFile(filePath: string): Promise<void> {
  return fs.promises.unlink(filePath);
}

export async function removeDir(
  dirPath: string,
  options?: { recursive?: boolean; force?: boolean },
): Promise<void> {
  return fs.promises.rm(dirPath, { recursive: true, force: true, ...options });
}

export async function chmod(filePath: string, mode: number): Promise<void> {
  return fs.promises.chmod(filePath, mode);
}

// Helper functions for common patterns
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  return JSON.parse(content);
}

export async function writeJsonFile(
  filePath: string,
  data: any,
  indent: number = 2,
): Promise<void> {
  const content = JSON.stringify(data, null, indent);
  await writeFile(filePath, content);
}

export async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;

  try {
    const entries = (await readdir(dirPath, { withFileTypes: true })) as fs.Dirent[];

    const promises = entries.map(async (entry) => {
      const fullPath = joinPath(dirPath, entry.name);

      if (entry.isDirectory()) {
        return getDirectorySize(fullPath);
      } else {
        try {
          const stats = await stat(fullPath);
          return stats.size;
        } catch {
          return 0;
        }
      }
    });

    const sizes = await Promise.all(promises);
    size = sizes.reduce((acc, s) => acc + s, 0);
  } catch {
    // Error reading directory
  }

  return size;
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}

// Walk directory recursively
export async function walkDirectory(
  dirPath: string,
  callback: (filePath: string, stats: fs.Stats, isDirectory: boolean) => Promise<void> | void,
): Promise<void> {
  try {
    const entries = (await readdir(dirPath, { withFileTypes: true })) as fs.Dirent[];

    for (const entry of entries) {
      const fullPath = joinPath(dirPath, entry.name);

      try {
        const stats = await stat(fullPath);
        await callback(fullPath, stats, entry.isDirectory());

        if (entry.isDirectory()) {
          await walkDirectory(fullPath, callback);
        }
      } catch {
        // Skip files/directories that can't be accessed
      }
    }
  } catch {
    // Error reading directory
  }
}

// Batch file operations
export async function copyFile(src: string, dest: string): Promise<void> {
  return fs.promises.copyFile(src, dest);
}

export async function moveFile(src: string, dest: string): Promise<void> {
  return fs.promises.rename(src, dest);
}

// Check if path is safe (not trying to escape sandbox)
export function isSafePath(basePath: string, targetPath: string): boolean {
  const resolvedBase = resolvePath(basePath);
  const resolvedTarget = resolvePath(basePath, targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

// Get relative path between two paths
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

// Check if file has specific extension
export function hasExtension(filePath: string, extensions: string[]): boolean {
  const ext = extname(filePath).toLowerCase();
  return extensions.some((e) => e.toLowerCase() === ext);
}

// Get file size in bytes
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

// Check if directory is empty
export async function isDirEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath);
    return Array.isArray(entries) && entries.length === 0;
  } catch {
    return true; // If we can't read it, consider it empty
  }
}
