# Changelog

This file records notable changes to NEXUS. It does not imply that an installer or release artifact has been verified.

## Unreleased

- Add an on-demand Windows release checker and a manual publishing workflow; updates open the official release page rather than installing automatically.

- Add an optional Windows floating notch for setup switching, active shortcuts, media keys, and confirmation-only suggestions.

- Mitigate the build-time picomatch advisory using a pinned, independently maintained fork; add full dependency auditing to CI. See security notes for limitations.

- Add in-app time, active setup and Windows system media-key widgets.
- Add consent-first daily time and Windows app-open suggestions, optional local profile, and portable setup file sharing.
- Animated desktop wallpapers remain unimplemented; new Windows integrations need physical-device verification.

- Add experimental Linux desktop support and Debian builds targeting amd64 and arm64 Chromebooks, with wallpaper export and Linux launcher shortcuts. ChromeOS wallpaper switching and Linux startup remain unsupported; Chromebook testing is outstanding.

- Disable implicit publishing during installer builds; Windows CI builds and uploads an installer artifact without a GitHub publishing token.
- Improve repository documentation, contribution guidelines, issue and pull request templates, and security reporting guidance.
- Add a source-available personal-use license adapted from JARVIS.

## 1.0.0-rc.1 — release candidate

- Added five starter categories, each with a Default setup, and category and setup management.
- Added wallpaper selection, setup accent colors, shortcuts, optional shortcut opening, reduced motion, and an optional Windows startup setting.
- Added automated tests and Windows packaging configuration. Windows CI has built an installer and smoke-tested the unpacked app; installation and desktop integrations remain unverified.
- Added dependency security documentation and a patched minimatch override; see [dependency security](docs/security.md#dependency-audit) for current build-time dependency status.
