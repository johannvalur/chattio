const { ipcRenderer } = require('electron');
const { PLATFORMS } = require('../../lib/config');
const logger = require('../../lib/logger');
const { produce } = require('immer');

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
  lastActiveApp: 'whatsapp',
  windowBounds: { width: 1200, height: 800, x: 0, y: 0, isMaximized: false },
  isFirstRun: false,
  version: '1.0.0',
  settings: {
    theme: 'system',
    fontSize: 'medium',
    autoHideSidebar: false,
    launchOnStartup: true,
    minimizeToTray: true,
    closeToTray: true,
    globalNotifications: true,
    badgeDockIcon: true,
    notificationSounds: true,
    notificationPreview: true,
    doNotDisturb: false,
    doNotDisturbSchedule: false,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '08:00',
    hardwareAcceleration: true,
    spellCheck: true,
    autoUpdate: true,
    betaUpdates: false,
  },
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
          ...(parsed.apps || {}),
        },
        settings: {
          ...defaultState.settings,
          ...(parsed.settings || {}),
        },
      };

      // Ensure all platforms are in the order array
      PLATFORM_KEYS.forEach((platform) => {
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
      appState = produce(appState, (draft) => {
        updater(draft);
      });
    } else {
      appState = { ...appState, ...updater };
    }
    saveAppState();
    saveAppState();
    return appState;
  },
  isNotificationsEnabled,
  resetAppState,
  saveAppState,
  loadAppState,
};
