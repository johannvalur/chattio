# Distribution Planning Document

## Mac App Store Distribution

### Requirements:

1. Apple Developer Program membership ($99/year)
2. App Store Connect access
3. Proper code signing certificates and provisioning profiles

### Steps:

1. Set up App Store Connect record
2. Configure App Store specific entitlements
3. Create production certificates and provisioning profiles
4. Update build configuration for App Store distribution
5. Test with TestFlight
6. Submit for review

## Outside Mac App Store Distribution

### Requirements:

1. Apple Developer ID Application certificate
2. Apple Developer ID Installer certificate
3. Notarization requirements

### Steps:

1. Generate Developer ID Application and Installer certificates
2. Update build configuration for distribution:
   ```json
   "mac": {
     "category": "public.app-category.social-networking",
     "target": ["dmg", "zip"],
     "icon": "public/icons/icon.icns",
     "hardenedRuntime": true,
     "gatekeeperAssess": true,
     "entitlements": ".entitlements/entitlements.mac.plist",
     "entitlementsInherit": ".entitlements/entitlements.mac.plist",
     "type": "distribution",
     "identity": "Your Developer ID Application: Your Name (TEAMID)"
   }
   ```
3. Set environment variables for code signing:
   ```bash
   export CSC_LINK=path/to/your/developerID_application.p12
   export CSC_KEY_PASSWORD=your_password
   export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
   ```
4. Build with distribution mode:
   ```bash
   npm run dist:mac
   ```
5. Notarize the app (handled by electron-builder if configured correctly)
6. Test the notarized app
7. Distribute via direct download or update server

## Testing

- Test on clean macOS installation
- Verify Gatekeeper acceptance
- Check for proper permissions and entitlements
- Test auto-update functionality
