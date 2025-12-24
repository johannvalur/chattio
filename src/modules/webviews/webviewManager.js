const { ipcRenderer } = require('electron');
const { PLATFORMS: _PLATFORMS, CHROME_USER_AGENT } = require('../../lib/config');
const logger = require('../../lib/logger');
const telemetry = require('../../lib/telemetry');
const performanceSettings = require('../../lib/performanceSettings');

class WebviewManager {
  constructor() {
    this.webviews = new Map(); // Stores { instance, lastActive, config }
    this.activeWebview = null;
    this.inactivityTimeouts = new Map();
    this.updateSettingsFromConfig();
    this.initialize();

    // Listen for performance settings changes
    performanceSettings.onChange((settings) => {
      this.updateSettingsFromConfig();
    });
  }

  updateSettingsFromConfig() {
    const settings = performanceSettings.getAll();
    this.MAX_ACTIVE_WEBVIEWS = settings.maxActiveWebviews || 3;
    this.INACTIVITY_TIMEOUT = performanceSettings.getInactivityTimeoutMs();
    logger.info('WebView manager settings updated:', {
      maxActive: this.MAX_ACTIVE_WEBVIEWS,
      timeout: this.INACTIVITY_TIMEOUT,
    });
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
    let loadStartTime = null;

    // Track when webview starts loading
    webview.addEventListener('did-start-loading', () => {
      loadStartTime = Date.now();
    });

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

    // Handle new window events (e.g., external links, target="_blank")
    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      if (e.url) {
        logger.info(`Opening new window link in browser: ${e.url}`);
        ipcRenderer.send('open-external', e.url);
      }
    });

    // Handle navigation attempts - open external links in browser
    webview.addEventListener('will-navigate', (e) => {
      if (!e.url) return;

      try {
        const platformHost = this.getPlatformHost(platform);
        if (!platformHost) {
          // No base host defined, allow navigation within webview
          return;
        }

        const targetHost = new URL(e.url).host;
        const isExternal = !this.isInternalHost(targetHost, platformHost);

        if (isExternal) {
          e.preventDefault();
          logger.info(`Opening external link in browser: ${e.url}`);
          ipcRenderer.send('open-external', e.url);
        }
      } catch (error) {
        logger.error(`Failed to handle navigation for ${platform}:`, error);
      }
    });

    // Handle in-page navigation (e.g., anchor links, hash changes)
    webview.addEventListener('did-navigate-in-page', (e) => {
      if (!e.url || e.isMainFrame === false) return;

      try {
        const platformHost = this.getPlatformHost(platform);
        if (!platformHost) return;

        const targetHost = new URL(e.url).host;
        const isExternal = !this.isInternalHost(targetHost, platformHost);

        if (isExternal) {
          logger.info(`Opening in-page navigation link in browser: ${e.url}`);
          ipcRenderer.send('open-external', e.url);
        }
      } catch (error) {
        logger.error(`Failed to handle in-page navigation for ${platform}:`, error);
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
      if (loadStartTime) {
        const loadTime = Date.now() - loadStartTime;
        telemetry.trackWebviewLoad(platform, loadTime, true);
        loadStartTime = null;
      }
      this.emit('loading', { platform, isLoading: false });
    });

    // Handle errors
    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) {
        // Ignore aborted page loads
        const loadTime = loadStartTime ? Date.now() - loadStartTime : 0;
        telemetry.trackWebviewLoad(platform, loadTime, false);
        telemetry.trackWebviewError(platform, 'load_failed', {
          errorCode: e.errorCode,
          errorDescription: e.errorDescription,
          validatedURL: e.validatedURL,
          isMainFrame: e.isMainFrame,
        });
        logger.error(`Failed to load ${platform}:`, e);
        this.emit('error', {
          platform,
          error: e,
          isMainFrame: e.isMainFrame,
        });
        loadStartTime = null;
      }
    });

    // Handle crashes
    webview.addEventListener('crashed', (e) => {
      telemetry.trackWebviewError(platform, 'crash', {
        killed: e.killed,
      });
      logger.error(`WebView crashed for ${platform}:`, e);
      this.emit('error', {
        platform,
        error: { type: 'crash', ...e },
        isMainFrame: true,
      });

      // Attempt to reload after crash
      setTimeout(() => {
        if (webview && !webview.isDestroyed?.()) {
          logger.info(`Attempting to reload ${platform} after crash`);
          webview.reload();
        }
      }, 2000);
    });

    // Handle unresponsive webviews
    webview.addEventListener('unresponsive', () => {
      telemetry.trackWebviewError(platform, 'unresponsive', {});
      logger.warn(`WebView unresponsive for ${platform}`);
      this.emit('error', {
        platform,
        error: { type: 'unresponsive' },
        isMainFrame: true,
      });
    });

    // Handle when webview becomes responsive again
    webview.addEventListener('responsive', () => {
      logger.info(`WebView responsive again for ${platform}`);
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
    telemetry.trackWebviewRecycle(platform, 'inactivity');

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

  getPlatformHost(platform) {
    try {
      const platformConfig = _PLATFORMS[platform];
      if (!platformConfig || !platformConfig.url) return null;
      const url = new URL(platformConfig.url);
      return url.host;
    } catch (error) {
      logger.warn('Failed to get platform host', platform, error);
      return null;
    }
  }

  isInternalHost(targetHost, baseHost) {
    if (!targetHost || !baseHost) return false;
    if (targetHost === baseHost) return true;
    if (targetHost.endsWith(`.${baseHost}`)) return true;

    // Allow Microsoft authentication domains for Teams
    if (baseHost === 'teams.microsoft.com') {
      const msAuthDomains = [
        'login.microsoftonline.com',
        'login.live.com',
        'account.microsoft.com',
        'login.windows.net',
      ];
      if (msAuthDomains.includes(targetHost)) return true;
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
