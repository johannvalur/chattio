# Release Guide

This guide explains how to release new versions of Chattio with automatic updates.

## Quick Release Process

### Option 1: Automated Release (Recommended)

1. **Bump the version:**

   ```bash
   npm run version:patch  # for 1.0.1 -> 1.0.2
   # OR
   npm run version:minor  # for 1.0.1 -> 1.1.0
   # OR
   npm run version:major  # for 1.0.1 -> 2.0.0
   ```

   This will:
   - Update the version in `package.json`
   - Create a git commit
   - Create a git tag

2. **Push the tag to GitHub:**

   ```bash
   git push && git push --tags
   ```

3. **Wait for GitHub Actions:**
   - The release workflow will automatically build and publish to GitHub Releases
   - Monitor progress at: https://github.com/johannvalur/chattio/actions

### Option 2: Manual Release

1. **Bump version in package.json:**

   ```bash
   npm run version:patch
   ```

2. **Build the app:**

   ```bash
   npm run release:mac
   ```

   This requires a GitHub token:

   ```bash
   export GITHUB_TOKEN=your_github_token
   npm run release:mac
   ```

3. **Push changes:**
   ```bash
   git push && git push --tags
   ```

## How Auto-Updates Work

### For Users

1. The app checks for updates every 6 hours (and 30 seconds after launch)
2. When an update is available, users see a dialog
3. They can download and install immediately or defer
4. After download, they can restart to apply the update

### Technical Details

- **Update source:** GitHub Releases
- **Repository:** `johannvalur/chattio`
- **Update channel:** `latest`
- **Supported formats:**
  - macOS: DMG and ZIP
  - Windows: NSIS installer (.exe)

### Update Flow

```
User launches app
    ↓ (30 seconds)
Check for updates (automatic)
    ↓
If new version exists on GitHub Releases
    ↓
Download update
    ↓
Prompt user to restart
    ↓
Install and relaunch
```

## Requirements for Updates to Work

### 1. Version Number

- Must be higher than the current installed version
- Use semantic versioning (e.g., 1.0.0, 1.0.1, 1.1.0)

### 2. GitHub Release

- Must be a published release (not a draft)
- Must include the built artifacts:
  - **macOS:** `Chattio-X.X.X-arm64.dmg`, `Chattio-X.X.X-arm64-mac.zip`, `latest-mac.yml`
  - **Windows:** `Chattio Setup X.X.X.exe`, `latest.yml`

### 3. Release Tag

- Must follow the pattern `vX.X.X` (e.g., `v1.0.1`)
- Tag name must match the version in package.json

## Troubleshooting

### Updates Not Detected

1. **Check the version number:**

   ```bash
   cat package.json | grep version
   ```

   Ensure it's higher than the deployed version.

2. **Verify GitHub Release exists:**
   - Go to: https://github.com/johannvalur/chattio/releases
   - Ensure the release is published (not draft)
   - Check that artifacts are attached

3. **Check for errors in the app:**
   - Open DevTools: `Cmd+Alt+I`
   - Look for update-related errors in the console

4. **Test manually:**
   - Use "Check for Updates" in the app menu
   - This will show detailed error messages

### Build Issues

1. **Missing dependencies:**

   ```bash
   npm ci
   ```

2. **Build fails:**

   ```bash
   npm run clean
   npm run build
   npm run dist:mac
   ```

3. **GitHub token issues:**
   ```bash
   # Create a token at: https://github.com/settings/tokens
   # Needs 'repo' scope
   export GITHUB_TOKEN=your_token_here
   ```

## Version Numbering Guidelines

- **Patch (1.0.0 → 1.0.1):** Bug fixes, minor changes
- **Minor (1.0.0 → 1.1.0):** New features, backward compatible
- **Major (1.0.0 → 2.0.0):** Breaking changes, major overhaul

## GitHub Token Setup

For manual releases, you need a GitHub Personal Access Token:

1. Go to: https://github.com/settings/tokens/new
2. Name: "Chattio Release Token"
3. Scopes: Select `repo` (all permissions)
4. Click "Generate token"
5. Copy the token and set it:
   ```bash
   export GITHUB_TOKEN=ghp_your_token_here
   ```

For automated releases via GitHub Actions, the token is provided automatically.

## Monitoring Releases

- **GitHub Releases:** https://github.com/johannvalur/chattio/releases
- **GitHub Actions:** https://github.com/johannvalur/chattio/actions
- **Download Stats:** Available in GitHub Insights

## Best Practices

1. **Test before releasing:**

   ```bash
   npm run dist:mac  # Build without publishing
   # Test the DMG in dist/ folder
   ```

2. **Cross-platform builds:**
   - macOS can only build macOS apps locally
   - Windows can only build Windows apps locally
   - Use GitHub Actions for automated cross-platform releases
   - The workflow automatically builds both platforms

3. **Write release notes:**
   - Add a description to your GitHub Release
   - Include what's new, what's fixed, and known issues

4. **Version consistently:**
   - Use `npm run version:*` commands
   - Don't manually edit version numbers

5. **Keep changelog:**
   - Document changes in each release
   - Help users understand what's new
