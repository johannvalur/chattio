const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    whenReady: jest.fn().mockResolvedValue(),
    getPath: jest.fn().mockReturnValue('/tmp'),
    on: jest.fn(),
    quit: jest.fn(),
    dock: {
      setBadge: jest.fn()
    }
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      on: jest.fn(),
      session: {
        webRequest: {
          onHeadersReceived: jest.fn(),
          onBeforeRequest: jest.fn()
        }
      },
      setWindowOpenHandler: jest.fn()
    },
    isDestroyed: jest.fn().mockReturnValue(false),
    isFocused: jest.fn().mockReturnValue(true),
    focus: jest.fn(),
    setMenuBarVisibility: jest.fn(),
    show: jest.fn(),
    destroy: jest.fn()
  })),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn()
  },
  dialog: {
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: jest.fn()
  },
  shell: {
    openExternal: jest.fn()
  }
}));

// Mock other dependencies
jest.mock('./../../src/lib/windowStateManager');

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    on: jest.fn(),
    checkForUpdates: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn()
  }
}));

describe('Main Process', () => {
  let mainProcess;
  
  beforeAll(() => {
    // Mock process.platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the module cache and require the main process
    jest.resetModules();
    mainProcess = require('../../src/main');
  });

  describe('App Lifecycle', () => {
    it('should create a window when app is ready', async () => {
      // Simulate app ready
      const whenReadyCallback = app.whenReady.mock.calls[0][0];
      await whenReadyCallback();
      
      expect(BrowserWindow).toHaveBeenCalled();
      expect(app.on).toHaveBeenCalledWith('activate', expect.any(Function));
      expect(app.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
      expect(app.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    });

    it('should create a new window when all windows are closed and app is activated', async () => {
      // Mock BrowserWindow.getAllWindows to return empty array
      BrowserWindow.getAllWindows.mockReturnValue([]);
      
      // Simulate activate event
      const activateCallback = app.on.mock.calls.find(call => call[0] === 'activate')[1];
      await activateCallback();
      
      expect(BrowserWindow).toHaveBeenCalled();
    });

    it('should quit the app when all windows are closed on non-macOS', () => {
      // Change platform to non-macOS
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      // Simulate window-all-closed event
      const windowAllClosedCallback = app.on.mock.calls.find(call => call[0] === 'window-all-closed')[1];
      windowAllClosedCallback();
      
      expect(app.quit).toHaveBeenCalled();
    });
  });

  describe('IPC Handlers', () => {
    it('should handle unread summary updates on macOS', () => {
      // Simulate unread-summary IPC event
      const unreadSummaryHandler = ipcMain.on.mock.calls.find(call => call[0] === 'unread-summary')[1];
      
      // Test with number
      unreadSummaryHandler({}, 5);
      expect(app.dock.setBadge).toHaveBeenCalledWith('5');
      
      // Test with string
      unreadSummaryHandler({}, 'test');
      expect(app.dock.setBadge).toHaveBeenCalledWith('test');
      
      // Test with invalid input
      jest.clearAllMocks();
      unreadSummaryHandler({}, { invalid: 'data' });
      expect(app.dock.setBadge).toHaveBeenCalledWith('');
    });
  });

  describe('Error Handling', () => {
    it('should handle window creation errors', async () => {
      // Mock BrowserWindow to throw an error
      BrowserWindow.mockImplementationOnce(() => {
        throw new Error('Failed to create window');
      });
      
      // Simulate app ready
      const whenReadyCallback = app.whenReady.mock.calls[0][0];
      await whenReadyCallback();
      
      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'Initialization Error',
        'Failed to initialize the application. Please check the logs for more details.'
      );
    });
  });
});
