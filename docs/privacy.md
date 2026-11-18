# Privacy and local storage

NEXUS is designed to keep your workspace local. It has no NEXUS account, cloud sync, or telemetry service in the current application code.

## What is stored

- Categories, setups, selections, preferences, and website shortcut addresses are stored in the application's local renderer storage.
- Imported desktop wallpapers are copied into NEXUS's Electron user-data directory; applied wallpaper BMP files may also be stored there. The app keeps a local mapping from shortcut identifiers to the app, file, or folder paths you selected.
- The Windows startup option uses the operating system's login-item settings when enabled in a packaged Windows app.

Local data can reveal your setup names, URLs, file paths, or images to someone with access to your device or account. Uninstall and data-retention behavior has not yet been verified on Windows; back up important data before testing.

## External actions

A shortcut opens when you choose it or explicitly enable opening on setup activation. Website shortcuts use your system's default handler, and the websites you visit may collect data under their own policies. App, file, and folder shortcuts launch through your operating system. Starter links do not open automatically by default, and copied shortcuts have automatic opening disabled.

Changing wallpaper and startup settings affects Windows itself. The browser preview cannot perform these desktop actions. Downloading dependencies and building the installer also involves network access to third-party services; see [development](development.md).
