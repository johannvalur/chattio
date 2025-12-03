# Chattio Architecture

## System Overview

Chattio is built using Electron, which provides a Chromium-based renderer process and a Node.js main process. The application follows a multi-process architecture with a focus on performance optimization and efficient resource management.

## Build System

### Webpack Configuration

The project uses a modern Webpack-based build system with separate configurations for different environments:

1. **Development**
   - Source maps for debugging
   - Hot module replacement for faster development
   - Fast incremental builds
   - Detailed error reporting

2. **Production**
   - Minification and tree-shaking
   - Asset optimization and hashing
   - Environment-specific configurations
   - Source maps for production debugging

### Build Process

1. **Main Process**
   - Bundled using `webpack.main.config.js`
   - Handles application lifecycle and native OS integration
   - Optimized for Node.js environment
   - Uses `webpack-node-externals` to exclude node_modules

2. **Renderer Process**
   - Bundled using `webpack.renderer.config.js`
   - Handles UI rendering and user interaction
   - Optimized for browser environment
   - Includes CSS and asset loaders
   - Uses `html-webpack-plugin` for HTML generation

3. **Assets**
   - Processed and optimized during build
   - Copied to output directory with hashed filenames
   - Icons and static assets are included in the final bundle

### Environment Variables

The build system supports different environments:
- `development`: For local development with debugging tools
- `production`: For optimized production builds
- `test`: For running tests with appropriate mocks

Environment variables can be set using `cross-env` for cross-platform compatibility.

## Core Components

### 1. Main Process (`src/main.js`)
- **Responsibility**: Application lifecycle, window management, and native OS integration
- **Key Modules**:
  - `app`: Handles application lifecycle events
  - `BrowserWindow`: Manages application windows
  - `ipcMain`: Handles inter-process communication
  - `Menu`: Manages application menus

### 2. Renderer Process (`src/renderer.js`)
- **Responsibility**: UI rendering and user interaction
- **Key Features**:
  - Tabbed interface for multiple messaging services
  - WebView management for each service
  - State management for UI components
  - Virtual scrolling for message lists

### 3. Services (`src/lib/`)
- **config.js**: Application configuration and constants
- **logger.js**: Centralized logging service
- **sidebarManager.js**: Manages the sidebar navigation
- **theme.js**: Handles theming and UI customization
- **webViewManager.js**: Manages WebView lifecycle and memory
- **virtualScroller.js**: Implements efficient message list rendering

## Data Flow

1. **Initialization**:
   - Main process initializes the application window
   - Renderer process loads the main UI
   - Services are initialized
   - WebViewManager initializes with default settings

2. **User Interaction**:
   1. User interacts with the UI (e.g., clicks a tab)
   2. Event is captured by the renderer process
   3. WebViewManager handles WebView lifecycle
   4. VirtualScroller manages efficient message rendering
   5. UI updates are reflected using optimized DOM operations

3. **Messaging Flow**:
   - Each messaging service runs in its own WebView
   - WebViews are sandboxed and managed by WebViewManager
   - VirtualScroller handles efficient message list rendering
   - Limited communication between WebViews and main process

## Memory Management

### WebView Management
- **WebView Pooling**: Maintains a limited number of active WebViews (default: 3)
- **LRU Eviction**: Least Recently Used WebViews are unloaded when limit is reached
- **Automatic Cleanup**: Inactive WebViews are automatically unloaded after 5 minutes
- **Optimized Settings**: WebViews use optimized settings for better performance

### Virtual Scrolling
- **DOM Recycling**: Only visible messages are rendered in the DOM
- **Viewport Detection**: Tracks visible area for efficient rendering
- **Batch Updates**: Groups DOM operations for better performance
- **Dynamic Sizing**: Handles variable height message items

## Security Model

- **Sandboxing**: Each WebView runs in its own sandbox
- **Content Security Policy**: Strict CSP to prevent XSS
- **Context Isolation**: Enabled to prevent prototype pollution
- **Node Integration**: Disabled in renderer process
- **Permissions**: Granular permission system for OS features

## Performance Considerations

- **Lazy Loading**: WebViews are loaded on demand
- **Resource Management**: 
  - Unused WebViews are unloaded when not active
  - Memory-intensive features are disabled by default
- **Memory Management**: 
  - Regular cleanup of unused resources
  - Garbage collection optimization
- **Optimized Builds**: 
  - Production builds are optimized and minified
  - Dead code elimination

## Build System

- **electron-builder**: For packaging and distribution
- **Platform-Specific Builds**: Separate configurations for macOS and Windows
- **Auto-Update**: Support for automatic updates
- **Performance Budgets**: Enforce size and performance constraints

## Environment Variables

- `NODE_ENV`: 'development' or 'production'
- `ELECTRON_IS_DEV`: Set to 1 in development
- `DEBUG`: Enable debug logging

## Dependencies

### Core Dependencies
- Electron: ^25.0.0
- electron-builder: ^24.4.0

### Development Dependencies
- Jest: ^29.7.0
- Playwright: ^1.56.1
- electron-icon-builder: ^2.0.1

## Known Limitations

- Limited support for browser extensions in WebViews
- Some web apps may detect and block WebView user agents
- Memory usage increases with multiple active services

## Future Improvements

1. **Performance**:
   - Implement service worker for offline support
   - Optimize WebView memory usage further
   - Implement progressive loading for message history

2. **Features**:
   - Customizable WebView limits
   - Advanced memory management settings
   - Performance profiling tools

3. **Optimizations**:
   - WebView preloading strategies
   - Improved garbage collection
   - Memory compression for inactive tabs

2. **Features**:
   - Notification center integration
   - Custom keyboard shortcuts
   - Plugin system for additional services

3. **Security**:
   - Enhanced sandboxing
   - Certificate pinning
   - Secure storage for credentials

## Performance Optimization Techniques

### WebView Optimization
- Disabled unnecessary browser features
- Optimized renderer settings
- Disabled background throttling
- Hardware acceleration tuning

### Virtual Scrolling
- Efficient DOM diffing
- RequestAnimationFrame for smooth scrolling
- Offscreen rendering buffer
- Dynamic item sizing

## Monitoring and Logging

- Console logging in development
- File-based logging in production
- Error tracking integration (e.g., Sentry)
- Performance monitoring
- Memory usage tracking
- WebView lifecycle events

## Testing Strategy

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user flows
4. **Performance Tests**: Monitor memory usage and load times

## Deployment

### Development
- `npm start`: Start the development server
- `npm test`: Run tests
- `npm run dist`: Create production builds

### Production
- GitHub Actions for CI/CD
- Automated builds on tag push
- Signed and notarized releases
- Automatic updates

## Troubleshooting

### Common Issues
1. **App is Damaged**
   - See `scripts/fix-damaged-app.sh`
   - May require manual code signing in development

2. **WebView Issues**
   - Check CSP settings
   - Verify service URLs are whitelisted
   - Check for CORS issues

3. **Build Failures**
   - Verify Node.js and npm versions
   - Check for missing dependencies
   - Clean and rebuild

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and code style.
