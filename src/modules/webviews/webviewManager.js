const { ipcRenderer } = require('electron');
const { PLATFORMS, CHROME_USER_AGENT } = require('../../lib/config');
const logger = require('../../lib/logger');

class WebviewManager {
  constructor() {
    this.webviews = new Map();
    this.activeWebview = null;
    this.initialize();
  }

  initialize() {
    // Set up IPC handlers
    this.setupIpcHandlers();
    
    // Set up global event listeners
    this.setupEventListeners();
  }

  createWebview(platform, config) {
    const webview = document.createElement('webview');
    
    // Configure webview attributes
    webview.setAttribute('class', 'webview');
    webview.setAttribute('data-platform', platform);
    webview.setAttribute('useragent', CHROME_USER_AGENT);
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no');
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('webpreferences', 'nativeWindowOpen=true');
    
    // Set up webview event listeners
    this.setupWebviewEvents(webview, platform, config);
    
    // Store reference
    this.webviews.set(platform, webview);
    
    return webview;
  }

  setupWebviewEvents(webview, platform, config) {
    const { url, preloadScript, customCSS } = config;
    
    // Load the webview when added to DOM
    webview.addEventListener('dom-ready', () => {
      logger.info(`Webview ready: ${platform}`);
      
      // Inject custom CSS if provided
      if (customCSS) {
        webview.insertCSS(customCSS).catch(err => {
          logger.error(`Failed to inject CSS for ${platform}:`, err);
        });
      }
      
      // Inject preload script if provided
      if (preloadScript) {
        webview.executeJavaScript(`
          (function() {
            ${preloadScript}
          })();
        `).catch(err => {
          logger.error(`Failed to inject preload script for ${platform}:`, err);
        });
      }
      
      // Notify that webview is ready
      this.emit('webview-ready', { platform, webview });
    });
    
    // Handle page title updates for unread counts
    webview.addEventListener('page-title-updated', (e) => {
      this.emit('title-updated', {
        platform,
        title: e.title,
        webview
      });
    });
    
    // Handle new window events (e.g., external links)
    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      if (e.url) {
        ipcRenderer.send('open-external', e.url);
      }
    });
    
    // Handle console messages for debugging
    webview.addEventListener('console-message', (e) => {
      logger.debug(`[${platform} Console] ${e.message}`);
    });
    
    // Handle navigation
    webview.addEventListener('did-navigate', (e) => {
      this.emit('navigate', {
        platform,
        url: e.url,
        isInPlace: e.isInPlace
      });
    });
    
    // Handle loading states
    webview.addEventListener('did-start-loading', () => {
      this.emit('loading', { platform, isLoading: true });
    });
    
    webview.addEventListener('did-stop-loading', () => {
      this.emit('loading', { platform, isLoading: false });
    });
    
    // Handle errors
    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) { // Ignore aborted page loads
        logger.error(`Failed to load ${platform}:`, e);
        this.emit('error', {
          platform,
          error: e,
          isMainFrame: e.isMainFrame
        });
      }
    });
  }

  setupIpcHandlers() {
    // Handle refresh command from main process
    ipcRenderer.on('refresh-webview', (_, platform) => {
      this.refresh(platform);
    });
    
    // Handle navigation commands
    ipcRenderer.on('navigate-webview', (_, { platform, url }) => {
      this.navigate(platform, url);
    });
  }

  setupEventListeners() {
    // Set up any global event listeners here
  }

  // Public API
  
  getWebview(platform) {
    return this.webviews.get(platform);
  }

  getActiveWebview() {
    return this.activeWebview;
  }

  setActiveWebview(platform) {
    const webview = this.getWebview(platform);
    if (webview) {
      this.activeWebview = webview;
      this.emit('active-changed', { platform, webview });
      return true;
    }
    return false;
  }

  async navigate(platform, url) {
    const webview = this.getWebview(platform);
    if (webview) {
      try {
        await webview.loadURL(url);
        return true;
      } catch (error) {
        logger.error(`Failed to navigate ${platform} to ${url}:`, error);
        return false;
      }
    }
    return false;
  }

  refresh(platform) {
    const webview = platform ? this.getWebview(platform) : this.getActiveWebview();
    if (webview) {
      webview.reload();
      return true;
    }
    return false;
  }

  goBack(platform) {
    const webview = platform ? this.getWebview(platform) : this.getActiveWebview();
    if (webview && webview.canGoBack()) {
      webview.goBack();
      return true;
    }
    return false;
  }

  goForward(platform) {
    const webview = platform ? this.getWebview(platform) : this.getActiveWebview();
    if (webview && webview.canGoForward()) {
      webview.goForward();
      return true;
    }
    return false;
  }

  // Event emitter pattern
  on(event, listener) {
    if (!this.listeners) {
      this.listeners = new Map();
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    if (this.listeners && this.listeners.has(event)) {
      this.listeners.get(event).delete(listener);
    }
  }

  emit(event, ...args) {
    if (this.listeners && this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)) {
        try {
          listener(...args);
        } catch (error) {
          logger.error(`Error in ${event} listener:`, error);
        }
      }
    }
  }
}

// Create a singleton instance
const webviewManager = new WebviewManager();

// Export the singleton instance
module.exports = webviewManager;
