# Chattio - Unified Messaging Client

![Chattio Logo](public/logo3.png)

A modern, unified messaging application for Mac that combines multiple messaging platforms into one elegant window.

## ✨ Features

- **Unified Inbox**: Access all your messages in one place
- **Multi-Platform Support**:
  - Facebook Messenger
  - WhatsApp
  - Instagram Direct
  - LinkedIn Messaging
  - More coming soon!
- **Native Experience**:
  - macOS-style notifications
  - System tray integration
  - Global keyboard shortcuts
  - Dark/Light theme support
- **Productivity Boost**:
  - Tabbed interface
  - Quick reply from notifications
  - Do Not Disturb mode
  - Message search

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ and npm v7+
- macOS 10.15+ (for building)
- Xcode Command Line Tools

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/chattio.git
   cd chattio
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

### Building for Production

```bash
# For development
npm run dist:mac

# For production (signed and notarized)
CSC_NAME="Your Developer ID" npm run dist:mac
```

## ⚠️ Installation Note

If you see "Chattio.app is damaged and can't be opened" after downloading:

1. Right-click the app → Select "Open" (you may need to do this twice)
2. Or run: `./scripts/fix-damaged-app.sh ~/Downloads/Chattio.app`

For detailed installation instructions, see [INSTALL_INSTRUCTIONS.md](./INSTALL_INSTRUCTIONS.md).

## 🛠 Development

### Project Structure

```
chattio/
├── build/          # Build configurations
├── public/         # Static assets
├── scripts/        # Build and utility scripts
├── src/            # Application source
│   ├── main/       # Main process code
│   └── renderer/   # Renderer process code
└── tests/          # Test suites
```

### Scripts

- `npm start` - Start in development mode
- `npm test` - Run all tests
- `npm run dist` - Build for current platform
- `npm run clean` - Clean build artifacts

### Code Style

We use:

- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety (migration in progress)

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](.github/CONTRIBUTING.md) before submitting pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Electron team for the amazing framework
- All contributors who helped improve this project
- The open-source community

## Running in Development

```bash
npm start
```

### Automatic updates

Chattio now ships with an auto-updater powered by `electron-updater`. Packaged builds periodically poll the latest GitHub Release for new binaries and prompt the user to download/install the update. You can also trigger a manual check from the **Chattio ▸ Check for Updates…** (macOS) or **File ▸ Check for Updates…** (Windows) menu item.

To publish an update feed:

1. Set `GH_TOKEN` (a GitHub Personal Access Token with `repo` scope).
2. Run `npm run dist:mac -- --publish always` (or the equivalent `dist:win` command).
3. Attach the generated artifacts to the release GitHub creates. Electron Builder will also upload the `latest-*.yml` metadata so the auto-updater can discover the new version.

Development builds skip auto-update checks entirely.

## Testing

```bash
# Run specific suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Or run everything
npm test
```

Unit and integration suites run under Jest + jsdom. End-to-end tests use Playwright and exercise the marketing site located in `chatterly/`.

### Test runner shim

macOS Ventura/Sonoma mark npm-installed packages with a provenance attribute that prevents Node from reading certain files (notably `@jest/test-sequencer`). To keep the default Jest behavior without mutating `node_modules`, every Jest command is executed via `scripts/register-test-sequencer.js`. If you invoke Jest manually, pass `-r ./scripts/register-test-sequencer.js` or run through the provided npm scripts to avoid `Cannot find module '@jest/test-sequencer'`.

### Playwright web server

The Playwright config starts a thin static server (`scripts/serve-chatterly.js`) that binds explicitly to `127.0.0.1`. This avoids the `uv_interface_addresses` errors that `http-server` triggers in sandboxed environments. If you need a different port or root, pass them to the script (e.g. `node scripts/serve-chatterly.js 5000 chatterly`).

> **Note:** Some CI sandboxes block binding to loopback addresses entirely and will surface `EPERM: listen 127.0.0.1`. In that case run the e2e suite on a workstation or self-hosted runner with network permissions.

## Deployment

GitHub Actions (`.github/workflows/ci.yml`) runs the full test matrix on every push/pull request. Successful pushes to `main` automatically publish the static `chatterly/` bundle to GitHub Pages.

## Building for Production

### Build .app Bundle

```bash
npm run dist:mac
```

The application bundle will be created in the `dist/mac` directory.

### Create DMG Installer

```bash
npm run dist:mac
# The DMG file will be created in the 'dist' directory
```

### Build Windows installer

```bash
npm run dist:win
```

This produces a signed (unsigned by default) `exe`/NSIS installer under `dist/`.

After any successful `dist:*` run, publish the binaries to the marketing site so the download buttons stay fresh:

```bash
npm run sync:downloads
```

This copies the latest `.dmg`, `.zip`, and `.exe` artifacts from `dist/` into `chatterly/downloads/`.

### macOS code signing & notarization

The repository ships unsigned macOS builds by default. To distribute outside of Gatekeeper warnings, you need to code sign and notarize your app.

**📖 See [CODE_SIGNING.md](./CODE_SIGNING.md) for detailed step-by-step instructions.**

Quick setup:

1. Get an Apple Developer account ($99/year)
2. Install a "Developer ID Application" certificate
3. Set environment variables: `CSC_NAME`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
4. Run `npm run dist:mac` - signing and notarization happen automatically

Without code signing, Electron Builder will emit "skipped macOS application code signing" and users will see the "damaged app" error.

## Downloads

Every successful deploy on `main`/`master` builds the macOS `.dmg/.zip` and Windows `.exe` installers and places them in the static `chatterly/downloads/` directory before pushing to GitHub Pages. Visit your Pages site (e.g. `https://<your-username>.github.io/chatterly/`) and grab the latest binaries under `/downloads/`.

## Keyboard Shortcuts

- `Cmd + 1`: Switch to Messenger
- `Cmd + 2`: Switch to WhatsApp
- `Cmd + 3`: Switch to Instagram
- `Cmd + 4`: Switch to LinkedIn

## Customization

### Changing the Icon

1. Replace `public/transparent.png` with your own square PNG
2. Run `npm run generate-icons` to regenerate `public/icons/*`
3. Rebuild the application

## Troubleshooting

### Icon Generation Issues

If you encounter issues with icon generation, ensure you have the following installed:

- ImageMagick (`brew install imagemagick`)
- Proper permissions to execute scripts

### Build Issues

If the build fails, try:

1. Deleting `node_modules` and `package-lock.json`
2. Running `npm install` again
3. Ensuring all build dependencies are installed

### "App is damaged" Error on macOS

If macOS shows "Chattio.app is damaged and can't be opened", this is a Gatekeeper security feature blocking unsigned apps. To fix:

**Option 1 (Easiest):** Use the provided script:

```bash
./scripts/remove-quarantine.sh /path/to/Chattio.app
```

**Option 2:** Manually remove the quarantine attribute:

```bash
xattr -d com.apple.quarantine /path/to/Chattio.app
```

**Option 3:** Right-click the app and select "Open" from the context menu. You may need to do this twice - first time shows a warning, second time opens the app.

**Option 4:** For proper distribution, code sign the app with an Apple Developer ID certificate (see "macOS code signing & notarization" section above). This is required for distributing to users without them seeing this error.

## License

MIT

## Credits

Created with ❤️ using Electron
