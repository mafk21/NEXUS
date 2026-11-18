# Windows verification checklist

NEXUS is a release candidate. Windows CI has built an installer and smoke-tested the unpacked app, but installing it and testing Windows integrations remain outstanding. This checklist is a plan, **not a record of completed hands-on tests**. Where possible, test on both Windows 10 and Windows 11 and record the version and build.

## Build and install

1. From the repository directory, run `npm ci`, `npm test`, and `npm run dist:win`. Record any warnings and failures; see [dependency security](security.md#dependency-audit).
2. Confirm an installer was produced in `release/`. Install it and start NEXUS. The installer is unsigned and may trigger a Windows warning.
3. Close and reopen NEXUS. Confirm settings and the active setup persist.

The GitHub Actions workflow builds an installer and smoke-tests the unpacked application using a temporary profile. A successful run makes the installer available as an artifact, but the smoke test does not install the app or exercise Windows integrations. Automated tests mock Windows behavior and do not replace these checks.

## Setups and wallpaper

1. Create, rename, duplicate, and delete categories and setups. Confirm destructive actions request confirmation and active selections behave as expected.
2. Assign a PNG or JPEG wallpaper, move or delete its original file, and activate the setup. Confirm the copied image is applied to the Windows desktop and that failures are reported clearly.
3. Test reset and reduced-motion settings. Check persistence after restarting NEXUS.

## Shortcuts and startup

1. Add and manually open a website, application, file, and folder. Check that a moved or deleted target reports an error.
2. Opt one shortcut into automatic opening, activate its setup, and confirm only opted-in shortcuts open. Confirm a duplicated setup does not auto-open copied shortcuts unless re-enabled.
3. Turn **Start with Windows** on and off. Sign out and back in to verify each state; return the setting to your preference afterward.

## Update and uninstall

Test the update and uninstall paths on a test account or machine. Verify the startup entry is removed on uninstall and check what user data remains; do not assume either behavior until observed. The app may leave locally stored user data behind. Back up anything important before testing.

Record failures, Windows and Node versions, commands, and actual results. Remove private details from logs before sharing them.

## New features to verify on a Windows device

- Add a time suggestion for a non-active setup and verify the prompt appears without changing wallpaper or opening shortcuts. Dismiss it and verify nothing changes; on a later suggestion, confirm and verify only then that wallpaper and any opted-in shortcuts change. Test while Settings is open too.
- Add an app suggestion using an executable filename, start the program after the first scan, and allow at least 15 seconds. Verify the prompt and both decisions as above. Programs already open at the first scan and short-lived processes are not reliably detected. Verify error behavior if `tasklist.exe` is restricted.
- With a compatible music player open, try previous, play/pause, and next on Overview. Test with more than one player; Windows chooses which session receives media keys. Verify graceful error handling if PowerShell is restricted.
- Export a setup containing local paths, a custom wallpaper, and a website. Inspect the file for absence of paths and image; import it into a category and verify that no shortcuts auto-open and activation was not changed. Verify the optional profile is omitted unless selected.
- These checks are not yet verified on physical Windows. Animated desktop wallpaper is not implemented.

### Animated wallpaper research

[Flowing Light Backgrounds](https://github.com/Lampe332/flowing-light-backgrounds) lists looping Cosmic Violet and Marble Gold videos under CC0 1.0. They have not been bundled or integrated. A reliable Windows desktop video host (including multi-monitor handling, performance, cleanup, and fallback to a static wallpaper) still needs to be built and tested; playing a video inside NEXUS would not be the same feature.

## Floating notch checks (not yet physically verified)

- Start NEXUS: the notch should appear at the top of the primary screen. Expand and collapse it, then minimize the main window and use Open NEXUS to restore it.
- Select a different category/setup without activating it. Verify nothing changes until Activate setup is clicked; then verify the wallpaper and any opt-in shortcuts follow the same rules as the main app. Test a failing wallpaper and a deleted or changed setup.
- Open an active setup shortcut and test media keys with a compatible player. Verify failures show in the notch.
- With the main window minimized, trigger a suggestion and verify the notch indicates it. Dismiss it without a switch, then try a new suggestion and explicitly accept. No trigger should activate a setup without approval.
- Turn the notch off and on in Settings, restart NEXUS to confirm the preference, and verify that closing the main window or choosing Quit NEXUS exits both. Check display scaling, primary-display changes, multiple monitors, fullscreen apps, and small displays. No global shortcut or system tray is provided.

## Release checker and upgrade checks (not yet verified end to end)

- On a packaged Windows build, open Settings and press Check for updates. Verify that no request is made before the button is pressed and that network, rate-limit and no-release errors are distinct from being up to date. Browser and Linux builds should show that checking is unavailable.
- With a deliberately published newer release containing the expected installer, verify its version is shown, then press Get update and verify that only the official GitHub release page opens. Nothing should download, launch, or install without a separate user action.
- Back up important data and verify an actual upgrade by running the downloaded installer over an older installed version. Check categories, setups, wallpapers, shortcuts, startup settings and the notch afterward. Verify the Windows unsigned-installer warning and uninstall behavior.
- Without a real newer published release, mocked tests cannot verify the complete update flow. Source builds with the same version as a release may contain different code; version checks cannot detect that difference.
