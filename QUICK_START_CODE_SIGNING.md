# Quick Start: Code Signing Setup

## ✅ Step 2 Complete: Certificate Found!

Your Developer ID certificate is already installed:

- **Certificate:** `Developer ID Application: Jóhann Sævarsson (QD9KBHBRRZ)`
- **Team ID:** `QD9KBHBRRZ`

## 🔧 Step 3: Set Up Environment Variables

### Option 1: Use the Setup Script (Recommended)

```bash
# Load the certificate and team ID
source scripts/setup-code-signing.sh

# Then set your Apple ID credentials
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
```

### Option 2: Set Manually

```bash
export CSC_NAME="Developer ID Application: Jóhann Sævarsson (QD9KBHBRRZ)"
export APPLE_TEAM_ID="QD9KBHBRRZ"
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
```

## 🔑 Getting Your App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to **Security** section
4. Under **App-Specific Passwords**, click **Generate Password**
5. Give it a name: "Chattio Notarization"
6. Copy the generated password (you'll only see it once!)
7. Use it for `APPLE_APP_SPECIFIC_PASSWORD`

**Important:** This is NOT your regular Apple ID password. It's a special app-specific password that Apple generates.

## 🚀 Build with Code Signing

Once all variables are set:

```bash
npm run dist:mac
```

You should see:

- `• signing` in the output
- `• notarizing` in the output (takes 5-10 minutes)

## 📝 Save for Future Use

To avoid setting these every time, you can create a `.env` file (it's already in `.gitignore`):

```bash
# .env (don't commit this!)
CSC_NAME="Developer ID Application: Jóhann Sævarsson (QD9KBHBRRZ)"
APPLE_TEAM_ID="QD9KBHBRRZ"
APPLE_ID="your-apple-id@example.com"
APPLE_ID_PASSWORD="your-app-specific-password"
```

Then load it before building:

```bash
export $(cat .env | xargs)
npm run dist:mac
```

## ✅ Verify It Worked

After building, check the app is signed:

```bash
codesign -dv --verbose=4 dist/mac-arm64/Chattio.app | grep "Authority"
```

Should show: `Authority=Developer ID Application: Jóhann Sævarsson (QD9KBHBRRZ)`

Check notarization (requires APPLE_ID credentials to be set):

```bash
spctl --assess --verbose dist/mac-arm64/Chattio.app
```

**Note:** If you see `rejected source=Unnotarized Developer ID`, you need to:

1. Set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` environment variables
2. Rebuild - notarization will happen automatically (takes 5-10 minutes)

Once notarized, should show: `accepted source=Developer ID`
