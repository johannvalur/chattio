const { ipcRenderer } = require('electron');
const { PLATFORMS: _PLATFORMS, CHROME_USER_AGENT } = require('../../lib/config');
const logger = require('../../lib/logger');

class WebviewManager {
  constructor() {
    this.webviews = new Map(); // Stores { instance, lastActive, config }
    this.activeWebview = null;
    this.inactivityTimeouts = new Map();
    this.INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    this.initialize();
  }

  initialize() {
    // Set up IPC handlers
    this.setupIpcHandlers();

    // Set up global event listeners
    this.setupEventListeners();
  }

  createWebview(platform, config) {
    // Check if we already have a webview for this platform
    const existing = this.webviews.get(platform);
    if (existing?.instance) {
      this.setWebviewActive(platform);
      return existing.instance;
    }

    const webview = document.createElement('webview');

    // Configure webview with security settings
    webview.setAttribute('class', 'webview');
    webview.setAttribute('data-platform', platform);
    webview.setAttribute('useragent', CHROME_USER_AGENT);
    webview.setAttribute(
      'webpreferences',
      'contextIsolation=yes,' + 'nodeIntegration=no,' + 'webSecurity=true,' + 'sandbox=yes'
    );
    webview.setAttribute('allowpopups', '');

    // Store reference with metadata
    const webviewData = {
      instance: webview,
      lastActive: Date.now(),
      config: { ...config },
      isLoaded: false,
    };

    this.webviews.set(platform, webviewData);

    // Set up webview event listeners
    this.setupWebviewEvents(webview, platform, config);

    return webview;
  }

  setupWebviewEvents(webview, platform, config) {
    const { url: _url, preloadScript, customCSS } = config;

    // Load the webview when added to DOM
    webview.addEventListener('dom-ready', () => {
      logger.info(`Webview ready: ${platform}`);

      // Inject custom CSS if provided
      if (customCSS) {
        webview.insertCSS(customCSS).catch((err) => {
          logger.error(`Failed to inject CSS for ${platform}:`, err);
        });
      }

      // Inject preload script if provided
      if (preloadScript) {
        webview
          .executeJavaScript(
            `
          (function() {
            ${preloadScript}
          })();
        `
          )
          .catch((err) => {
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
        webview,
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
        isInPlace: e.isInPlace,
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
      if (e.errorCode !== -3) {
        // Ignore aborted page loads
        logger.error(`Failed to load ${platform}:`, e);
        this.emit('error', {
          platform,
          error: e,
          isMainFrame: e.isMainFrame,
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
    const webviewData = this.webviews.get(platform);
    return webviewData?.instance || null;
  }

  getActiveWebview() {
    return this.activeWebview;
  }

  setActiveWebview(platform) {
    const webviewData = this.webviews.get(platform);
    if (!webviewData) return false;

    // Update last active time
    this.setWebviewActive(platform);

    // Set as active
    this.activeWebview = webviewData.instance;
    this.emit('active-changed', { platform, webview: webviewData.instance });

    // Load the webview if it hasn't been loaded yet
    if (!webviewData.isLoaded) {
      this.loadWebview(platform);
    }

    return true;
  }

  setWebviewActive(platform) {
    const webviewData = this.webviews.get(platform);
    if (webviewData) {
      webviewData.lastActive = Date.now();
      this.clearInactivityTimeout(platform);
      this.setupInactivityTimeout(platform);
    }
  }

  loadWebview(platform) {
    const webviewData = this.webviews.get(platform);
    if (!webviewData || webviewData.isLoaded) return;

    const { instance: webview, config } = webviewData;

    // Set the source URL
    if (config.url) {
      webview.setAttribute('src', config.url);
      webviewData.isLoaded = true;
    }
  }

  setupInactivityTimeout(platform) {
    this.clearInactivityTimeout(platform);

    this.inactivityTimeouts.set(
      platform,
      setTimeout(() => {
        this.unloadInactiveWebview(platform);
      }, this.INACTIVITY_TIMEOUT)
    );
  }

  clearInactivityTimeout(platform) {
    if (this.inactivityTimeouts.has(platform)) {
      clearTimeout(this.inactivityTimeouts.get(platform));
      this.inactivityTimeouts.delete(platform);
    }
  }

  unloadInactiveWebview(platform) {
    // Don't unload the active webview
    const webviewData = this.webviews.get(platform);
    if (!webviewData || this.activeWebview === webviewData.instance) {
      this.setupInactivityTimeout(platform);
      return;
    }

    logger.info(`Unloading inactive webview: ${platform}`);

    // Remove from DOM
    if (webviewData.instance.parentNode) {
      webviewData.instance.parentNode.removeChild(webviewData.instance);
    }

    // Clean up event listeners
    this.cleanupWebviewEvents(webviewData.instance);

    // Remove reference
    this.webviews.delete(platform);
    this.emit('webview-unloaded', { platform });
  }

  cleanupWebviewEvents(webview) {
    // Clone the webview to remove all event listeners
    const newWebview = webview.cloneNode(false);
    if (webview.parentNode) {
      webview.parentNode.replaceChild(newWebview, webview);
    }
    return newWebview;
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
      // If the webview was unloaded, reload it
      const webviewData = Array.from(this.webviews.entries()).find(
        ([_, data]) => data.instance === webview
      )?.[1];

      if (webviewData && !webviewData.isLoaded) {
        this.loadWebview(platform);
      } else {
        webview.reload();
      }
      return true;
    }
    return false;
  }

  goBack(platform) {
    const webview = platform ? this.getWebview(platform) : this.getActiveWebview();
    if (!webview) return false;

    // If the webview was unloaded, reload it first
    const webviewData = Array.from(this.webviews.entries()).find(
      ([_, data]) => data.instance === webview
    )?.[1];

    if (webviewData && !webviewData.isLoaded) {
      this.loadWebview(platform || this.getPlatformForWebview(webview));
      return true;
    }

    if (webview.canGoBack()) {
      webview.goBack();
      return true;
    }
    return false;
  }

  goForward(platform) {
    const webview = platform ? this.getWebview(platform) : this.getActiveWebview();
    if (!webview) return false;

    // If the webview was unloaded, reload it first
    const webviewData = Array.from(this.webviews.entries()).find(
      ([_, data]) => data.instance === webview
    )?.[1];

    if (webviewData && !webviewData.isLoaded) {
      this.loadWebview(platform || this.getPlatformForWebview(webview));
      return true;
    }

    if (webview.canGoForward()) {
      webview.goForward();
      return true;
    }
    return false;
  }

  getPlatformForWebview(webview) {
    for (const [platform, data] of this.webviews.entries()) {
      if (data.instance === webview) {
        return platform;
      }
    }
    return null;
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
