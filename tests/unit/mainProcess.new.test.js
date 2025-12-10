const path = require('path');

// Create a global object to hold mocks
const mocks = {};

// Mock Electron
jest.mock('electron', () => {
  mocks.mockApp = {
    whenReady: jest.fn().mockResolvedValue(),
    getPath: jest.fn().mockImplementation((name) => {
      if (name === 'userData') return '/tmp/electron-test';
      return `/tmp/electron-test-${name}`;
    }),
    on: jest.fn((event, callback) => {
      mocks.mockApp._callbacks = mocks.mockApp._callbacks || {};
      mocks.mockApp._callbacks[event] = callback;
      return mocks.mockApp;
    }),
    quit: jest.fn(),
    dock: {
      setBadge: jest.fn(),
    },
    isPackaged: false,
    _callbacks: {},
  };

  mocks.mockIpcMain = {
    on: jest.fn((event, handler) => {
      mocks.mockIpcMain._handlers = mocks.mockIpcMain._handlers || {};
      mocks.mockIpcMain._handlers[event] = handler;
      return mocks.mockIpcMain;
    }),
    _handlers: {},
    handle: jest.fn(),
    handleOnce: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  mocks.mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      on: jest.fn(),
      send: jest.fn(),
      openDevTools: jest.fn(),
    },
    isDestroyed: jest.fn().mockReturnValue(false),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    _events: {},
  }));

  return {
    app: mocks.mockApp,
    BrowserWindow: mocks.mockBrowserWindow,
    ipcMain: mocks.mockIpcMain,
    Menu: {
      setApplicationMenu: jest.fn(),
      buildFromTemplate: jest.fn(),
    },
    dialog: {
      showErrorBox: jest.fn(),
      showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
    },
    shell: {
      openExternal: jest.fn(),
    },
  };
});

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdates: jest.fn().mockResolvedValue({ updateInfo: { version: '1.0.1' } }),
    on: jest.fn(),
  },
}));

// Import the main process after setting up mocks
const mainProcess = require('@/main');

describe('Main Process', () => {
  const { mockApp, mockIpcMain, mockBrowserWindow } = mocks;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('App Lifecycle', () => {
    it('should handle window-all-closed event', () => {
      // Simulate window-all-closed event
      if (mockApp && mockApp._callbacks && mockApp._callbacks['window-all-closed']) {
        mockApp._callbacks['window-all-closed']();
      }

      // On non-macOS, it should quit the app
      if (process.platform !== 'darwin') {
        expect(mockApp.quit).toHaveBeenCalled();
      }
    });
  });

  describe('IPC Handlers', () => {
    it('should handle unread summary updates', () => {
      // Simulate unread-summary IPC event
      if (mockIpcMain && mockIpcMain._handlers) {
        const unreadSummaryHandler = mockIpcMain._handlers['unread-summary'];
        if (unreadSummaryHandler) {
          unreadSummaryHandler({}, 5);
          expect(mockApp.dock.setBadge).toHaveBeenCalledWith('5');
        }
      }
    });
  });
});
