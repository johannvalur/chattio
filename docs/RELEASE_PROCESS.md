# Release Process - Quick Reference

## TL;DR - Standard Release

```bash
# 1. Create feature branch
git checkout -b feature-name
# ... make changes ...
git commit -m "feat: Description"

# 2. Bump version
npm version patch  # or minor/major
# Edit chattio/index.html to update download links

# 3. Commit and create PR
git add .
git commit -m "chore: Bump version to v1.0.9"
git push origin feature-name
gh pr create --base main --title "feat: Feature (v1.0.9)"

# 4. Merge PR (wait for CI to pass)
gh pr merge --merge --delete-branch

# 5. Tag and push (triggers release build)
git checkout main && git pull
git tag v1.0.9
git push origin v1.0.9

# 6. Wait for build (3-4 minutes)
gh run watch

# 7. Publish release
gh release edit v1.0.9 --draft=false \
  --title "v1.0.9 - Title" \
  --notes "Release notes here" --latest
```

## What Happens Automatically

### When you push to `main`

1. **CI/CD Pipeline runs** (`.github/workflows/ci-enhanced.yml`)
   - Linting and formatting checks
   - Unit tests (all platforms)
   - Integration tests
   - Security audits
   - Accessibility checks
   - Build verification (macOS and Windows)
   - **Website deployment to GitHub Pages**

### When you push a tag `v*.*.*`

1. **Release Workflow runs** (`.github/workflows/release.yml`)
   - Builds macOS arm64 app
   - Code signs with Developer ID
   - Notarizes with Apple
   - Builds Windows x64 installer
   - Code signs Windows installer
   - Creates DRAFT release on GitHub
   - Uploads all artifacts:
     - `Chattio-1.0.9-arm64.dmg`
     - `Chattio-1.0.9-arm64-mac.zip`
     - `Chattio-Setup-1.0.9.exe`
     - Auto-update metadata files

2. **Website Updates** (via CI/CD on main branch)
   - Deploys `chattio/` folder to GitHub Pages
   - Updates download links to new version
   - Usually completes within 5 minutes of merge

## File Changes Checklist

For every release, you must update:

- [ ] `package.json` - version field
- [ ] `chattio/index.html` - download URLs (2 places) and version text (2 places)

Optional but recommended:

- [ ] Release notes prepared
- [ ] CHANGELOG.md updated (if you maintain one)

## Version Numbers

- **Patch** (1.0.8 → 1.0.9): Bug fixes, minor improvements
- **Minor** (1.0.9 → 1.1.0): New features, backward compatible
- **Major** (1.0.9 → 2.0.0): Breaking changes

## Common Issues

### 1. Release workflow skipped artifact upload

**Symptom:** Workflow completes but no artifacts in release

**Cause:** Release was created manually before tag workflow ran

**Fix:**

```bash
gh release delete v1.0.9 --yes
git push origin :refs/tags/v1.0.9
git tag v1.0.9
git push origin v1.0.9
```

### 2. CI fails with Prettier errors

**Symptom:** CI shows "Code style issues found"

**Fix:**

```bash
npm run format
git add .
git commit -m "style: Fix Prettier formatting"
git push
```

### 3. Website not updated

**Symptom:** Website still shows old version

**Cause:** Changes not merged to `main` or GitHub Pages deployment pending

**Check:**

```bash
# Check if changes are in main
git log main --oneline -5

# Check latest deployment
gh run list --workflow=ci-enhanced.yml --limit 3
```

**Fix:** Wait 5 minutes for GitHub Pages deployment, or check Actions tab for errors

### 4. Tests failing in CI

**Run tests locally first:**

```bash
npm test
npm run test:unit
npm run test:integration
```

### 5. Build artifacts missing or incomplete

**Check workflow logs:**

```bash
gh run list --workflow=release.yml --limit 1
gh run view <run-id> --log
```

## Verification Steps

After publishing a release:

1. **Check release page:**

   ```bash
   gh release view v1.0.9
   ```

   Should show 8 assets (4 for macOS, 4 for Windows)

2. **Check website:**
   Visit https://johannvalur.github.io/chattio/ and verify download links

3. **Test auto-update:**
   - Install previous version
   - Launch app
   - Check for updates
   - Should detect new version

4. **Test fresh install:**
   - Download DMG from release
   - Install and verify it opens without "damaged" warnings

## Architecture

```
Developer → Feature Branch → PR → main branch
                                      ↓
                                  CI/CD runs
                                      ↓
                         ┌────────────┴────────────┐
                         ↓                         ↓
                  Tests & Linting          Deploy Website
                  Build Verification       (GitHub Pages)
                         ↓
                    All Pass ✓
                         ↓
            Developer creates tag v1.0.9
                         ↓
              Release Workflow Triggers
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
   Build macOS                     Build Windows
   Sign & Notarize                Sign Installer
         ↓                               ↓
         └───────────────┬───────────────┘
                         ↓
              Create DRAFT Release
              Upload all artifacts
                         ↓
         Developer publishes release
                         ↓
              Users get auto-update
```

## Auto-Update Mechanism

When a user has v1.0.8 installed:

1. App checks GitHub Releases every 6 hours
2. Finds `latest-mac.yml` or `latest.yml` in v1.0.9 release
3. Compares versions (1.0.9 > 1.0.8)
4. Downloads ZIP file (not DMG)
5. Shows notification: "Update available"
6. User clicks "Download"
7. App downloads and verifies signature
8. User clicks "Restart & Install"
9. App quits, installs update, relaunches

**Required files for auto-update:**

- macOS: `Chattio-1.0.9-arm64-mac.zip` + `latest-mac.yml`
- Windows: `Chattio-Setup-1.0.9.exe` + `latest.yml`

## Security

All builds are:

- **Signed** with Developer ID (macOS) or certificate (Windows)
- **Notarized** by Apple (macOS)
- **Built on GitHub Actions** (reproducible, auditable)
- **Source code** public on GitHub

Secrets stored in GitHub:

- `MAC_CERT` - P12 certificate (base64)
- `MAC_CERT_PASSWORD` - Certificate password
- `APPLE_ID` - Apple ID for notarization
- `APPLE_APP_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Developer Team ID

## Monitoring

- **Releases:** https://github.com/johannvalur/chattio/releases
- **CI/CD:** https://github.com/johannvalur/chattio/actions
- **Website:** https://johannvalur.github.io/chattio/
- **Download stats:** GitHub Insights → Traffic

## Best Practices

1. **Always test locally before releasing:**

   ```bash
   npm test
   npm run build
   npm run dist:mac  # Test build
   ```

2. **Write clear commit messages:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Formatting
   - `refactor:` - Code restructuring
   - `test:` - Tests
   - `chore:` - Maintenance

3. **Keep PRs focused:**
   - One feature per PR
   - Include tests
   - Update docs

4. **Release notes matter:**
   - Explain what changed
   - Include upgrade notes
   - Link to relevant issues/PRs

5. **Monitor after release:**
   - Check error reports
   - Monitor download stats
   - Watch for user feedback

## Emergency Rollback

If a release has critical issues:

```bash
# Mark as pre-release (hides from auto-update)
gh release edit v1.0.9 --prerelease

# Or delete entirely
gh release delete v1.0.9 --yes
git push origin :refs/tags/v1.0.9

# Users on v1.0.8 will not update
# Fix issues and release v1.0.10
```

## Related Documentation

- [RELEASE_GUIDE.md](../RELEASE_GUIDE.md) - Detailed release instructions
- [RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md) - Pre-release checklist
- [CI/CD Workflow](../.github/workflows/ci-enhanced.yml) - Full CI/CD configuration
- [Release Workflow](../.github/workflows/release.yml) - Release build configuration
