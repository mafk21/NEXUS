# Changelog

This file records notable changes to NEXUS. It does not imply that an installer or release artifact has been verified.

## Unreleased

- Improve repository documentation, contribution guidelines, issue and pull request templates, and security reporting guidance.
- Add a source-available personal-use license adapted from JARVIS.

## 1.0.0-rc.1 — release candidate

- Added five starter categories, each with a Default setup, and category and setup management.
- Added wallpaper selection, setup accent colors, shortcuts, optional shortcut opening, reduced motion, and an optional Windows startup setting.
- Added automated tests and Windows packaging configuration. Windows installation and desktop integrations remain unverified; the Windows build workflow is configured but must succeed before it establishes a working installer.
- Added dependency security documentation and a patched minimatch override. A build-time picomatch advisory remains unresolved; see [dependency security](docs/security.md#dependency-audit).
