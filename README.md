# Chattio

A unified messaging application for Mac that combines multiple messaging platforms into one window.

## Features

- Access multiple messaging platforms in one window
- Tabbed interface for easy switching between services
- Native macOS look and feel
- Keyboard shortcuts for quick navigation
- Support for Messenger, WhatsApp, Instagram, LinkedIn, and more
- **Memory Optimization**: Efficient WebView management with automatic cleanup
- **Virtual Scrolling**: Smooth performance with large message lists
- **Resource Management**: Optimized WebView settings for better performance
- **Modern Build System**: Webpack-based build process with hot-reloading in development

## ⚠️ Installation Note

**If you see "Chattio.app is damaged and can't be opened" after downloading:**

This is a macOS security feature. The app is safe to use. Quick fix:

1. Right-click the app → Select "Open" (you may need to do this twice)
2. Or run: `./scripts/fix-damaged-app.sh ~/Downloads/Chattio.app`

See [INSTALL_INSTRUCTIONS.md](./INSTALL_INSTRUCTIONS.md) for detailed installation steps.

**For developers:** To avoid this error for users, the app needs to be notarized. See [CODE_SIGNING.md](./CODE_SIGNING.md).

## Development

### Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Build Commands

- `npm run dev`: Start development server with hot-reloading
- `npm run build`: Create a production build
- `npm run dist`: Package the application for distribution
- `npm run dist:mac`: Build for macOS
- `npm run dist:win`: Build for Windows

## Project Structure

- `src/`: Application source code
  - `main/`: Main process code
  - `renderer/`: Renderer process code
  - `lib/`: Shared utilities and services
- `public/`: Static assets
- `tests/`: Test files
- `webpack/`: Webpack configuration files

## Build System

The project uses Webpack for both development and production builds:

- **Development**:
  - Hot module replacement
  - Source maps for debugging
  - Fast incremental builds

- **Production**:
  - Minification and tree-shaking
  - Asset optimization
  - Environment-specific configurations
- npm (v7 or later)
- macOS (for building the .app or .dmg)
- Xcode Command Line Tools (for building)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/unified-messenger.git
   cd unified-messenger
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Install required tools (if not already installed):
   ```bash
   # Install ImageMagick for icon generation
   brew install imagemagick
   ```

## Running in Development

```bash
npm start
```

### Memory Management

Chattio includes several optimizations to manage memory usage:

- **WebView Recycling**: Only a limited number of WebViews are kept in memory (default: 3)
- **Automatic Cleanup**: Inactive WebViews are automatically unloaded after 5 minutes
- **Optimized Settings**: WebViews use optimized settings for better performance and lower memory usage

### Virtual Scrolling

Message lists use virtual scrolling to maintain performance with large numbers of messages:

- Only visible messages are rendered in the DOM
- Smooth scrolling experience with minimal memory usage
- Automatic cleanup of off-screen elements

To use virtual scrolling in your message lists, add the `message-list` class to your container element and initialize a new `VirtualScroller` instance.

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

## Performance Tips

1. **Reduce Active Tabs**: Keep only frequently used tabs open to minimize memory usage
2. **Use Keyboard Shortcuts**: Quickly switch between tabs using keyboard shortcuts
3. **Monitor Performance**: Check the built-in performance monitor in developer tools
4. **Update Regularly**: Keep the app updated for the latest performance improvements

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

<!-- Trigger CI/CD update -->
