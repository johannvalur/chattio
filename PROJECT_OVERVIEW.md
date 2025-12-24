# Chattio - Project Overview

## Goal

Chattio is a unified messaging application for Mac that combines multiple messaging platforms into a single, native-feeling window. It provides a seamless experience for users who want to access their various messaging services in one place.

## Users

- **Primary**: Mac users who use multiple messaging platforms and want a unified interface
- **Secondary**: Power users who value keyboard navigation and native desktop integration
- **Tertiary**: Users who want to reduce browser tab clutter from multiple messaging services

## Tech Stack

- **Frontend**: Electron, HTML5, CSS3, JavaScript
- **Build Tools**: electron-builder, npm scripts
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **Packaging**: DMG for macOS, EXE for Windows
- **CI/CD**: GitHub Actions

## Architecture

- **Main Process**: Handles window management, native integrations, and inter-process communication
- **Renderer Process**: Manages the UI and web views for different messaging services
- **Services**: Authentication, message synchronization, and platform integrations
- **Build System**: Electron Forge for packaging and distribution

## Project Structure

```
.
├── build/               # Build configuration and assets
├── chattio/          # Web assets and downloads
│   └── downloads/      # Platform-specific builds
├── public/             # Static assets and icons
├── scripts/            # Build and utility scripts
├── src/                # Application source code
│   └── lib/           # Shared libraries and utilities
├── tests/              # Test suites
│   ├── e2e/           # End-to-end tests
│   ├── integration/   # Integration tests
│   └── unit/          # Unit tests
└── .github/workflows/  # CI/CD pipelines
```

## Constraints

- Must maintain native macOS/Windows look and feel
- Must handle multiple web views efficiently
- Needs to work with various messaging platform web interfaces
- Must respect platform-specific security requirements (notarization, code signing)

## Current State

- **Status**: Production
- **Version**: 1.0.0
- **Platforms**: macOS (primary), Windows (secondary)
- **Stability**: Stable core functionality

## Priorities (Current Phase)

1. **Stability**: Ensure reliable operation across all supported platforms
2. **User Experience**: Maintain native feel and performance
3. **Security**: Keep dependencies updated and follow security best practices
4. **Documentation**: Improve onboarding and contribution guides
5. **Testing**: Increase test coverage, especially for critical paths

## Development Workflow

- Use `npm start` for development
- Run tests with `npm test`
- Build for production with `npm run dist`
- Follow semantic versioning for releases

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.
