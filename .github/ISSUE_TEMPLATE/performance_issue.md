---
name: ⚡ Performance Issue
about: Report performance problems or suggest optimizations
title: '[PERFORMANCE] '
labels: 'performance, needs-investigation'
assignees: ''

---

## 🐌 Performance Issue Description
A clear description of the performance problem you're experiencing.

## 📊 Current Performance Metrics
**Execution Time:**
- Current time taken: [e.g., 30 seconds]
- Expected time: [e.g., 5 seconds]

**Resource Usage:**
- Memory usage: [e.g., 2GB peak]
- CPU usage: [e.g., 100% for 30s]

**Project Scale:**
- node_modules size: [e.g., 1.2GB]
- Number of packages: [e.g., 1,500]
- Number of files processed: [e.g., 50,000]
- Directory depth: [e.g., 15 levels deep]

## 🔄 Steps to Reproduce
1. Project setup: `[describe your project structure]`
2. Command used: `prune-mod [options]`
3. Measure performance: `[how you measured it]`

## 🌍 Environment
- OS: [e.g., macOS 13.0, Ubuntu 22.04, Windows 11]
- Node.js version: [e.g., v18.17.0]
- Available RAM: [e.g., 16GB]
- Storage type: [e.g., SSD, HDD]
- prune-mod version: [e.g., 1.0.0]

## 📈 Benchmarking Data
If you have benchmarking data, please share:

```bash
# Example benchmark output
time prune-mod --dry-run
# real    0m15.234s
# user    0m12.456s
# sys     0m2.778s
```

## 🎯 Expected Performance
- What performance would you expect for your use case?
- Are there specific targets (time, memory usage) you need to meet?

## 💡 Optimization Suggestions
If you have ideas for optimization:
- [ ] Parallel processing
- [ ] Better file system operations
- [ ] Caching mechanisms
- [ ] Memory optimization
- [ ] Algorithm improvements
- [ ] Other: [specify]

## 🔍 Profiling Information
If you've done any profiling, please share the results:

```
# Profiling output or flame graphs
```

## 📋 Comparison
How does this compare to:
- Previous versions of prune-mod?
- Similar tools (npm prune, etc.)?
- Manual deletion?

## ✅ Checklist
- [ ] I have provided performance metrics
- [ ] I have tested with the latest version
- [ ] I have checked if this is environment-specific
- [ ] I am willing to help test performance improvements
