# Code Signing Setup Guide

This guide will help you set up code signing for Chattio so users don't see the "damaged app" error when downloading your app.

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com/programs/
   - You need an active membership to get a Developer ID certificate

## Step 1: Get a Developer ID Certificate

### Option A: Using Xcode (Recommended)

1. Open Xcode
2. Go to **Xcode → Settings → Accounts**
3. Click the **+** button and sign in with your Apple ID
4. Select your team and click **Manage Certificates...**
5. Click the **+** button and select **Developer ID Application**
6. The certificate will be automatically installed in your keychain

### Option B: Using Apple Developer Portal

1. Go to https://developer.apple.com/account/resources/certificates/list
2. Click the **+** button to create a new certificate
3. Select **Developer ID Application** under the **Software** section
4. Follow the instructions to create a Certificate Signing Request (CSR):
   - Open **Keychain Access** app
   - Go to **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority**
   - Enter your email and name, select **Saved to disk**
   - Upload the CSR file to Apple Developer Portal
5. Download the certificate and double-click it to install in your keychain

## Step 2: Verify Certificate Installation

Run this command to verify your certificate is installed:

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

You should see output like:

```
1) ABC123DEF456... "Developer ID Application: Your Name (TEAM_ID)"
```

## Step 3: Configure Environment Variables

You have two options for configuring code signing:

### Option A: Using CSC_NAME (Easier)

Set the certificate name (the part in quotes from the security command, **without** the "Developer ID Application:" prefix):

```bash
export CSC_NAME="Your Name (TEAM_ID)"
```

**Important:** electron-builder will automatically add the "Developer ID Application:" prefix, so you should only provide the name and team ID part.

### Option B: Using CSC_LINK (More Secure)

If your certificate is in a `.p12` file:

1. Export your certificate from Keychain Access:
   - Open Keychain Access
   - Find your "Developer ID Application" certificate
   - Right-click → Export → Save as `.p12` file
   - Set a password when prompted

2. Set environment variables:

```bash
export CSC_LINK="/path/to/your/certificate.p12"
export CSC_KEY_PASSWORD="your-certificate-password"
```

## Step 4: Build with Code Signing

Once the environment variables are set, rebuild the app:

```bash
npm run dist:mac
```

You should see output indicating code signing is happening:

```
• signing         file=dist/mac-arm64/Chattio.app identity=Developer ID Application: Your Name (TEAM_ID)
```

## Step 5: Notarize the App (Required for Distribution)

Notarization is required for macOS 10.15+ to avoid security warnings.

### Set Notarization Environment Variables

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"  # See below for how to create this
export APPLE_TEAM_ID="YOUR_TEAM_ID"  # Found in Apple Developer portal
```

### Create App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in and go to **Security** section
3. Under **App-Specific Passwords**, click **Generate Password**
4. Give it a name (e.g., "Chattio Notarization")
5. Copy the generated password and use it for `APPLE_APP_SPECIFIC_PASSWORD`

### Build with Notarization

```bash
npm run dist:mac
```

Electron Builder will automatically notarize the app after signing. This can take 5-10 minutes.

## Step 6: Verify Code Signing

Check that the app is properly signed:

```bash
codesign -dv --verbose=4 dist/mac-arm64/Chattio.app
```

You should see:

- `Authority=Developer ID Application: Your Name (TEAM_ID)`
- `Signature=adhoc` should NOT appear

Check notarization status:

```bash
spctl --assess --verbose dist/mac-arm64/Chattio.app
```

Should return: `dist/mac-arm64/Chattio.app: accepted source=Developer ID`

## Troubleshooting

### "No identity found" error

- Make sure your certificate is installed in the **login** keychain (not System)
- Verify the certificate name matches exactly what you set in `CSC_NAME`
- **Important:** Don't include "Developer ID Application:" prefix in `CSC_NAME` - use just "Your Name (TEAM_ID)"
- Try unlocking your keychain: `security unlock-keychain ~/Library/Keychains/login.keychain-db`

### "Please remove prefix" error

If you see: `Please remove prefix "Developer ID Application:" from the specified name`

- Remove the "Developer ID Application:" prefix from your `CSC_NAME` or `mac.identity` setting
- Use format: `"Your Name (TEAM_ID)"` instead of `"Developer ID Application: Your Name (TEAM_ID)"`

### Notarization fails

- Check that `APPLE_APP_SPECIFIC_PASSWORD` is an app-specific password, not your regular Apple ID password
- Verify your Apple ID has access to the team
- Check notarization status: `xcrun notarytool history --apple-id YOUR_APPLE_ID --team-id YOUR_TEAM_ID --password YOUR_APP_PASSWORD`

### Still seeing "damaged app" error

- Make sure the app is properly notarized (not just signed)
- Check that you're distributing the notarized version
- Users may need to wait a few minutes after download for notarization to propagate

## Automation

You can create a `.env` file (don't commit it!) to store your credentials:

```bash
# .env (add to .gitignore!)
CSC_NAME="Your Name (TEAM_ID)"  # Without "Developer ID Application:" prefix
APPLE_ID="your-apple-id@example.com"
APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
APPLE_TEAM_ID="YOUR_TEAM_ID"
```

Then load it before building:

```bash
export $(cat .env | xargs)
npm run dist:mac
```

Or use a tool like `dotenv-cli`:

```bash
npm install -D dotenv-cli
npx dotenv -- npm run dist:mac
```

## Additional Resources

- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Electron Builder Code Signing](https://www.electron.build/code-signing)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
