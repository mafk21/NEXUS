# Contributing to NEXUS

Thanks for helping make NEXUS better. Thoughtful bug reports, focused suggestions, documentation improvements, and tested changes are welcome. All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you contribute

1. Read the [NEXUS Personal-Use License](LICENSE). It is source-available, not an open-source license. Commercial use and redistribution require separate permission.
2. Search existing issues and pull requests. For substantial changes, describe your idea in an issue before implementing it.
3. **Ask the maintainer for written permission before publishing a fork, patch, or other copy of NEXUS or its derivatives**, including when planning a public pull request. A normal GitHub fork or public patch can be redistribution; submitting a contribution alone does not grant redistribution rights. Ask via a non-sensitive issue if you need a contact method.
4. By intentionally submitting a contribution, you agree that it is licensed under the [NEXUS Personal-Use License](LICENSE) and may be used, modified, and included in NEXUS, as described in that license. Do not submit work you do not have the right to contribute.

Do not submit credentials, personal data, runtime files, private logs, or user content. Report vulnerabilities privately using [SECURITY.md](SECURITY.md), not in a public issue or pull request.

## Set up the project

Node.js 22.12 or newer is required. In PowerShell or a terminal:

```sh
git clone https://github.com/mafk21/NEXUS.git
cd NEXUS
npm ci
npm test
npm run dev:desktop
```

`npm run dev` opens the browser-only interface preview. The [development guide](docs/development.md) explains the commands, dependencies, and current limitations. Windows desktop behavior and packaging need real Windows testing; mock tests and a browser preview are not substitutes.

## Submitting a change

Once you have any necessary permission:

- Keep the change focused, and describe why it is needed.
- Run `npm test` and `npm run build`; add tests where appropriate.
- If changing Windows integrations or packaging, follow the relevant parts of the [Windows verification checklist](docs/windows-testing.md). State exactly what you did and did not test.
- Explain any privacy, security, data migration, or user-facing implications. Update documentation when needed.
- Share your exact test results and any known limitations; don't claim a Windows build or installer works without testing it.

These guidelines do not grant additional rights to redistribute NEXUS; see [LICENSE](LICENSE) for the full terms.
