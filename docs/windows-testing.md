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
