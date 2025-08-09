<div align="center">

![prune-mod Logo](assets/logo.svg)

# 🕳️ prune-mod

**A cosmic black hole for your node_modules - compress unnecessary files into oblivion with up to 60% size reduction. Harness gravitational forces to optimize your deployments.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/@usex%2Fprune-mod.svg)](https://badge.fury.io/js/@usex%2Fprune-mod)
[![CI/CD Pipeline](https://github.com/ali-master/prune-mod/actions/workflows/ci.yml/badge.svg)](https://github.com/ali-master/prune-mod/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org)
[![Bun Ready](https://img.shields.io/badge/Bun-Ready-black.svg)](https://bun.sh)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Examples](#-examples) • [API](#-api) • [Contributing](#-contributing)

</div>

---

<div align="center">
  <img src="assets/social-preview.svg" alt="prune-mod Demo" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); margin: 20px 0;" width="100%">
</div>

## ✨ Features

- 🕳️ **Event Horizon Optimization** - Files beyond the point of no return are compressed into oblivion
- 🌌 **Accretion Disk Scanning** - Intelligent pattern detection pulls unnecessary files into the gravitational field
- ⚡ **Hawking Radiation Safety** - Critical runtime files are preserved through quantum mechanics
- 🚀 **Supermassive Performance** - Built with Bun and TypeScript for light-speed processing
- 📦 **Gravitational Compression** - Reduce node_modules size by up to 60% through cosmic forces
- 🎯 **Smart Pattern Matching** - Uses minimatch for flexible file pattern exclusions
- 🛡️ **Safe by Default** - Preserves essential runtime files and respects package.json
- ⚙️ **Highly Configurable** - Customizable patterns, exceptions, and dry-run mode
- 🔍 **Comprehensive Reporting** - Detailed statistics on files removed and space saved
- 📊 **Beautiful CLI Output** - Clean, colorful output powered by consola
- 🌍 **Cross-platform** - Works on Windows, macOS, and Linux
- 📝 **TypeScript Native** - Built with TypeScript, includes full type definitions

## 🚀 Installation

### NPM / Yarn / pnpm

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

### Usage in NPX/Bunx (No Installation)

```bash
# npm
npx @usex/prune-mod

# bun
bunx @usex/prune-mod
```

## 📖 Usage

### Basic Usage

```bash
# Prune current directory's node_modules
prune-mod

# Prune specific directory
prune-mod ./my-project/node_modules

# Dry run (preview what would be removed)
prune-mod --dry-run

# Verbose output with detailed logs
prune-mod --verbose
```

### Command Line Options

```
Usage:
  prune-mod [options] [directory]

Options:
  -v, --verbose       Verbose log output
  --exclude <glob>    Glob of files that should not be pruned (can be specified multiple times)
  --include <glob>    Globs of files that should always be pruned (can be specified multiple times)
  -d, --dry-run       Show what would be pruned without actually removing files
  -h, --help          Show help

Arguments:
  directory           Target directory to prune (default: "node_modules")

Examples:
  prune-mod                                    # Prune ./node_modules
  prune-mod ./my-project/node_modules         # Prune specific directory
  prune-mod --exclude "*.config.js"          # Keep config files
  prune-mod --include "*.log" --include "*.tmp"  # Always remove logs and temp files
  prune-mod --dry-run --verbose              # Preview with detailed output
```

## 🎯 Examples

### Basic Pruning

```bash
$ prune-mod

         files total: 15,847
       files removed: 9,438
        size removed: 184.2 MB
            duration: 2.3s

✅ Successfully reduced node_modules by 60%
```

### Custom Exclusions

```bash
# Keep all config files and documentation
prune-mod --exclude "*.config.*" --exclude "README*"

# Always remove test files and logs
prune-mod --include "**/*.test.*" --include "**/*.log"
```

### Serverless Deployment Workflow

```bash
# Install dependencies
npm ci --production

# Prune unnecessary files for deployment
prune-mod --verbose

# Your deployment bundle is now 60% smaller! 🎉
```

### Docker Multi-stage Build

```dockerfile
FROM node:18-alpine AS pruner

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Install and run prune-mod
RUN npx @usex/prune-mod

FROM node:18-alpine
WORKDIR /app

# Copy pruned node_modules
COPY --from=pruner /app/node_modules ./node_modules
COPY . .

CMD ["node", "index.js"]
```

## 📂 What Gets Pruned?

By default, prune-mod removes these categories of files:

### 📚 Documentation Files
- `README*`, `CHANGELOG*`, `LICENSE*`
- `*.md`, `*.markdown`, `*.mkd`
- `AUTHORS`, `CONTRIBUTORS`

### 🧪 Development & Testing
- `test/`, `tests/`, `__tests__/` directories
- `*.test.*`, `*.spec.*` files
- `coverage/`, `.nyc_output/` directories

### 🔧 Build Tools & Config
- `.github/`, `.circleci/` directories
- `tsconfig.json`, `tslint.json`
- `.eslintrc*`, `.prettierrc*`
- Build config files (`webpack.config.js`, `rollup.config.js`, etc.)

### 🗂️ IDE & Editor Files
- `.vscode/`, `.idea/` directories
- `.DS_Store`, `.editorconfig`

### 📊 Source Maps & Dev Assets
- `*.map` files
- Development assets and examples

### 🧹 Package Manager Files
- `.yarn-integrity`, `.yarnclean`
- `.npmrc`, `.npmignore`

## ⚙️ API

### Programmatic Usage

```typescript
import { Pruner } from '@usex/prune-mod';

const pruner = new Pruner({
  dir: './node_modules',
  verbose: true,
  dryRun: false,
  exceptions: ['*.config.*'],
  globs: ['**/*.tmp'],
  // Custom file patterns
  files: ['custom-file.txt'],
  directories: ['custom-dir'],
  extensions: ['.custom']
});

const stats = await pruner.prune();

console.log(`Removed ${stats.filesRemoved} files`);
console.log(`Saved ${stats.sizeRemoved} bytes`);
```

### Configuration Options

```typescript
interface PrunerOptions {
  /** Target directory (default: "node_modules") */
  dir?: string;
  
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
  
  /** Dry run mode - don't actually remove files (default: false) */
  dryRun?: boolean;
  
  /** Exception patterns - files matching these won't be removed */
  exceptions?: string[];
  
  /** Additional glob patterns to always remove */
  globs?: string[];
  
  /** Custom file names to remove */
  files?: string[];
  
  /** Custom directory names to remove */
  directories?: string[];
  
  /** Custom file extensions to remove */
  extensions?: string[];
}
```

### Return Statistics

```typescript
interface Stats {
  /** Total files processed */
  filesTotal: number;
  
  /** Number of files removed */
  filesRemoved: number;
  
  /** Total bytes saved */
  sizeRemoved: number;
}
```

## 🏗️ Development

### Prerequisites

- [Bun](https://bun.sh/) 1.0+ (recommended) or Node.js 18+
- TypeScript 5.0+

### Setup

```bash
# Clone the repository
git clone https://github.com/ali-master/prune-mod.git
cd prune-mod

# Install dependencies
bun install

# Start development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## 🧪 Testing

prune-mod has a comprehensive test suite covering:

- ✅ Core pruning functionality
- ✅ Pattern matching and exclusions
- ✅ CLI argument parsing
- ✅ File system operations
- ✅ Error handling
- ✅ Cross-platform compatibility

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch

# Run tests with UI
bun run test:ui
```

## 📊 Benchmarks

Performance comparison on a typical Next.js project:

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Size** | 487 MB | 193 MB | **60.4%** |
| **Files** | 21,543 | 12,105 | **43.8%** |
| **Directories** | 2,847 | 1,923 | **32.5%** |
| **Processing Time** | - | 2.3s | - |

> Results may vary depending on project dependencies and structure.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Ways to Contribute

- 🐛 **Bug Reports** - Found an issue? Let us know!
- 💡 **Feature Requests** - Have an idea? We'd love to hear it!
- 🔧 **Code Contributions** - PRs are always welcome
- 📖 **Documentation** - Help improve our docs
- 🧪 **Testing** - Help us test on different platforms
- 🎨 **Design** - UI/UX improvements and assets

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `bun test`
5. Format code: `bun run format`
6. Commit changes: `git commit -m 'feat: add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [node-prune](https://github.com/tj/node-prune) - Go-based alternative
- [npm-prune](https://docs.npmjs.com/cli/v7/commands/npm-prune) - Built-in npm command
- [clean-modules](https://github.com/mikechabot/clean-modules) - Similar tool for cleaning
---

<div align="center">

**[⬆ Back to Top](#-prune-mod)**

**Built with ❤️ by [Ali Torki](https://github.com/ali-master) for the developer community**

If prune-mod helped you save disk space, please consider giving it a ⭐!

</div>
