const { ipcRenderer } = require('electron');
const { PLATFORMS, CHROME_USER_AGENT } = require('../../lib/config');
const appState = require('../state/appState');
const unreadState = require('../state/unreadState');
const logger = require('../../lib/logger');

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const activeTabs = new Map();

function createPlatformTab(platform, config) {
  const tab = document.createElement('div');
  tab.className = 'tab-pane';
  tab.dataset.platform = platform;
  tab.innerHTML = `
    <div class="tab-header">
      <h3>${config.name}</h3>
      <div class="tab-actions">
        <button class="tab-action refresh" title="Refresh">
          <i class="icon-refresh"></i>
        </button>
        <button class="tab-action external" title="Open in Browser">
          <i class="icon-external"></i>
        </button>
      </div>
    </div>
    <webview 
      class="webview" 
      data-platform="${platform}"
      useragent="${CHROME_USER_AGENT}"
      webpreferences="contextIsolation=yes,nodeIntegration=no"
    ></webview>
  `;

  // Store reference
  activeTabs.set(platform, tab);

  // Set up event listeners
  setupTabEventListeners(tab, platform, config);

  return tab;
}

function setupTabEventListeners(tab, platform, config) {
  const webview = tab.querySelector('webview');
  const refreshBtn = tab.querySelector('.refresh');
  const externalBtn = tab.querySelector('.external');

  // Handle webview load events
  webview.addEventListener('did-start-loading', () => {
    tab.classList.add('loading');
  });

  webview.addEventListener('did-stop-loading', () => {
    tab.classList.remove('loading');

    // Inject custom CSS if needed
    if (config.customCSS) {
      webview.insertCSS({ code: config.customCSS });
    }

    // Update unread count based on page title
    updateUnreadFromTitle(webview, platform);
  });

  // Handle new window events (open external links in default browser)
  webview.addEventListener('new-window', (e) => {
    const url = e.url;
    if (url) {
      e.preventDefault();
      ipcRenderer.send('open-external', url);
    }
  });

  // Handle page title updates for unread counts
  webview.addEventListener('page-title-updated', () => {
    updateUnreadFromTitle(webview, platform);
  });

  // Button handlers
  refreshBtn.addEventListener('click', () => {
    if (webview) webview.reload();
  });

  externalBtn.addEventListener('click', () => {
    const url = webview.getURL();
    if (url) {
      ipcRenderer.send('open-external', url);
    }
  });
}

function updateUnreadFromTitle(webview, platform) {
  try {
    const title = webview.getTitle();
    if (!title) return;

    // Extract unread count from title (e.g., "(2) Messenger")
    const match = title.match(/\((\d+)\)/);
    const unreadCount = match ? parseInt(match[1], 10) : 0;

    // Update unread state
    unreadState.setTabUnread(platform, unreadCount);
  } catch (error) {
    logger.error(`Error updating unread count for ${platform}:`, error);
  }
}

function showTab(platform) {
  // Hide all tabs first
  document.querySelectorAll('.tab-pane').forEach((tab) => {
    tab.style.display = 'none';
  });

  // Show the selected tab
  const tab = activeTabs.get(platform);
  if (tab) {
    tab.style.display = 'block';

    // Focus the webview if it's already loaded
    const webview = tab.querySelector('webview');
    if (webview) {
      webview.focus();

      // Reset unread count when tab is shown
      unreadState.setTabUnread(platform, 0);
    }

    // Update active state in sidebar
    document.querySelectorAll('.sidebar-button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.platform === platform);
    });

    // Update last active tab in state
    appState.updateState({
      settings: {
        lastActiveTab: platform,
      },
    });
  }
}

function createTabsContainer() {
  const container = document.createElement('div');
  container.className = 'tabs-container';

  // Create tabs for each platform
  PLATFORM_KEYS.forEach((platform) => {
    const config = PLATFORMS[platform];
    if (config) {
      const tab = createPlatformTab(platform, config);
      container.appendChild(tab);
    }
  });

  return container;
}

function initializeTabs() {
  const container = document.querySelector('.main-content') || document.body;
  const tabsContainer = createTabsContainer();
  container.appendChild(tabsContainer);

  // Show the last active tab or the first one
  const { settings } = appState.getState();
  const defaultTab = settings.lastActiveTab || PLATFORM_KEYS[0];
  showTab(defaultTab);

  // Set up keyboard shortcuts for tab switching
  setupKeyboardShortcuts();
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only handle if not in an input field
    if (document.activeElement.tagName === 'INPUT') return;

    const { order } = appState.getState();
    const currentTab = document.querySelector('.tab-pane[style*="display: block"]');
    const currentIndex = order.indexOf(currentTab?.dataset.platform);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % order.length;
      showTab(order[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + order.length) % order.length;
      showTab(order[prevIndex]);
    } else if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key, 10) - 1;
      if (index < order.length) {
        showTab(order[index]);
      }
    } else if (e.key === 'r' && e.ctrlKey) {
      e.preventDefault();
      const webview = document.querySelector('.tab-pane[style*="display: block"] webview');
      if (webview) webview.reload();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTabs);
} else {
  initializeTabs();
}

// Export public API
module.exports = {
  showTab,
  getActiveTab: () => {
    const tab = document.querySelector('.tab-pane[style*="display: block"]');
    return tab ? tab.dataset.platform : null;
  },
  refreshTab: (platform) => {
    const tab = activeTabs.get(platform);
    if (tab) {
      const webview = tab.querySelector('webview');
      if (webview) webview.reload();
    }
  },
};
