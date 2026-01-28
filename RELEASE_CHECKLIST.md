# Release Checklist

Use this checklist for creating a new release with proper code signing and notarization.

## Pre-Release Checklist

- [ ] All code changes are committed and pushed
- [ ] Tests pass locally: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] App builds successfully: `npm run build`
- [ ] Manual testing completed
- [ ] Release notes drafted

## Release Process

### 1. Version Bump

```bash
# Choose one:
npm version patch  # 1.0.7 → 1.0.8 (bug fixes)
npm version minor  # 1.0.7 → 1.1.0 (new features)
npm version major  # 1.0.7 → 2.0.0 (breaking changes)
```

### 2. Update Website Download Links

Edit `chattio/index.html` and update version numbers:

```html
<!-- Windows link (around line 412) -->
href="https://github.com/johannvalur/chattio/releases/download/v1.0.X/Chattio-Setup-1.0.X.exe"
<span>Signed Win64 installer · v1.0.X</span>

<!-- macOS link (around line 425) -->
href="https://github.com/johannvalur/chattio/releases/download/v1.0.X/Chattio-1.0.X-arm64.dmg"
<span>Signed & Notarized · v1.0.X</span>
```

### 3. Commit Changes

```bash
git add package.json chattio/index.html
git commit -m "chore: Bump version to v1.0.X"
git push
```

### 4. Create and Push Tag

```bash
git tag v1.0.X
git push origin v1.0.X
```

### 5. Monitor CI/CD Build

- Go to: https://github.com/johannvalur/chattio/actions
- Wait for both macOS and Windows builds to complete (~3-5 minutes)
- Verify both jobs show green checkmarks

### 6. Publish Release

```bash
# Edit the draft release
gh release edit v1.0.X --draft=false --repo johannvalur/chattio \
  --title "v1.0.X - Release Title" \
  --notes "$(cat <<'EOF'
## What's New

- Feature 1
- Feature 2

## Bug Fixes

- Fix 1
- Fix 2

## Installation

Download the installer for your platform below.

**macOS:** Fully signed and notarized - opens without security warnings
**Windows:** Signed installer

EOF
)"
```

### 7. Sync to Main Branch

```bash
# Create PR from master to main
gh pr create --base main --head master \
  --title "chore: Sync v1.0.X to main" \
  --body "Syncing version 1.0.X release for website deployment" \
  --repo johannvalur/chattio

# Merge the PR
gh pr merge --merge --repo johannvalur/chattio
```

### 8. Verify Deployment

- [ ] Check release page: https://github.com/johannvalur/chattio/releases/tag/v1.0.X
- [ ] Verify DMG and EXE files are attached
- [ ] Verify `latest-mac.yml` and `latest.yml` are present
- [ ] Download and test the DMG (should open without "damaged" error)
- [ ] Check website shows correct version (may take a few minutes)

## Post-Release Checklist

- [ ] Release published on GitHub
- [ ] Website updated with new version
- [ ] DMG opens without security warnings
- [ ] Auto-updater works (test with previous version)
- [ ] Release notes are clear and accurate
- [ ] Social media announcement (optional)

## Troubleshooting

### Build Fails in CI/CD

**Check GitHub Actions logs:**
```bash
gh run list --repo johannvalur/chattio --limit 5
gh run view <run-id> --log-failed
```

**Common issues:**
- Missing secrets: Verify all GitHub secrets are set
- Linting errors: Run `npm run lint:fix` locally
- Format errors: Run `npm run format` locally

### "App is Damaged" Error

This means notarization failed or wasn't performed. Check:

1. **Verify secrets are set:**
   ```bash
   gh secret list --repo johannvalur/chattio
   ```

2. **Check build logs for notarization:**
   Look for "notarizing" in the macOS build job logs

3. **Manual fix for users:**
   ```bash
   xattr -cr /Applications/Chattio.app
   ```

### Auto-Update Not Working

**Verify release structure:**
- DMG and ZIP must both be present
- `latest-mac.yml` must have correct SHA512 and size
- Release must be published (not draft)
- Version number must be higher than installed version

## GitHub Secrets Reference

Required secrets (already configured):

| Secret | Description |
|--------|-------------|
| `MAC_CERT` | Base64-encoded P12 certificate |
| `MAC_CERT_PASSWORD` | Certificate password |
| `APPLE_ID` | Apple ID email |
| `APPLE_APP_PASSWORD` | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Team ID (QD9KBHBRRZ) |

## Automated vs Manual

### ✅ Use Automated (CI/CD) When:
- Making regular releases
- Want proper code signing and notarization
- Need both macOS and Windows builds
- Have GitHub secrets configured

### ⚠️ Use Manual When:
- CI/CD is broken
- Testing release process
- Need immediate local build
- Developing/debugging release workflow
