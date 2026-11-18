# NEXUS on Chromebook (experimental)

NEXUS is being adapted as a Linux desktop app for ChromeOS. **It has not yet been tested on a Chromebook**, and no working Chromebook installer is guaranteed. The browser preview is not the desktop app.

## Requirements

- A Chromebook that supports ChromeOS's **Linux development environment**, with sufficient storage. Some managed devices may not allow Linux; contact the administrator if the setting is unavailable.
- An **amd64 (x64)** or **arm64** Linux environment. In the Linux terminal run `dpkg --print-architecture` and choose the matching package. The arm64 package is cross-built and is not smoke-tested in x64 CI. Neither architecture has been verified on a Chromebook; Linux apps and ChromeOS versions vary by device.
- Internet access for Linux dependencies and for building, and permission under the [NEXUS license](../LICENSE).

## Installing when a build is available

1. In ChromeOS Settings, enable **Linux development environment**. Wait for setup to finish.
2. Obtain the matching `.deb` from a successful Linux workflow artifact or a trusted build. CI artifacts are temporary and may require GitHub access; they are not a verified release. Do not install an unfamiliar package.
3. Move the package to **Linux files** in the Files app. If ChromeOS offers **Install with Linux**, use it. Alternatively, in the Linux terminal run `sudo apt install ./<package-name>.deb`, replacing the name with the actual file. This installs a local package and may download dependencies.
4. Look for NEXUS in the ChromeOS launcher under Linux apps. The terminal is used for installation, not intended to be required each time you open NEXUS.

Build from source in Linux with Node.js 22.12 or newer: `npm ci`, `npm test`, then `npm run dist:linux`. The `.deb` should appear in `release/` if packaging succeeds. Build-time security advisories remain; review [dependency security](security.md#dependency-audit) before building.

## What's different from Windows

- Setups, colors, and image previews work inside NEXUS. **NEXUS does not change the ChromeOS system wallpaper automatically.** Use **Save image** to export the selected image, then choose it in ChromeOS wallpaper settings. Save to Linux files or a folder shared with Linux.
- Website, file, and folder shortcuts use Linux handlers. Only files available to the Linux container can be selected; share folders with Linux in ChromeOS Files when appropriate.
- App shortcuts can launch a selected Linux executable without command-line arguments, or a selected Linux `.desktop` launcher using `gio launch`. A launcher can run the commands it specifies, so choose only files you trust. ChromeOS and Android apps and Windows `.exe` / `.lnk` files are not supported. Some Linux apps may need arguments; use a trusted `.desktop` launcher when available.
- Automatic shortcut opening remains opt-in; NEXUS startup at login is not supported on Chromebook/Linux. ChromeOS Linux containers do not automatically start at sign-in by design; see the [Chromium OS container documentation](https://www.chromium.org/chromium-os/developer-library/guides/containers/containers-and-vms/#can-i-autorun-programs-when-i-log-in-to-chromeos).
- Linux packaging and container integration differ between devices. Check appearance, persistence, shortcuts, permissions, and failure messages on a real Chromebook before relying on it.

The Linux CI smoke test runs with a sandbox flag only because of the hosted CI environment; it is not a recommendation to disable the sandbox on a Chromebook. Report installation or sandbox errors rather than bypassing security.
