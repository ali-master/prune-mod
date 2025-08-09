<div align="center">

![prune-mod Logo](assets/logo.svg)

# prune-mod

A fast and efficient tool to reduce node_modules size by removing unnecessary files. Save up to 60% disk space by cleaning out docs, tests, and development files while keeping your code working perfectly.

**Ultra-lightweight at just 16 KB** (5 KB gzipped) - smaller than most images, yet powerful enough to save hundreds of megabytes!

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/@usex%2Fprune-mod.svg)](https://badge.fury.io/js/@usex%2Fprune-mod)
[![CI/CD Pipeline](https://github.com/ali-master/prune-mod/actions/workflows/ci.yml/badge.svg)](https://github.com/ali-master/prune-mod/actions/workflows/ci.yml)

</div>


## Why prune-mod?

Node.js projects often have large node_modules folders filled with unnecessary files like documentation, tests, and build configs. These files take up valuable disk space and slow down deployments. prune-mod safely removes these files while keeping your application working perfectly.

**Key Benefits:**
- **Reduce size by 60%** - Dramatically shrink your node_modules
- **Faster deployments** - Less data to transfer and extract
- **Lower storage costs** - Save money on serverless and container deployments
- **Safe by default** - Never breaks your application
- **Lightning fast** - Process thousands of files in seconds
- **Smart runtime detection** - Automatically uses the fastest available runtime (Bun or Node.js)
- **Workspace/Monorepo support** - Automatically detects and prunes all packages in your monorepo

## Quick Start

```bash
# Install globally
npm install -g @usex/prune-mod

# Use in any project
prune-mod

# Or run without installing
npx @usex/prune-mod
```

## Installation

### npm / yarn / pnpm

```bash
# npm
npm install -g @usex/prune-mod

# yarn
yarn global add @usex/prune-mod

# pnpm
pnpm add -g @usex/prune-mod
```

### Bun (Recommended)

```bash
bun install -g @usex/prune-mod
```

### Run without installing

```bash
# npm
npx @usex/prune-mod

# bun
bunx @usex/prune-mod
```

## Usage

### Basic usage

```bash
# Clean current project's node_modules
prune-mod

# Clean specific directory
prune-mod ./my-project/node_modules

# Preview what will be removed (safe to run)
prune-mod --dry-run

# See detailed output
prune-mod --verbose
```

### Command options

```
Usage:
  prune-mod [options] [directory]

Options:
  -v, --verbose         Show detailed output
  --exclude <pattern>   Don't remove files matching this pattern
  --include <pattern>   Always remove files matching this pattern
  -d, --dry-run         Preview changes without removing files
  -w, --workspace       Enable workspace/monorepo mode
  --workspace-root <dir> Specify workspace root (auto-detected if not provided)
  --no-root             Skip pruning root node_modules in workspace mode
  -h, --help            Show help

Examples:
  prune-mod                              # Clean ./node_modules
  prune-mod ./dist/node_modules         # Clean specific directory
  prune-mod --exclude "*.config.js"    # Keep config files
  prune-mod --dry-run --verbose         # Preview with details
  
Workspace Examples:
  prune-mod --workspace                 # Auto-detect and prune all packages
  prune-mod -w --no-root               # Prune only package node_modules
  prune-mod -w --workspace-root /monorepo # Specify workspace root
```

### Real-world examples

**Before deployment:**
```bash
# Install production dependencies
npm ci --production

# Remove unnecessary files
prune-mod --verbose

# Your bundle is now 60% smaller!
```

**Docker builds:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Clean up node_modules
RUN npx @usex/prune-mod

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

CMD ["node", "index.js"]
```

**Custom patterns:**
```bash
# Keep specific files you need
prune-mod --exclude "*.d.ts" --exclude "LICENSE"

# Remove additional file types
prune-mod --include "*.log" --include "*.tmp"
```

## What gets removed?

prune-mod safely removes these types of files:

### Documentation files
- README files (README.md, README.txt, etc.)
- CHANGELOG and HISTORY files  
- LICENSE and COPYRIGHT files
- Documentation directories (docs/, doc/)

### Development files
- Test files and directories (test/, tests/, __tests__/)
- Example files and directories
- Source maps (*.map files)
- TypeScript config (tsconfig.json, tslint.json)

### Build and config files
- Linting configs (.eslintrc, .prettierrc, etc.)
- CI/CD configs (.github/, .circleci/, etc.)
- Editor configs (.vscode/, .idea/, .editorconfig)
- Build tool configs (webpack.config.js, etc.)

### Temporary files
- Coverage reports
- Log files
- Temporary directories
- Cache files

**Important:** prune-mod never removes:
- Main entry files (package.json main/module/exports)
- Runtime dependencies
- Binary executables
- Critical system files

## Programming API

Use prune-mod in your Node.js applications:

```javascript
import { Pruner } from '@usex/prune-mod';

const pruner = new Pruner({
  dir: './node_modules',
  verbose: true,
  dryRun: false,
  exceptions: ['*.config.*'], // Files to keep
  globs: ['**/*.tmp']        // Files to remove
});

const stats = await pruner.prune();

console.log(`Removed ${stats.filesRemoved} files`);
console.log(`Saved ${stats.sizeRemoved} bytes`);
console.log(`Processed ${stats.filesTotal} total files`);
```

### Workspace API

```javascript
import { Pruner, WorkspaceDetector } from '@usex/prune-mod';

// Auto-detect and prune workspace
const pruner = new Pruner({
  dir: '.',
  workspace: true,
  includeRoot: true,
  verbose: true
});

const stats = await pruner.prune();

// Or manually detect workspace info
const detector = new WorkspaceDetector();
const info = await detector.detect('.');
console.log(`Workspace type: ${info.type}`);
console.log(`Packages found: ${info.packages.length}`);
```

### Configuration options

```typescript
interface PrunerOptions {
  dir?: string;           // Target directory (default: "node_modules")
  verbose?: boolean;      // Show detailed output (default: false)
  dryRun?: boolean;       // Preview mode (default: false)
  exceptions?: string[];  // Patterns for files to keep
  globs?: string[];       // Additional patterns to remove
  files?: string[];       // Custom file names to remove
  directories?: string[]; // Custom directory names to remove
  extensions?: string[];  // Custom file extensions to remove
  
  // Workspace options
  workspace?: boolean;    // Enable workspace mode (default: false)
  workspaceRoot?: string; // Custom workspace root (auto-detected if not set)
  includeRoot?: boolean;  // Include root node_modules (default: true)
}
```

## Performance

Benchmark results on a typical Next.js project:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Size** | 487 MB | 193 MB | **60% smaller** |
| **File Count** | 21,543 | 12,105 | **44% fewer files** |
| **Directories** | 2,847 | 1,923 | **32% fewer dirs** |
| **Processing Time** | - | 2.3s | **Very fast** |

Results vary by project, but most see 40-70% size reduction.

## Smart Runtime Detection

prune-mod features intelligent runtime detection that automatically selects the optimal JavaScript runtime for maximum performance:

### How it works

When you run `prune-mod`, the tool automatically detects your environment and chooses the best runtime:

```bash
# prune-mod automatically detects and uses:
# → Bun (if available) - Up to 3x faster processing
# → Node.js (fallback) - Reliable and widely available
```

### Performance comparison

| Runtime | Processing Speed | Memory Usage | Best For |
|---------|------------------|--------------|----------|
| **Bun** | **3x faster** | 40% less memory | Local dev, CI/CD |
| **Node.js** | Standard speed | Standard memory | Production, compatibility |

### Zero configuration required

The runtime detection is completely automatic:

- **Development with Bun installed**: Uses Bun for lightning-fast processing
- **CI/CD pipelines**: Automatically adapts to available runtime
- **Docker containers**: Works with any Node.js or Bun base image
- **Legacy systems**: Falls back gracefully to Node.js

### Benefits for different environments

**Local Development:**
- Bun users get 3x faster pruning
- Instant feedback with `--dry-run`
- Reduced waiting time in development workflow

**CI/CD Pipelines:**
- Automatically uses fastest available runtime
- Reduces build times significantly
- Works in any containerized environment

**Production Deployments:**
- Guaranteed compatibility with Node.js
- Optimal performance when Bun is available
- No runtime-specific configuration needed

## Workspace/Monorepo Support

prune-mod intelligently detects and handles all major monorepo tools, making it perfect for large-scale projects with multiple packages.

### Supported Workspace Types

| Tool | Detection | Features |
|------|-----------|----------|
| **npm workspaces** | `package.json` with `workspaces` field | Hoisted dependencies, per-package pruning |
| **Yarn workspaces** | `yarn.lock` + workspaces config | Classic and Berry support |
| **pnpm workspaces** | `pnpm-workspace.yaml` | Efficient handling of hard links |
| **Lerna** | `lerna.json` | Multi-package repository support |
| **Nx** | `nx.json` or `workspace.json` | Monorepo with affected detection |
| **Rush** | `rush.json` | Enterprise-scale monorepo support |
| **Turbo** | `turbo.json` | High-performance build system with workspaces |
| **Bun workspaces** | Bun with workspaces config | Native Bun workspace handling |

### How Workspace Mode Works

When you run `prune-mod --workspace`, it:

1. **Auto-detects** your monorepo type and structure
2. **Identifies** all workspace packages automatically
3. **Prunes** both root and package-level node_modules
4. **Preserves** workspace integrity and symlinks
5. **Reports** consolidated statistics for all packages

### Workspace Examples

**Basic workspace pruning:**
```bash
# Auto-detect and prune entire monorepo
prune-mod --workspace

# Preview what will be removed
prune-mod -w --dry-run --verbose
```

**Advanced workspace control:**
```bash
# Skip root node_modules (only prune packages)
prune-mod -w --no-root

# Specify custom workspace root
prune-mod -w --workspace-root /path/to/monorepo

# Combine with other options
prune-mod -w --exclude "*.config.js" --verbose
```

**Real-world monorepo example:**
```bash
# In a large Nx monorepo
cd my-nx-workspace
prune-mod --workspace

# Output:
# Detected nx workspace at /my-nx-workspace
# Found 25 workspace packages
# Pruning root node_modules at /my-nx-workspace/node_modules
# Pruning package node_modules at /my-nx-workspace/apps/web/node_modules
# ...
# files removed: 15,234
# size removed: 285 MB
```

### Workspace Performance

Benchmark on a typical monorepo with 20 packages:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Size** | 1.8 GB | 680 MB | **62% smaller** |
| **File Count** | 95,420 | 41,183 | **57% fewer files** |
| **Docker Image** | 2.1 GB | 890 MB | **58% smaller** |
| **CI Cache Time** | 4m 20s | 1m 45s | **60% faster** |

### Best Practices for Workspaces

1. **CI/CD Integration:**
   ```yaml
   # GitHub Actions example
   - name: Install and prune
     run: |
       npm ci
       npx @usex/prune-mod --workspace
   ```

2. **Docker Optimization:**
   ```dockerfile
   FROM node:18 AS builder
   WORKDIR /app
   COPY . .
   RUN npm ci && npx @usex/prune-mod -w
   
   FROM node:18-alpine
   COPY --from=builder /app .
   ```

3. **Selective Pruning:**
   ```bash
   # Only prune specific packages (manual mode)
   prune-mod ./packages/app-a/node_modules
   prune-mod ./packages/app-b/node_modules
   ```

## Use Cases

### Serverless functions
Reduce cold start times and stay under size limits:
```bash
npm ci --production
prune-mod
zip -r function.zip .
```

### Docker containers
Smaller images mean faster pulls and deployments:
```dockerfile
RUN npm ci --production && npx @usex/prune-mod
```

### CI/CD pipelines
Speed up builds and deployments:
```yaml
- name: Install dependencies
  run: npm ci --production
  
- name: Clean node_modules
  run: npx @usex/prune-mod --verbose
```

### Local development
Free up disk space on your machine:
```bash
# Clean all projects in a directory
find . -name "node_modules" -type d -exec prune-mod {} \;
```

## Safety

prune-mod is designed to be safe:

- **Respects package.json** - Never removes main entry files
- **Dry run mode** - Preview changes before applying them  
- **Extensive testing** - Tested on thousands of real packages
- **Rollback friendly** - Just run `npm install` to restore files
- **Non-destructive** - Only removes files that can be regenerated

## Requirements

- Node.js 18+ or Bun 1.0+
- Works on Windows, macOS, and Linux

## Contributing

We welcome contributions! Here's how to help:

1. **Report bugs** - Open an issue with details
2. **Suggest features** - Tell us what you need
3. **Submit code** - Fork, branch, code, test, PR
4. **Improve docs** - Help others understand the tool
5. **Share feedback** - Let us know how it works for you

### Development setup

```bash
# Clone the repository
git clone https://github.com/ali-master/prune-mod.git
cd prune-mod

# Install dependencies
bun install

# Run tests
bun test

# Start development
bun run dev

# Build for production
bun run build
```

## FAQ

**Q: Is it safe to use in production?**  
A: Yes! prune-mod only removes files that aren't needed at runtime.

**Q: What if I need a file that gets removed?**  
A: Use `--exclude` to keep specific files, or just run `npm install` to restore everything.

**Q: How much space will I save?**  
A: Typically 40-70% depending on your dependencies. Use `--dry-run` to preview.

**Q: Does it work with Yarn/pnpm?**  
A: Yes! prune-mod works with any package manager.

**Q: Can I use it in automated scripts?**  
A: Absolutely! It's designed for CI/CD pipelines and automated deployments.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Tools

- [node-prune](https://github.com/tj/node-prune) - Go-based alternative
- [npm-prune](https://docs.npmjs.com/cli/v7/commands/npm-prune) - Built-in npm command for dev dependencies
- [clean-modules](https://github.com/mikechabot/clean-modules) - Similar cleaning tool

---

<div align="center">

**Built with ❤️ by [Ali Torki](https://github.com/ali-master) for the developer community**

**If prune-mod saved you time and disk space, please give it a ⭐ on GitHub!**

</div>

