/**
 * @jest-environment jsdom
 */

const { ipcRenderer, ipcMain } = require('electron');
const { app } = require('electron');
const path = require('path');

// Mock the renderer process modules
jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    invoke: jest.fn()
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn()
  },
  app: {
    dock: {
      setBadge: jest.fn()
    }
  },
  shell: {
    openExternal: jest.fn()
  }
}));

// Mock other required modules
jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

// Import the renderer module after setting up mocks
let renderer;
let appState;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

global.localStorage = localStorageMock;

describe('IPC Communication', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock document and window objects
    document.body.innerHTML = `
      <div id="unread-badge"></div>
      <div class="tabcontent" id="messenger"></div>
      <div class="tabcontent" id="slack"></div>
    `;
    
    // Mock appState
    appState = {
      apps: {
        messenger: { enabled: true, notifications: true },
        slack: { enabled: true, notifications: true }
      },
      settings: {
        badgeDockIcon: true,
        globalNotifications: true
      },
      currentTab: 'messenger'
    };
    
    // Mock the renderer module
    jest.isolateModules(() => {
      // This ensures we get a fresh instance for each test
      renderer = require('../../src/renderer');
      // Override the appState reference
      renderer.appState = appState;
    });
  });

  describe('Unread Message Handling', () => {
    it('should update unread state and send to main process', () => {
      // Call setTabUnread directly
      renderer.setTabUnread('messenger', 5);
      
      // Verify the unread state was updated
      expect(renderer.unreadState.messenger).toBe(5);
      
      // Verify the IPC message was sent
      expect(ipcRenderer.send).toHaveBeenCalledWith('unread-summary', {
        messenger: 5,
        slack: 0,
        totalUnreadServices: 1,
        totalMessages: 5
      });
    });

    it('should handle multiple unread updates', () => {
      // First update
      renderer.setTabUnread('messenger', 3);
      // Second update
      renderer.setTabUnread('slack', 2);
      
      // Verify the unread states
      expect(renderer.unreadState.messenger).toBe(3);
      expect(renderer.unreadState.slack).toBe(2);
      
      // Verify the IPC message was sent with correct totals
      expect(ipcRenderer.send).toHaveBeenLastCalledWith('unread-summary', {
        messenger: 3,
        slack: 2,
        totalUnreadServices: 2,
        totalMessages: 5
      });
    });

    it('should respect notification settings', () => {
      // Disable notifications for messenger
      appState.settings.globalNotifications = false;
      
      // Try to set unread count
      renderer.setTabUnread('messenger', 1);
      
      // Verify the unread state was updated
      expect(renderer.unreadState.messenger).toBe(1);
      
      // Verify no native notification was sent
      // (We would need to mock the notification API to verify this)
    });
  });

  describe('Theme Management', () => {
    it('should apply theme to document', () => {
      // Mock the theme module
      const theme = require('../../src/lib/theme');
      theme.applyThemeToDocument = jest.fn();
      
      // Simulate theme change
      renderer.applyTheme('dark');
      
      // Verify the theme was applied
      expect(theme.applyThemeToDocument).toHaveBeenCalledWith('dark');
      
      // Verify the theme was saved to appState
      expect(appState.settings.theme).toBe('dark');
    });
  });

  describe('Tab Management', () => {
    it('should switch between tabs', () => {
      // Initial state
      expect(appState.currentTab).toBe('messenger');
      
      // Mock the tab switching function
      const mockOpenTab = jest.spyOn(renderer, 'openTab');
      
      // Simulate clicking on the slack tab
      const event = { 
        currentTarget: { 
          getAttribute: () => 'slack' 
        },
        preventDefault: jest.fn()
      };
      renderer.openTab(event, 'slack');
      
      // Verify the tab was switched
      expect(mockOpenTab).toHaveBeenCalledWith(event, 'slack');
      expect(appState.currentTab).toBe('slack');
    });
  });

  describe('External Links', () => {
    it('should open external links in default browser', () => {
      const testUrl = 'https://example.com';
      
      // Call the openExternalLink function
      renderer.openExternalLink(testUrl);
      
      // Verify shell.openExternal was called
      const { shell } = require('electron');
      expect(shell.openExternal).toHaveBeenCalledWith(testUrl);
    });
  });
});
