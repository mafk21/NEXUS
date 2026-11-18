# Security notes

To report a vulnerability, follow the private reporting instructions in [SECURITY.md](../SECURITY.md). Do not put sensitive details in a public issue.

## Application boundaries

The Electron renderer uses context isolation, a sandboxed preload, and disabled Node integration. Desktop actions are exposed through the preload API and validated by the main process. Local shortcut targets must be selected through the desktop picker and are resolved through a local identifier registry; website shortcuts accept HTTP or HTTPS URLs. These measures are not a substitute for a security review or testing on Windows.

## Dependency audit

As of November 2026, `npm audit --omit=dev` reported zero known vulnerabilities in production dependencies. The **full** audit reported 12 high-severity dependency findings associated with the build-time `picomatch` advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). The advisory concerns denial of service from attacker-controlled glob patterns, and no patched npm release was available when last checked. Several findings can be dependency paths to the same underlying advisory; audit results and severity can change over time.

The patched `minimatch` release is pinned through overrides for affected Electron build dependencies. These overrides cross major versions. Automated compatibility tests cover some file matching, but a complete Windows installer build has not been verified.

Before building, review current `npm audit` results and avoid building untrusted projects or accepting untrusted build configuration or glob patterns. Production-only audits omit build tools; zero findings there is not a guarantee that the whole project is safe. Do not run `npm audit fix --force` without reviewing its potentially breaking dependency changes.
