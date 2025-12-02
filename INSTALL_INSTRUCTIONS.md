# Installation Instructions for Chattio

## ⚠️ Important: "Damaged App" Error Fix

If macOS shows **"Chattio.app is damaged and can't be opened"**, this is a security feature called Gatekeeper. Here's how to fix it:

### Quick Fix (Recommended)

**Option 1: Use the Fix Script**
1. Download the app
2. Open Terminal
3. Run: `./scripts/fix-damaged-app.sh ~/Downloads/Chattio.app`
   (Adjust the path if you downloaded it elsewhere)

**Option 2: Right-Click Method**
1. Right-click (or Control-click) the `Chattio.app` file
2. Select **"Open"** from the context menu
3. Click **"Open"** again in the security dialog
4. The app will now open normally

**Option 3: Remove Quarantine Manually**
```bash
xattr -d com.apple.quarantine ~/Downloads/Chattio.app
```

### Why This Happens

macOS adds a "quarantine" attribute to files downloaded from the internet. This is a security feature. The app is actually safe - it just needs this attribute removed.

### Permanent Solution

For a better user experience (no "damaged app" error), the app needs to be:
1. **Code signed** ✅ (Already done)
2. **Notarized** ❌ (Requires Apple Developer credentials)

See [CODE_SIGNING.md](./CODE_SIGNING.md) for instructions on notarizing the app.

## Installation Steps

1. **Download** the latest `Chattio-*.dmg` or `Chattio-*.zip` file
2. **Open** the DMG or extract the ZIP
3. **Drag** `Chattio.app` to your Applications folder
4. **Fix** the "damaged app" error using one of the methods above
5. **Launch** Chattio from Applications

## Troubleshooting

### Still seeing "damaged app" after removing quarantine?

- Make sure you removed quarantine from the app in **Applications**, not just the download
- Try right-clicking and selecting "Open" twice
- Check that the app is properly code signed: `codesign -dv --verbose=4 /Applications/Chattio.app`

### App won't launch?

- Check Console.app for error messages
- Make sure you have the latest macOS version
- Try downloading again in case the file was corrupted

### Need Help?

- Check [README.md](./README.md) for more information
- See [CODE_SIGNING.md](./CODE_SIGNING.md) for code signing setup
- Open an issue on GitHub if you encounter problems

