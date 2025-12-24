# Code Signing Setup for GitHub Actions

This guide will help you set up automatic code signing and notarization for macOS builds in GitHub Actions.

## Why Code Signing?

Without code signing, macOS users will see "damaged app" errors because of Gatekeeper. Signing and notarizing your app ensures:

- ✅ No "damaged app" warnings
- ✅ Users can open the app directly
- ✅ Professional distribution
- ✅ Auto-updates work properly

## Prerequisites

- Apple Developer Account ($99/year)
- Developer ID certificate installed in Keychain
- App-specific password for notarization

## Step 1: Export Your Certificate

On your Mac, run these commands:

```bash
# 1. Find your Developer ID Application certificate
security find-identity -v -p codesigning

# Look for: "Developer ID Application: Your Name (TEAM_ID)"
# Copy the full identity name or hash

# 2. Export the certificate to a .p12 file
# Replace "Developer ID Application: Your Name (TEAM_ID)" with your identity
security export -t identities -k login.keychain \
  -f pkcs12 -P "temporary_password" \
  -o ~/Desktop/certificate.p12 \
  "Developer ID Application: Your Name (TEAM_ID)"

# Or use the interactive dialog:
security export -t identities -f pkcs12 -o ~/Desktop/certificate.p12

# 3. Convert to base64
base64 -i ~/Desktop/certificate.p12 | pbcopy

# The base64 string is now in your clipboard
# IMPORTANT: Delete certificate.p12 after use!
```

## Step 2: Create App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to "Security" → "App-Specific Passwords"
4. Click "+" to generate a new password
5. Name it "Chattio GitHub Actions"
6. Copy the password (it won't be shown again)

## Step 3: Add GitHub Secrets

1. Go to: https://github.com/johannvalur/chattio/settings/secrets/actions
2. Click "New repository secret" for each:

| Secret Name          | Value               | Description                                  |
| -------------------- | ------------------- | -------------------------------------------- |
| `MAC_CERT`           | Base64 certificate  | The output from the `base64` command above   |
| `MAC_CERT_PASSWORD`  | Your password       | Password used when exporting the .p12 file   |
| `APPLE_ID`           | your@email.com      | Your Apple ID email                          |
| `APPLE_APP_PASSWORD` | xxxx-xxxx-xxxx-xxxx | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID`      | QD9KBHBRRZ          | Your Team ID (found in developer.apple.com)  |

## Step 4: Verify Workflow Configuration

The `.github/workflows/release.yml` file is already configured to use these secrets. It will:

- ✅ Sign the app with your Developer ID
- ✅ Notarize with Apple
- ✅ Staple the notarization ticket
- ✅ Create a signed DMG

## Step 5: Test the Setup

1. Make a small change and bump version:

   ```bash
   npm run version:patch
   ```

2. Push the tag:

   ```bash
   git push && git push --tags
   ```

3. Monitor the build:
   - Go to: https://github.com/johannvalur/chattio/actions
   - Watch for any errors in the "Build and release" step

4. Check the release:
   - Download the DMG
   - Open it on a Mac
   - Should open without "damaged app" warning

## Troubleshooting

### "No identity found" Error

- Make sure you have a Developer ID Application certificate
- Run: `security find-identity -v -p codesigning`
- If none found, create one at: https://developer.apple.com/account/resources/certificates

### "Notarization failed" Error

- Check that APPLE_ID and APPLE_APP_PASSWORD are correct
- Ensure your app is signed before notarization
- Check the notarization logs in the GitHub Actions output

### "Certificate expired" Error

- Developer ID certificates last 5 years
- Renew at: https://developer.apple.com/account/resources/certificates
- Re-export and update MAC_CERT secret

### Still Getting "Damaged App" Warning

If signing is set up but users still see warnings:

1. They may have downloaded an old unsigned build
2. Tell them to run: `xattr -cr /Applications/Chattio.app`
3. Or provide the removal script in `scripts/remove-quarantine.sh`

## Without Code Signing

If you don't have an Apple Developer account yet, the workflow will build unsigned apps.

Users will need to:

1. Right-click the app
2. Select "Open"
3. Click "Open" in the warning dialog

Or run:

```bash
xattr -cr /Applications/Chattio.app
```

## Security Notes

- ⚠️ Never commit the .p12 file or password to git
- ✅ GitHub Secrets are encrypted and safe
- ✅ Only repository collaborators can see/use secrets
- ✅ Secrets are not exposed in logs
- 🔄 Rotate your app-specific password yearly

## Additional Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
