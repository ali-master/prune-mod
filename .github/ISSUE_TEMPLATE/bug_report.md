---
name: 🐛 Bug Report
about: Report a bug to help us improve prune-mod
title: '[BUG] '
labels: 'bug, needs-triage'
assignees: ''

---

## 🐛 Bug Description
A clear and concise description of what the bug is.

## 🔄 Steps to Reproduce
Steps to reproduce the behavior:
1. Run command: `prune-mod [options]`
2. In directory structure: `[describe your node_modules structure]`
3. With configuration: `[if any]`
4. See error: `[paste error message]`

## ✅ Expected Behavior
A clear and concise description of what you expected to happen.

## ❌ Actual Behavior
What actually happened instead.

## 🌍 Environment
**System Information:**
- OS: [e.g., macOS 13.0, Ubuntu 22.04, Windows 11]
- Node.js version: [e.g., v18.17.0]
- Bun version: [e.g., 1.0.0] (if using Bun)
- npm/yarn/bun version: [e.g., npm 9.6.7]
- prune-mod version: [e.g., 1.0.0]

**Project Details:**
- Package manager: [npm/yarn/pnpm/bun]
- Project type: [e.g., React, Next.js, Express, CLI tool]
- Number of dependencies: [approximate]
- node_modules size before pruning: [e.g., 500MB]

## 📁 Directory Structure
```
node_modules/
├── package-name/
│   ├── docs/
│   ├── tests/
│   └── [other relevant folders]
└── ...
```

## 🖼️ Screenshots/Logs
If applicable, add screenshots or paste relevant log output:

```bash
# Paste command output here
```

## 🔧 Configuration
If you're using any configuration files or custom options:

```json
// package.json scripts or config
```

## 🤔 Additional Context
- Is this a regression? (Did it work in a previous version?)
- Any workarounds you've found?
- Related issues or discussions?
- Any other context about the problem?

## ✅ Checklist
- [ ] I have searched existing issues to make sure this is not a duplicate
- [ ] I have provided all the requested information above
- [ ] I can reproduce this issue consistently
- [ ] I have tested with the latest version of prune-mod
