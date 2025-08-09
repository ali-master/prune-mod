---
name: 🔄 Compatibility Issue
about: Report compatibility problems with Node.js, package managers, or environments
title: '[COMPATIBILITY] '
labels: 'compatibility, needs-investigation'
assignees: ''

---

## 🔄 Compatibility Issue Type
- [ ] Node.js version compatibility
- [ ] Package manager compatibility (npm/yarn/pnpm/bun)
- [ ] Operating system compatibility
- [ ] File system compatibility
- [ ] CI/CD environment compatibility
- [ ] Container/Docker compatibility
- [ ] Monorepo compatibility
- [ ] Other: [specify]

## 🌍 Environment Details
**Primary Environment:**
- OS: [e.g., macOS 13.0, Ubuntu 22.04, Windows 11]
- Architecture: [e.g., x64, arm64, x86]
- Node.js version: [e.g., v18.17.0]
- Package manager: [npm/yarn/pnpm/bun] version [e.g., npm 9.6.7]
- prune-mod version: [e.g., 1.0.0]

**Additional Environment Context:**
- [ ] CI/CD system: [GitHub Actions, GitLab CI, Jenkins, etc.]
- [ ] Container: [Docker, Podman, etc.]
- [ ] Cloud platform: [AWS, GCP, Azure, Vercel, etc.]
- [ ] Monorepo tool: [Lerna, Nx, Rush, etc.]
- [ ] Build tool: [Webpack, Vite, Rollup, etc.]

## 🐛 Compatibility Problem
**What doesn't work?**
A clear description of the compatibility issue.

**Error messages:**
```bash
# Paste any error messages here
```

**Expected support:**
According to documentation or reasonable expectations, should this work?

## 🔄 Steps to Reproduce
1. Set up environment: [specific versions, tools]
2. Install prune-mod: `[installation method]`
3. Run command: `prune-mod [options]`
4. Observe issue: [what happens]

## ✅ Working Environments
**Where does it work?**
List environments where prune-mod works correctly:
- OS: [e.g., Ubuntu 20.04]
- Node.js: [e.g., v16.20.0]
- Package manager: [e.g., npm 8.19.4]

## 🔍 Investigation Results
**What you've tried:**
- [ ] Different Node.js versions
- [ ] Different package managers
- [ ] Different OS/environments
- [ ] Different prune-mod versions
- [ ] Checking official compatibility matrix

**Findings:**
[What did you discover during your investigation?]

## 📊 Impact Assessment
**Who is affected?**
- [ ] All users on [specific environment]
- [ ] Users with [specific configuration]
- [ ] New users trying to adopt prune-mod
- [ ] CI/CD pipelines
- [ ] Production deployments

**Workarounds available?**
- [ ] Yes: [describe workaround]
- [ ] No workarounds found
- [ ] Partial workarounds: [describe limitations]

## 🎯 Proposed Solution
**What should happen?**
- [ ] Update documentation to clarify supported environments
- [ ] Add support for this environment
- [ ] Provide migration guide
- [ ] Add compatibility warnings
- [ ] Other: [specify]

## 📚 Additional Context
- Links to relevant documentation
- Related compatibility issues in other projects
- Community discussions about this environment
- Performance or functionality differences observed

## ✅ Checklist
- [ ] I have tested with multiple versions/environments
- [ ] I have checked the official compatibility documentation
- [ ] I have searched for existing compatibility issues
- [ ] I can provide access to the problematic environment for testing (if needed)
