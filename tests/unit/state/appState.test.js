// Mock electron and other dependencies first
jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn()
  }
}));

// Mock logger
jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

// Mock config
jest.mock('../../../src/lib/config', () => ({
  PLATFORMS: {
    whatsapp: { name: 'WhatsApp', url: 'https://web.whatsapp.com' },
    telegram: { name: 'Telegram', url: 'https://web.telegram.org' },
    signal: { name: 'Signal', url: 'https://signal.org' },
  }
}));

// Now import the module under test
const { getState, updateState, isNotificationsEnabled, resetAppState, saveAppState, loadAppState } = require('../../../src/modules/state/appState');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

global.localStorage = localStorageMock;

describe('appState', () => {
  beforeEach(() => {
    // Reset all mocks and clear localStorage before each test
    jest.clearAllMocks();
    localStorage.clear();
    resetAppState();
  });

  describe('initial state', () => {
    it('should have default state', () => {
      const state = getState();
      expect(state).toEqual({
        apps: {
          whatsapp: { enabled: true, notifications: true },
          telegram: { enabled: true, notifications: true },
          signal: { enabled: true, notifications: true },
        },
        order: ['whatsapp', 'telegram', 'signal'],
        settings: {
          theme: 'system',
          sidebarDensity: 'comfortable',
          globalNotifications: true,
          badgeDockIcon: true,
          showWelcome: true,
          launchAtLogin: false,
          hardwareAcceleration: true,
          lastActiveTab: 'whatsapp',
          sidebarCollapsed: false,
        },
      });
    });
  });

  describe('updateState', () => {
    it('should update the state with the provided values', () => {
      // First get the current state
      const initialState = getState();
      
      updateState((draft) => {
        draft.settings.theme = 'dark';
        draft.apps.whatsapp.enabled = false;
      });

      const state = getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.apps.whatsapp.enabled).toBe(false);
      // Other values should remain unchanged
      expect(state.apps.telegram.enabled).toBe(true);
      
      // Reset the state for other tests
      updateState(() => initialState);
    });

    it('should save the state to localStorage', () => {
      // Clear mock calls before this test
      localStorage.setItem.mockClear();
      
      updateState((draft) => {
        draft.settings.theme = 'dark';
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'chatterly-app-state',
        expect.stringContaining('"theme":"dark"')
      );
    });
  });

  describe('isNotificationsEnabled', () => {
    it('should return true by default for all platforms', () => {
      // Reset state to default before testing
      resetAppState();
      expect(isNotificationsEnabled('whatsapp')).toBe(true);
      expect(isNotificationsEnabled('telegram')).toBe(true);
    });

    it('should return false if notifications are disabled for a platform', () => {
      // Reset state first
      resetAppState();
      
      // Get current state to restore later
      const initialState = getState();
      
      // Test with modified state
      updateState((draft) => {
        draft.apps.whatsapp.notifications = false;
      });
      
      expect(isNotificationsEnabled('whatsapp')).toBe(false);
      expect(isNotificationsEnabled('telegram')).toBe(true); // Other platforms unaffected
      
      // Restore state
      updateState(() => initialState);
    });
  });

  describe('saveAppState and loadAppState', () => {
    it('should save and load the app state', () => {
      // Update the state
      updateState((draft) => {
        draft.settings.theme = 'dark';
        draft.apps.whatsapp.enabled = false;
      });

      // Save the state
      saveAppState();

      // Reset the state
      resetAppState();
      expect(getState().settings.theme).toBe('system'); // Back to default

      // Load the saved state
      loadAppState();

      // Check if the state was loaded correctly
      const state = getState();
      expect(state.settings.theme).toBe('dark');
      expect(state.apps.whatsapp.enabled).toBe(false);
    });

    it('should handle malformed saved state', () => {
      // Save a malformed state
      localStorage.setItem('chatterly-app-state', 'invalid-json');

      // This should not throw and should reset to default state
      expect(() => loadAppState()).not.toThrow();
      expect(getState().settings.theme).toBe('system'); // Default value
    });
  });

  describe('resetAppState', () => {
    it('should reset the state to defaults', () => {
      // First get the default state
      const defaultState = getState();
      
      // Then modify it
      updateState((draft) => {
        draft.settings.theme = 'dark';
        draft.apps.whatsapp.enabled = false;
      });

      // Then reset it
      resetAppState();

      // Check if the state was reset to defaults
      const state = getState();
      expect(state.settings.theme).toBe('system');
      expect(state.apps.whatsapp.enabled).toBe(true);
      
      // Verify the state matches the default state
      expect(state).toEqual(defaultState);
    });
  });
});
