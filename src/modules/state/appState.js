const { ipcRenderer } = require('electron');
const { PLATFORMS } = require('../../lib/config');
const logger = require('../../lib/logger');

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const STORAGE_KEY = 'chatterly-app-state';

function buildDefaultAppsState() {
  return PLATFORM_KEYS.reduce((state, platform) => {
    state[platform] = { enabled: true, notifications: true };
    return state;
  }, {});
}

const defaultState = {
  apps: buildDefaultAppsState(),
  order: [...PLATFORM_KEYS],
  settings: {
    theme: 'system',
    sidebarDensity: 'comfortable',
    globalNotifications: true,
    badgeDockIcon: true,
    showWelcome: true,
    launchAtLogin: false,
    hardwareAcceleration: true,
    lastActiveTab: 'whatsapp',
    sidebarCollapsed: false
  }
};

let appState = { ...defaultState };

function isNotificationsEnabled(platform) {
  return appState.apps[platform]?.notifications !== false;
}

function loadAppState() {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      
      // Merge with defaults to ensure all platforms are included
      appState = {
        ...defaultState,
        ...parsed,
        apps: {
          ...buildDefaultAppsState(),
          ...(parsed.apps || {})
        },
        settings: {
          ...defaultState.settings,
          ...(parsed.settings || {})
        }
      };
      
      // Ensure all platforms are in the order array
      PLATFORM_KEYS.forEach(platform => {
        if (!appState.order.includes(platform)) {
          appState.order.push(platform);
        }
      });
      
      logger.info('App state loaded');
    }
  } catch (error) {
    logger.error('Error loading app state:', error);
    // Reset to defaults on error
    appState = { ...defaultState };
  }
  return appState;
}

function saveAppState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    // Update main process with current state if needed
    ipcRenderer.send('app-state-updated', appState);
  } catch (error) {
    logger.error('Error saving app state:', error);
  }
}

function resetAppState() {
  appState = { ...defaultState };
  saveAppState();
  return appState;
}

// Initialize state on load
loadAppState();

module.exports = {
  getState: () => ({ ...appState }),
  updateState: (updater) => {
    if (typeof updater === 'function') {
      appState = updater(appState);
    } else {
      appState = { ...appState, ...updater };
    }
    saveAppState();
    return appState;
  },
  isNotificationsEnabled,
  resetAppState,
  saveAppState,
  loadAppState
};
