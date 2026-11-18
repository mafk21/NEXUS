# NEXUS on Chromebook (experimental)

NEXUS is being adapted as a Linux desktop app for ChromeOS. **It has not yet been tested on a Chromebook**, and no working Chromebook installer is guaranteed. The browser preview is not the desktop app.

## Requirements

- A Chromebook that supports ChromeOS's **Linux development environment**, with sufficient storage. Some managed devices may not allow Linux; contact the administrator if the setting is unavailable.
- An **x86-64 / amd64** Linux environment for the initial Debian package. In the Linux terminal run `dpkg --print-architecture`: `amd64` matches; `arm64` does not yet have a tested or provided package. Linux apps and ChromeOS versions vary by device.
- Internet access for Linux dependencies and for building, and permission under the [NEXUS license](../LICENSE).

## Installing when a build is available

1. In ChromeOS Settings, enable **Linux development environment**. Wait for setup to finish.
2. Obtain the matching `.deb` from a successful Linux workflow artifact or a trusted build. CI artifacts are temporary and may require GitHub access; they are not a verified release. Do not install an unfamiliar package.
3. Move the package to **Linux files** in the Files app. If ChromeOS offers **Install with Linux**, use it. Alternatively, in the Linux terminal run `sudo apt install ./<package-name>.deb`, replacing the name with the actual file. This installs a local package and may download dependencies.
4. Look for NEXUS in the ChromeOS launcher under Linux apps. The terminal is used for installation, not intended to be required each time you open NEXUS.

Build from source in Linux with Node.js 22.12 or newer: `npm ci`, `npm test`, then `npm run dist:linux`. The `.deb` should appear in `release/` if packaging succeeds. Build-time security advisories remain; review [dependency security](security.md#dependency-audit) before building.

## What's different from Windows

- Setups, colors, and image previews work inside NEXUS. **NEXUS does not change the ChromeOS system wallpaper**; set it manually in ChromeOS settings.
- Website, file, and folder shortcuts use Linux handlers. Only files available to the Linux container can be selected; share folders with Linux in ChromeOS Files when appropriate.
- App shortcuts can launch a Linux executable selected by the user, without command-line arguments. ChromeOS and Android apps, Windows `.exe` / `.lnk` files, and `.desktop` launchers are not supported as app shortcuts. Some Linux apps may need arguments and therefore won't work as shortcuts yet.
- Automatic opening remains opt-in; NEXUS startup at login is not supported on Chromebook/Linux.
- Linux packaging and container integration differ between devices. Check appearance, persistence, shortcuts, permissions, and failure messages on a real Chromebook before relying on it.

The Linux CI smoke test runs with a sandbox flag only because of the hosted CI environment; it is not a recommendation to disable the sandbox on a Chromebook. Report installation or sandbox errors rather than bypassing security.
