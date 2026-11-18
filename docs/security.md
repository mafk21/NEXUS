# Security notes

To report a vulnerability, follow the private reporting instructions in [SECURITY.md](../SECURITY.md). Do not put sensitive details in a public issue.

## Application boundaries

The Electron renderer uses context isolation, a sandboxed preload, and disabled Node integration. Desktop actions are exposed through the preload API and validated by the main process. Local shortcut targets must be selected through the desktop picker and are resolved through a local identifier registry; website shortcuts accept HTTP or HTTPS URLs. These measures are not a substitute for a security review or testing on Windows.

## Update checks

Windows update checks query the fixed public `mafk21/NEXUS` GitHub releases API through Electron's network stack, on demand only. For newer releases, NEXUS requires the exact expected Windows installer name, an uploaded asset, a bounded size, and GitHub's SHA-256 digest. A separate user action downloads from a constructed GitHub release URL, following only HTTPS redirects to an allowlist of GitHub asset hosts. The download is size-bounded, hashed as it streams, and rechecked before launch. The user must explicitly confirm launching the installer; NEXUS then closes so it can upgrade. A separate button opens the release page.

The checksum detects corruption or an installer different from the metadata, **not publisher authenticity**: both the asset and digest come from GitHub. Installers are currently unsigned, and GitHub account/repository security and HTTPS are important trust boundaries. Temporary files remain after a successful launch to allow installation. The actual installed upgrade and data retention have not been verified end to end. A zero audit result does not vouch for a downloaded installer. Never bypass certificate errors or warnings without understanding the risk. See [release instructions](releases.md).

## Dependency audit

As of November 2026, both `npm audit` and `npm audit --omit=dev` reported zero known vulnerabilities against the current npm advisory database. This is a snapshot, not a security guarantee; audit results can change. CI runs the full audit, including build dependencies.

The previous 12 high-severity findings arose from the build-time `picomatch` advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). No official patched upstream release was available when checked. As a temporary mitigation, the lockfile pins `@ryotsu/picomatch@4.0.7-a`, a separately maintained fork, via an npm alias and override. The fork documents a patch for this advisory and changes behavior for some complex extglob patterns. Its source and regression tests were reviewed locally and representative cases are tested in a timeout-bounded subprocess, but this is **not an independently verified or official upstream fix**. Because it has a different npm package name, the original package's advisories may not automatically apply to it; zero audit findings do not prove the fork is safe. Monitor the upstream advisory and replace the fork with an official patched release when available. Do not remove the override until the replacement has been audited and compatibility-tested.

The patched `minimatch` release is pinned through overrides for affected Electron build dependencies. These overrides cross major versions. Automated compatibility tests cover some file matching, and Windows CI has produced an installer and smoke-tested the unpacked app. Installation and desktop integrations still need hands-on verification.

Before building, review current `npm audit` results and avoid building untrusted projects or accepting untrusted build configuration or glob patterns. Production-only audits omit build tools; zero findings there is not a guarantee that the whole project is safe. Do not run `npm audit fix --force` without reviewing its potentially breaking dependency changes.
