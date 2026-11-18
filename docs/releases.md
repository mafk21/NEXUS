# Windows releases and updates

NEXUS only checks for updates when a user asks. It looks at up to the 100 most recent public GitHub releases of `mafk21/NEXUS`, not GitHub Actions artifacts, source commits, or unpublished builds. Windows packages compare their own `package.json` version with valid `v`-prefixed release tags. A prerelease installation can see newer stable and prerelease versions; a stable installation sees stable releases only. An available update must have an uploaded asset named exactly `NEXUS Setup <version>.exe`. Older builds without the button cannot update themselves: install a version that includes it manually first.

## For users

In the packaged Windows app, open **Settings → Check for updates**. If a newer release with a Windows installer exists, **Get update** opens its GitHub release page. The app itself does not download or install anything. You can review the release, download the Windows installer yourself, close NEXUS, and run it. Current installers are unsigned; verify the source and consider Windows' warning before deciding to run them. The update and user-data retention have not yet been verified end to end; back up important data first. Source-built copies with identical version numbers may contain different code and cannot be distinguished by this checker. Linux/Chromebook and browser update checks are not supported.

Until an official release is published, the checker reports no compatible releases. A temporary Actions artifact is not a release. No account is required to check the public releases endpoint; GitHub can log the request. See [privacy](privacy.md) and [security](security.md).

## For maintainers

Releases are **not published automatically** by ordinary builds, PRs or tag pushes. Only a repository maintainer who intends to distribute a release should publish one. Never repoint an existing release tag or replace a released installer.

1. Review the code, dependencies, release notes, licensing, and Windows behavior. Increment the SemVer version in both `package.json` and `package-lock.json` (for example with `npm version <new-version> --no-git-tag-version`). It must be strictly newer than the previous published release; every distinct release needs a new version. Merge the versioned code to main and verify it.
2. Create and push an annotated tag `v<version>` pointing at the reviewed commit, following the repository's authorization and release practices. The tag must already exist; do not force-push it. Tag names with build metadata are not supported by the publishing workflow.
3. Manually run **Publish Windows release** in GitHub Actions and enter the existing tag. The workflow checks the version and lockfile, audits, tests, builds, and smoke-tests Windows before creating the GitHub release with its Windows installer. Versions with a prerelease suffix are marked prerelease. It needs the Actions `GITHUB_TOKEN` with contents-write permission and repository settings that permit release creation. If any check fails, it does not publish.
4. Check the published page, expected installer name and release notes. The workflow does not sign the installer. Test a real update from an older installation separately before relying on it; normal CI smoke tests do not install or upgrade NEXUS.

The update service opens only an official GitHub release page derived from a validated version. It does not verify installer authenticity, so secure repository access and establish code signing before presenting updates as verified. The Windows CI workflow remains build-only and never publishes a release.
