# Development guide

NEXUS is an Electron desktop application with a React/Vite interface. Windows is the first target; other platforms are not yet supported for Windows-specific desktop actions.

## Requirements

- Node.js **22.12 or newer**, npm, and Git.
- Windows for desktop integration and installer testing. Building an installer also requires access to Electron and electron-builder's downloaded build resources.
- Read the [license](../LICENSE) and [contribution guidance](../CONTRIBUTING.md) before publishing any copy or change.

## Get the source and install dependencies

```powershell
git clone https://github.com/mafk21/NEXUS.git
cd NEXUS
npm ci
```

Run `npm ci` from inside the repository, where `package.json` and `package-lock.json` are located. npm's funding message is informational. npm may report build-dependency advisories or install-script warnings; read [dependency security](security.md#dependency-audit) rather than automatically applying breaking fixes. Only approve install scripts after reviewing what they do.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev:desktop` | Start Vite and the Electron development shell. |
| `npm run dev` | Start the interface-only browser preview. |
| `npm test` | Run the automated test suite. |
| `npm run build` | Build the interface into `dist/`. |
| `npm run dist:win` | Build the interface and attempt to create a Windows NSIS installer in `release/`. |
| `npm audit` | Check the full dependency tree, including build tools. |
| `npm audit --omit=dev` | Check production dependencies only; this is not a substitute for the full audit. |

The browser preview cannot change the Windows wallpaper, open desktop shortcuts, select local app/file/folder targets, or control Windows startup. Browser-only image imports are limited to PNG/JPEG under 2 MB; desktop imports accept PNG/JPEG under 20 MB subject to image dimension limits.

## Project layout

- `src/` — React interface, setup model, shortcut validation, and styles.
- `electron/` — Electron main process, isolated preload API, wallpaper, shortcuts, startup, and packaged-app smoke check.
- `public/wallpapers/` — built-in static wallpaper artwork.
- `tests/` — interface, model, desktop-service, and packaging-compatibility tests.
- `assets/` — application icon and installer customization.
- `.github/workflows/` — Windows build and test workflow.

## Troubleshooting

- **`npm ci` cannot find a lockfile:** Make sure the prompt is inside `NEXUS`, not the parent directory. Run `cd NEXUS` after cloning.
- **Installer build cannot download Electron or build tools:** Check internet access and any network, proxy, or certificate restrictions. Don't bypass TLS verification or download an executable from an untrusted source.
- **An install script needs approval:** Review the package and script before approving it. Do not blindly approve every script; behavior varies by npm version.
- **The installer or desktop action fails:** Note the exact command, complete relevant error, Windows and Node versions, and whether the failure happens consistently. Remove personal information before sharing logs. Use the [bug report template](../.github/ISSUE_TEMPLATE/bug_report.yml) for non-security issues.

A successful interface build or mocked test does not establish that the Windows installer or operating-system integration works. Use the [Windows verification checklist](windows-testing.md).
