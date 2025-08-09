export interface Stats {
  filesTotal: number;
  filesRemoved: number;
  sizeRemoved: number;
}

export interface PrunerOptions {
  dir?: string;
  exceptions?: string[];
  globs?: string[];
  extensions?: string[];
  directories?: string[];
  files?: string[];
  verbose?: boolean;
  dryRun?: boolean;
}
