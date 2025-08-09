---
name: 🔒 Security Vulnerability
about: Report a security vulnerability (private disclosure recommended)
title: '[SECURITY] '
labels: 'security, critical'
assignees: ''

---

> **⚠️ IMPORTANT:** For serious security vulnerabilities, please consider using GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature instead of creating a public issue.

## 🔒 Security Issue Type
- [ ] Code injection vulnerability
- [ ] Path traversal vulnerability
- [ ] Dependency vulnerability
- [ ] Information disclosure
- [ ] Denial of Service (DoS)
- [ ] Other: [specify]

## 📊 Severity Assessment
**Severity Level:**
- [ ] Critical (immediate action required)
- [ ] High (fix needed soon)
- [ ] Medium (fix needed eventually)
- [ ] Low (minor security concern)

**CVSS Score:** [if available]

## 🔍 Vulnerability Description
**What is the vulnerability?**
A clear description of the security issue without revealing exploit details publicly.

**Affected Components:**
- [ ] CLI argument parsing
- [ ] File system operations
- [ ] Path handling
- [ ] Dependencies
- [ ] Other: [specify]

## 🎯 Impact Assessment
**What can an attacker do?**
- [ ] Execute arbitrary code
- [ ] Access sensitive files
- [ ] Crash the application
- [ ] Gain unauthorized access
- [ ] Other: [describe impact]

**Who is affected?**
- [ ] All users
- [ ] Users with specific configurations
- [ ] Users in specific environments
- [ ] CI/CD systems
- [ ] Other: [specify]

## 🔄 Steps to Reproduce
**Prerequisites:**
[What setup is needed to reproduce this?]

**Reproduction steps:**
1. [Step 1]
2. [Step 2]
3. [Observe security issue]

> **Note:** If this is a critical vulnerability, consider providing steps privately.

## 🌍 Environment
- prune-mod version: [e.g., 1.0.0]
- Node.js version: [e.g., v18.17.0]
- OS: [e.g., Ubuntu 22.04]
- Environment: [e.g., development, CI/CD, production]

## 🛡️ Mitigation
**Temporary workarounds:**
[Any temporary mitigations users can apply]

**Suggested fix:**
[If you have ideas for how to fix this]

## 📚 Additional Context
- References to similar vulnerabilities
- Related security research
- Proof of concept (if safe to share publicly)

## ✅ Disclosure Checklist
- [ ] I have not shared exploit details publicly
- [ ] I have considered using private vulnerability reporting
- [ ] I understand this may be made public after a fix is available
- [ ] I am willing to work with maintainers on responsible disclosure
