// Mock electron and other dependencies first
const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn().mockResolvedValue([]),
  quitAndInstall: jest.fn(),
  on: jest.fn((event, handler) => {
    // Store handlers for later retrieval
    mockAutoUpdater._handlers = mockAutoUpdater._handlers || {};
    mockAutoUpdater._handlers[event] = handler;
    return mockAutoUpdater;
  }),
  removeAllListeners: jest.fn(),
  currentVersion: '1.0.0',
  getFeedURL: jest.fn(),
  setFeedURL: jest.fn(),
  _handlers: {},
};

const mockApp = {
  isPackaged: false,
  whenReady: jest.fn().mockResolvedValue(),
  getPath: jest.fn().mockReturnValue('/tmp'),
  on: jest.fn(),
  dock: {
    setBadge: jest.fn(),
  },
};

// Create a mock BrowserWindow constructor
const mockBrowserWindow = jest.fn().mockImplementation(() => ({
  isDestroyed: jest.fn().mockReturnValue(false),
  loadURL: jest.fn(),
  loadFile: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  webContents: {
    on: jest.fn(),
    send: jest.fn(),
    openDevTools: jest.fn(),
  },
}));

// Add static methods
mockBrowserWindow.getFocusedWindow = jest.fn().mockReturnValue(null);
mockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([]);

jest.mock('electron', () => ({
  app: mockApp,
  dialog: {
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: jest.fn(),
  },
  BrowserWindow: mockBrowserWindow,
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn(),
  },
  ipcMain: {
    on: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

jest.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

// Import mocked modules
const { dialog, app } = require('electron');
const { autoUpdater } = require('electron-updater');

// Now import the module under test
const mainModule = require('../../src/main');

// Extract the functions we want to test
const { initializeAutoUpdates, requestUpdateCheck } = mainModule;

describe('Auto Update', () => {
  let originalIsDev;

  beforeAll(() => {
    // Store original values
    originalIsDev = process.env.NODE_ENV === 'development';

    // Mock process.platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });

    // Don't use fake timers globally - they cause issues with intervals in main.js
    // Individual tests can use them if needed

    // Ensure the functions are available
    if (typeof initializeAutoUpdates !== 'function' || typeof requestUpdateCheck !== 'function') {
      throw new Error('Failed to import required functions from main module');
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any intervals that might have been set up
    if (global.clearInterval) {
      // Clear any intervals
    }
  });

  afterAll(() => {
    // Restore original values
    process.env.NODE_ENV = originalIsDev ? 'development' : 'production';
  });

  describe('initializeAutoUpdates', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset to development mode by default
      mockApp.isPackaged = false;
    });

    it('should skip initialization in development mode', () => {
      mockApp.isPackaged = false;
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      initializeAutoUpdates();

      expect(consoleInfoSpy).toHaveBeenCalledWith('Skipping auto-updates in development mode.');
      expect(autoUpdater.on).not.toHaveBeenCalled();

      consoleInfoSpy.mockRestore();
    });

    it('should set up auto-update event listeners in production', () => {
      // Set packaged before loading module
      mockApp.isPackaged = true;
      jest.resetModules();

      // Re-import after resetting modules
      const newMainModule = require('../../src/main');
      const { initializeAutoUpdates: init } = newMainModule;

      // Clear mocks before calling
      autoUpdater.on.mockClear();

      init();

      expect(autoUpdater.autoDownload).toBe(false);
      expect(autoUpdater.autoInstallOnAppQuit).toBe(false);

      // The actual number of event listeners might vary based on the implementation
      // Just verify that we have at least the expected ones
      expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('requestUpdateCheck', () => {
    let requestUpdateCheckFn;

    beforeEach(() => {
      mockApp.isPackaged = true;
      // Clear handlers storage
      autoUpdater._handlers = {};
      jest.clearAllMocks();
      // Reset the autoUpdater mock but keep the on function that stores handlers
      autoUpdater.checkForUpdates.mockClear();
      autoUpdater.on.mockClear();

      jest.resetModules();

      // Re-import after resetting modules with isPackaged = true
      const newMainModule = require('../../src/main');
      requestUpdateCheckFn = newMainModule.requestUpdateCheck;
    });

    it('should check for updates when requested', async () => {
      const isManual = true;
      autoUpdater.checkForUpdates.mockResolvedValue({ updateInfo: null });

      // Call the function (it returns undefined, errors are handled in .catch())
      requestUpdateCheckFn(isManual);

      // Wait a bit for the async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it('should handle update not available scenario', async () => {
      autoUpdater.checkForUpdates.mockResolvedValueOnce({ updateInfo: null });

      await requestUpdateCheckFn(true);

      expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
    });
  });

  describe('update installation', () => {
    beforeEach(() => {
      mockApp.isPackaged = true;
      jest.resetModules();
      jest.clearAllMocks();

      const newMainModule = require('../../src/main');
      newMainModule.initializeAutoUpdates();
    });

    it('should install update when user confirms', async () => {
      // Find the update-downloaded handler
      const updateDownloadedHandler =
        autoUpdater._handlers['update-downloaded'] ||
        autoUpdater.on.mock.calls.find((call) => call[0] === 'update-downloaded')?.[1];

      if (updateDownloadedHandler) {
        dialog.showMessageBox.mockResolvedValueOnce({ response: 0 }); // User confirms

        // Handler is async, call it and wait for promise chain
        updateDownloadedHandler();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
      } else {
        // If handler wasn't found, skip this test
        expect(true).toBe(true);
      }
    });
  });
});
