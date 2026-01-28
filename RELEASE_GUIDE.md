# Release Guide

This guide explains how to release new versions of Chattio with automatic updates.

## Quick Release Process

### Option 1: Automated Release via GitHub Actions (Recommended)

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

### Option 2: Manual Local Release

If GitHub Actions fails or you need to build locally, follow these steps.

#### Important: iCloud Drive Workaround

If your project is in an iCloud-synced folder (like `~/Documents`), you **must** build to a non-iCloud location to avoid codesigning errors. iCloud adds extended attributes that cause the error:

```
resource fork, Finder information, or similar detritus not allowed
```

#### Step-by-Step Manual Release

1. **Bump version and commit:**

   ```bash
   npm run version:patch
   git push && git push --tags
   ```

2. **Build the application:**

   ```bash
   npm run build
   ```

3. **Build unsigned Mac app to /tmp:**

   ```bash
   npx electron-builder --mac --publish never \
     -c.mac.identity=null \
     -c.directories.output=/tmp/chattio-dist
   ```

4. **Clean extended attributes and sign:**

   ```bash
   # Clear any extended attributes
   xattr -cr /tmp/chattio-dist/mac-arm64/Chattio.app

   # Sign with your Developer ID certificate
   codesign --sign "YOUR_CERTIFICATE_ID" \
     --force --timestamp --options runtime \
     --entitlements build/entitlements.mac.plist \
     --deep /tmp/chattio-dist/mac-arm64/Chattio.app
   ```

   Find your certificate ID with:

   ```bash
   security find-identity -v -p codesigning | grep "Developer ID"
   ```

5. **Create DMG from signed app:**

   ```bash
   hdiutil create -volname "Chattio" \
     -srcfolder /tmp/chattio-dist/mac-arm64/Chattio.app \
     -ov -format UDZO \
     /tmp/chattio-dist/Chattio-X.X.X-arm64.dmg

   # Sign the DMG
   codesign --sign "YOUR_CERTIFICATE_ID" --timestamp \
     /tmp/chattio-dist/Chattio-X.X.X-arm64.dmg
   ```

6. **Create ZIP for auto-updater:**

   ```bash
   cd /tmp/chattio-dist/mac-arm64
   ditto -c -k --keepParent Chattio.app \
     /tmp/chattio-dist/Chattio-X.X.X-arm64-mac.zip
   ```

7. **Generate latest-mac.yml:**

   ```bash
   cd /tmp/chattio-dist
   SHA512=$(shasum -a 512 Chattio-X.X.X-arm64-mac.zip | cut -d' ' -f1 | xxd -r -p | base64)
   SIZE=$(stat -f%z Chattio-X.X.X-arm64-mac.zip)

   cat > latest-mac.yml << EOF
   version: X.X.X
   files:
     - url: Chattio-X.X.X-arm64-mac.zip
       sha512: ${SHA512}
       size: ${SIZE}
   path: Chattio-X.X.X-arm64-mac.zip
   sha512: ${SHA512}
   releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
   EOF
   ```

8. **Upload to GitHub Release:**

   ```bash
   # If release doesn't exist, create it
   gh release create vX.X.X --title "vX.X.X" --draft \
     --repo johannvalur/chattio

   # Upload assets
   gh release upload vX.X.X \
     /tmp/chattio-dist/Chattio-X.X.X-arm64.dmg \
     /tmp/chattio-dist/Chattio-X.X.X-arm64-mac.zip \
     /tmp/chattio-dist/latest-mac.yml \
     --repo johannvalur/chattio --clobber

   # Publish the release
   gh release edit vX.X.X --draft=false --repo johannvalur/chattio
   ```

9. **Optional: Notarize the app:**

   ```bash
   # First, store credentials (one-time setup)
   xcrun notarytool store-credentials "notarytool-password" \
     --apple-id "your@email.com" \
     --team-id "YOUR_TEAM_ID"

   # Notarize the DMG
   xcrun notarytool submit /tmp/chattio-dist/Chattio-X.X.X-arm64.dmg \
     --keychain-profile "notarytool-password" --wait

   # Staple the notarization ticket
   xcrun stapler staple /tmp/chattio-dist/Chattio-X.X.X-arm64.dmg
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

### macOS Codesigning Errors

**Error:** `resource fork, Finder information, or similar detritus not allowed`

**Cause:** Your project folder is synced with iCloud Drive, which adds extended attributes (`com.apple.fileprovider.fpfs#P`, `com.apple.FinderInfo`) that macOS codesign rejects.

**Solution:** Build to a non-iCloud location like `/tmp`:

```bash
# Build unsigned to /tmp
npx electron-builder --mac --publish never \
  -c.mac.identity=null \
  -c.directories.output=/tmp/chattio-dist

# Clean attributes
xattr -cr /tmp/chattio-dist/mac-arm64/Chattio.app

# Sign manually
codesign --sign "YOUR_CERT_ID" --force --timestamp \
  --options runtime --entitlements build/entitlements.mac.plist \
  --deep /tmp/chattio-dist/mac-arm64/Chattio.app
```

See "Option 2: Manual Local Release" above for the complete process.

**Alternative:** Temporarily move the project outside of iCloud:

```bash
mv ~/Documents/Chattio /tmp/Chattio-build
cd /tmp/Chattio-build
npm run release:mac
mv /tmp/Chattio-build ~/Documents/Chattio
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
