const { PLATFORMS } = require('../../../src/lib/config');
const logger = require('../../../src/lib/logger');

// Create a mock ipcRenderer that will be used
const mockIpcRenderer = {
  send: jest.fn(),
};

// Mock Electron - must define mockIpcRenderer before using it
jest.mock('electron', () => {
  // Return a function that references the mock
  return {
    ipcRenderer: {
      send: jest.fn(),
    },
  };
});

// Mock immer
jest.mock('immer', () => ({
  produce: (baseState, producer) => {
    const draft = JSON.parse(JSON.stringify(baseState));
    producer(draft);
    return draft;
  },
}));

// Mock logger
jest.mock('../../../src/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock config
jest.mock('../../../src/lib/config', () => ({
  PLATFORMS: {
    whatsapp: { name: 'WhatsApp' },
    telegram: { name: 'Telegram' },
    signal: { name: 'Signal' },
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  const mock = {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    _clearStore: () => {
      store = {};
    },
  };

  // Make mock functions available for inspection
  Object.defineProperty(mock, 'store', {
    get: () => store,
    enumerable: true,
  });

  return mock;
})();

global.localStorage = localStorageMock;

// Mock the entire localStorage object for jest.fn() to work
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import the module after setting up mocks
let appStateModule;
let getState, updateState, isNotificationsEnabled, saveAppState, loadAppState, resetAppState;

describe('appState', () => {
  let testIpcRenderer;

  beforeAll(() => {
    // Mock the global localStorage
    global.localStorage = localStorageMock;

    // Mock the current date for testing
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  beforeEach(() => {
    // Clear all mocks and localStorage
    jest.clearAllMocks();
    localStorageMock._clearStore();

    // Clear the module cache and re-import to get a fresh state
    // This ensures ipcRenderer is re-imported with fresh mock
    jest.resetModules();

    // Re-import ipcRenderer to get fresh mock AFTER resetModules
    testIpcRenderer = require('electron').ipcRenderer;
    testIpcRenderer.send.mockClear();

    // Now import appState which will use the fresh ipcRenderer mock
    appStateModule = require('../../../src/modules/state/appState');

    // Get the module's exports
    getState = appStateModule.getState;
    updateState = appStateModule.updateState;
    isNotificationsEnabled = appStateModule.isNotificationsEnabled;
    resetAppState = appStateModule.resetAppState || (() => {});
  });

  afterAll(() => {
    // Restore the original timer functions
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = getState();
      expect(state).toMatchObject({
        settings: {
          theme: 'system',
          fontSize: 'medium',
          autoHideSidebar: false,
          launchOnStartup: true,
          minimizeToTray: true,
          closeToTray: true,
          notifications: true,
          hardwareAcceleration: true,
          spellCheck: true,
          autoUpdate: true,
          betaUpdates: false,
        },
        apps: {
          whatsapp: { enabled: true, notifications: true },
          telegram: { enabled: true, notifications: true },
          signal: { enabled: true, notifications: true },
        },
        order: ['whatsapp', 'telegram', 'signal'],
        lastActiveApp: 'whatsapp',
        windowBounds: {
          width: 1200,
          height: 800,
          x: 0,
          y: 0,
          isMaximized: false,
        },
        isFirstRun: false,
        version: expect.any(String),
      });
    });
  });

  describe('updateState', () => {
    it('should update the state with the provided values', () => {
      // Initial state
      expect(getState().settings.theme).toBe('system');
      expect(getState().apps.whatsapp.enabled).toBe(true);

      // Update the state
      updateState((draft) => {
        draft.settings.theme = 'dark';
        draft.apps.whatsapp.enabled = false;
      });

      // Check if the state was updated
      const state = getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.apps.whatsapp.enabled).toBe(false);

      // Verify IPC message was sent (saveAppState is called twice in updateState)
      expect(testIpcRenderer.send).toHaveBeenCalledWith(
        'app-state-updated',
        expect.objectContaining({
          settings: expect.objectContaining({ theme: 'dark' }),
          apps: expect.objectContaining({
            whatsapp: expect.objectContaining({ enabled: false }),
          }),
        })
      );
    });

    it('should handle partial updates', () => {
      // Update only a part of the state
      updateState((draft) => {
        draft.settings.theme = 'dark';
      });

      // Check if only the specified part was updated
      const state = getState();
      expect(state.settings.theme).toBe('dark');
      // Other settings should remain unchanged
      expect(state.settings.fontSize).toBe('medium');
    });
  });

  describe('persistence', () => {
    it('should save state to localStorage on update', () => {
      // Update the state
      updateState((draft) => {
        draft.settings.theme = 'dark';
      });

      // Check if state was saved to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'chatterly-app-state',
        expect.stringContaining('"theme":"dark"')
      );
    });

    it('should load state from localStorage on initialization', () => {
      // Mock localStorage with saved state
      const savedState = {
        settings: {
          theme: 'dark',
          fontSize: 'large',
        },
        version: '1.0.0',
      };
      localStorage.getItem.mockReturnValueOnce(JSON.stringify(savedState));

      // Reset the module to force re-initialization
      jest.resetModules();
      const newAppStateModule = require('../../../src/modules/state/appState');

      // Check if the state was loaded from localStorage
      const state = newAppStateModule.getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.fontSize).toBe('large');
    });
  });

  describe('resetAppState', () => {
    it('should reset the state to defaults', () => {
      // Change some values
      updateState((draft) => {
        draft.settings.theme = 'dark';
        draft.apps.whatsapp.enabled = false;
      });

      // Reset the state
      if (resetAppState) {
        resetAppState();
      }

      // Check if the state was reset to defaults
      const state = getState();
      expect(state.settings.theme).toBe('system');
      expect(state.apps.whatsapp.enabled).toBe(true);

      // Verify IPC message was sent
      expect(testIpcRenderer.send).toHaveBeenCalledWith('app-state-updated', expect.any(Object));

      // Verify all platforms are included in the reset state
      ['whatsapp', 'telegram', 'signal'].forEach((platform) => {
        expect(state.apps[platform]).toBeDefined();
        expect(state.apps[platform].enabled).toBeDefined();
        expect(state.apps[platform].notifications).toBeDefined();
      });
    });
  });
});
