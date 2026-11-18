# Privacy and local storage

NEXUS is designed to keep your workspace local. It has no NEXUS account, cloud sync, or telemetry service in the current application code.

## What is stored

- Categories, setups, selections, preferences, and website shortcut addresses are stored in the application's local renderer storage.
- Imported desktop wallpapers are copied into NEXUS's Electron user-data directory; applied wallpaper BMP files may also be stored there. The app keeps a local mapping from shortcut identifiers to the app, file, or folder paths you selected.
- The Windows startup option uses the operating system's login-item settings when enabled in a packaged Windows app.

Local data can reveal your setup names, URLs, file paths, or images to someone with access to your device or account. Uninstall and data-retention behavior has not yet been verified on Windows; back up important data before testing.

## External actions

A shortcut opens when you choose it or explicitly enable opening on setup activation. Website shortcuts use your system's default handler, and the websites you visit may collect data under their own policies. App, file, and folder shortcuts launch through your operating system. On Linux, a selected `.desktop` launcher may execute the commands it contains; choose only files you trust. Starter links do not open automatically by default, and copied shortcuts have automatic opening disabled.

Changing wallpaper and startup settings affects Windows itself. The browser preview cannot perform these desktop actions. Downloading dependencies and building the installer also involves network access to third-party services; see [development](development.md).

## Suggestions, profile, and sharing

- Suggestions and the optional profile name are stored locally in renderer storage, separately from the workspace. No login or synchronization is provided. A schedule can offer a switch only while NEXUS is running. On Windows, an app-open suggestion polls running **executable names** locally while an app rule exists; it does not send process names over the network. Other platforms do not support app-open triggers. The initial scan establishes a baseline rather than treating already-running programs as newly opened. Short-lived launches can be missed. Polling, sleep, suspension, or a closed application can also cause a suggestion to be missed. Suggestions appear in the NEXUS window and, on Windows, in the floating notch when enabled; they are not system notifications.
- A trigger **never activates a setup on its own**. Choosing “Switch setup” applies it, including any shortcuts you previously opted to open on activation. Dismissal does not activate it. Schedules are offered at most once per day during a running session; restarting in the same minute can offer one again. Rules whose setup was deleted are ignored until removed.
- Setup sharing exports a JSON file you distribute yourself. It includes the setup name, icon, color, built-in wallpaper and website shortcut labels and addresses. Custom image files, local app/file/folder paths, and auto-open flags are not shared; an imported image is replaced by the category's built-in wallpaper. Optionally include your local profile name. Website addresses can contain sensitive information, so review the file before sharing. Import previews the setup, validates the file and disables automatic opening. It does not activate the setup. These files are not a full backup of your workspace.
- Windows media buttons send standard operating-system media keys to the system; they do not read song information. A compatible active player must handle them. Support varies by player and has not yet been verified on a physical Windows device.

## Floating notch

On Windows the notch is enabled by default while NEXUS is running. It sits at the top of the primary display and stays above ordinary windows. It shows the active setup and shortcut labels; anyone looking at your screen can see them. It receives only the names and identifiers needed for its controls, not local shortcut paths. Actions are resolved against the current workspace in the main window. Minimize the main window to keep the notch running; closing the main window or choosing Quit NEXUS exits both. Turn the notch off in Settings. It does not run after NEXUS exits and is not available in the browser preview or on Linux/Chromebook.

## Update checks

Update checks run only when you press **Check for updates** in the packaged Windows app. NEXUS makes an unauthenticated HTTPS request to the public GitHub releases API; GitHub can see the request and your IP address under its own privacy policy. No workspace, profile, or shortcut data is sent. The app compares version numbers locally. If you choose **Download update**, NEXUS retrieves the installer from GitHub and its release-asset hosting; those services can see the request and your IP address. If you separately confirm installation, NEXUS opens the unsigned installer and closes. You can also choose to open the release page in your browser. A verified installer is kept in a temporary folder after it is launched so the installer can use it; your operating system may clean up temporary files later. There are no update notifications or automatic background checks.
