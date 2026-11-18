<div align="center">
  <img src="assets/icon.png" width="112" alt="NEXUS icon">
  <h1>NEXUS</h1>
  <p><strong>A more personal desktop, one setup at a time.</strong></p>
  <p>A Windows-first desktop app for making space for whatever you're doing.</p>
  <p><a href="#make-space-for-your-moments">What it does</a> · <a href="#getting-started">Getting started</a> · <a href="#documentation">Documentation</a> · <a href="CONTRIBUTING.md">Contributing</a></p>
</div>

> **Release candidate — not yet verified on Windows.** The Windows installer has not been successfully built or tested in the development environment. Wallpaper switching, shortcuts, startup, installation, and uninstall behavior still need real Windows testing. There is no verified installer download yet.

## Make space for your moments

Your desktop should feel right for the task at hand. NEXUS organizes your space into **categories → setups → activation**, so you can give different parts of your day their own look and useful shortcuts.

- **Start with five categories:** Gaming, Study, Work, Chill, and Custom each have a setup named Default. Create, edit, and delete categories and setups, or duplicate a setup and make it your own.
- **Set the scene:** Pick a wallpaper and accent color for each setup. On Windows, activation requests a desktop wallpaper change.
- **Keep things close:** Add websites, apps, files, and folders as shortcuts. You can choose whether each one opens automatically on activation; it is opt-in and disabled on duplicated shortcuts.
- **Make it comfortable:** Choose reduced motion and, in the packaged Windows app, whether NEXUS starts when you sign in.

NEXUS is a **desktop app**, not a website. The browser preview is for the interface only and cannot perform Windows desktop actions.

## Getting started

There is no verified installer available yet. To build the release candidate yourself on Windows, install Node.js **22.12 or newer** and Git, then open PowerShell:

```powershell
git clone https://github.com/mafk21/NEXUS.git
cd NEXUS
npm ci
npm test
npm run dist:win
```

If the build succeeds, the installer will be in `release/`. It may trigger a Windows warning because it is unsigned. Build-time security findings remain unresolved; see [dependency security](docs/security.md#dependency-audit) before building. Do not run `npm audit fix --force` without reviewing breaking changes.

For troubleshooting, development commands, and the difference between the browser preview and the desktop app, see the [development guide](docs/development.md). For a checklist before relying on an installer, see [Windows verification](docs/windows-testing.md).

## Documentation

| Guide | What's inside |
| --- | --- |
| [Development](docs/development.md) | Setup, commands, project structure, and troubleshooting |
| [Windows verification](docs/windows-testing.md) | Installer, desktop integration, and uninstall checks |
| [Privacy & storage](docs/privacy.md) | What stays on your device and when NEXUS opens external resources |
| [Security](SECURITY.md) | Private vulnerability reporting and dependency guidance |
| [Changelog](CHANGELOG.md) | Project changes and release-candidate status |
| [Contributing](CONTRIBUTING.md) | How to participate and validate changes |
| [Code of conduct](CODE_OF_CONDUCT.md) | Expectations for a respectful community |

## License

NEXUS is **source-available**, not open source. Its [personal-use license](LICENSE) allows personal, non-commercial use and private modification, but prohibits redistribution and commercial use without separate permission. See the license for the complete terms and third-party license note.
