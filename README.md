# Unified Messenger

A unified messaging application for Mac that combines multiple messaging platforms into one window.

## Features

- Access multiple messaging platforms in one window
- Tabbed interface for easy switching between services
- Native macOS look and feel
- Keyboard shortcuts for quick navigation
- Support for Messenger, WhatsApp, Instagram, and LinkedIn

## Prerequisites

- Node.js (v16 or later)
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

## License

MIT

## Credits

Created with ❤️ using Electron
