# NEXUS

A Windows-first desktop app for switching between personal setups. This is a **v1 release candidate**, not yet verified as an installable Windows release.

## What it does

- Five built-in categories (Gaming, Study, Work, Chill, Custom), each with a Default setup. Create, edit, and delete categories and setups; choose names, icons, and colors. Destructive actions require confirmation.
- Assign a PNG or JPEG wallpaper to each setup. The desktop app copies imported images into its own data folder. Activating a setup requests a Windows wallpaper change. The application path is implemented but **has not yet been verified on Windows**.
- Add website, application, file, and folder shortcuts. Open them manually or explicitly opt individual shortcuts into opening when a setup is activated. Duplicated setups retain shortcuts but disable automatic opening until the user enables it again. Built-in suggestions are links and never auto-open by default.
- Optionally start NEXUS with Windows (available only in the installed Windows app). Reduced motion and other selections persist locally.

The browser preview is not the desktop app: it cannot change your Windows wallpaper, pick local apps/files/folders, open desktop shortcuts, or change startup settings. Its image import limit is 2 MB; desktop imports support PNG/JPEG up to 20 MB.

## Development

Node.js 22.12 or newer is required. On Windows:

```sh
npm ci
npm test
npm run dev:desktop
```

For an interface-only browser preview, run `npm run dev`.

## Windows installer and verification

Run `npm run dist:win` on Windows to create an NSIS installer in `release/`. The GitHub Actions workflow runs automated tests, builds the installer, and runs a packaged-app smoke check in a temporary profile without changing the wallpaper. The workflow must actually run successfully before the installer can be considered built. An unsigned installer may show Windows security warnings.

The sandbox used to develop this version runs Linux and could not download Electron's Windows binaries from GitHub's release-asset host. **No Windows installer or actual Windows desktop test has been verified yet.** Mocked tests do not prove Windows integration works. Before distribution, test on Windows 10 and 11:

1. Install and launch NEXUS; restart it and confirm setup selections persist.
2. Import a wallpaper, move or delete the original, activate the setup, and confirm the desktop changes and NEXUS reports errors for missing files.
3. Open an app, folder, file, and website manually; opt one shortcut into automatic opening, switch setups, and confirm only the opted-in shortcut launches.
4. Enable and disable **Start with Windows**, sign out and back in to verify behavior.
5. Check update and uninstall behavior, including removal of NEXUS's startup entry and retention of user data.

## Privacy and storage

Categories, setups, shortcuts, and preferences are stored locally. Imported desktop wallpapers and local shortcut-target mappings are stored in the app's user-data directory. Website addresses open only when selected or explicitly opted into activation. There is no NEXUS account, telemetry, or cloud sync. Electron's renderer has Node integration disabled and context isolation enabled; local file targets are resolved only from items chosen through the desktop picker.

## Dependency security

The installer build uses development dependencies that npm audits as well. As of November 2026, `npm audit --omit=dev` reports zero known vulnerabilities; the full audit still reports a high-severity denial-of-service advisory in `picomatch` and the build tools that depend on it ([GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)). There is no patched npm release yet. It concerns processing attacker-controlled glob patterns, not a production dependency; avoid building untrusted projects or accepting untrusted build configurations. The patched `minimatch` is pinned via overrides for the affected Electron builder dependencies; these overrides cross major versions and must be validated against a real Windows installer build. Re-check the full audit as upstream releases fixes. Do not use `npm audit fix --force` without reviewing its breaking dependency changes.
