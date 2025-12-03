// Mock electron and other dependencies first
const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn().mockResolvedValue([]),
  quitAndInstall: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  currentVersion: '1.0.0',
  getFeedURL: jest.fn(),
  setFeedURL: jest.fn()
};

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    whenReady: jest.fn().mockResolvedValue(),
    getPath: jest.fn().mockReturnValue('/tmp'),
    on: jest.fn(),
    dock: {
      setBadge: jest.fn()
    }
  },
  dialog: {
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: jest.fn()
  },
  BrowserWindow: {
    getFocusedWindow: jest.fn(),
    getAllWindows: jest.fn().mockReturnValue([])
  },
  ipcMain: {
    on: jest.fn()
  },
  shell: {
    openExternal: jest.fn()
  }
}));

jest.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater
}));

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

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
      value: 'darwin'
    });
    
    // Ensure the functions are available
    if (typeof initializeAutoUpdates !== 'function' || typeof requestUpdateCheck !== 'function') {
      throw new Error('Failed to import required functions from main module');
    }
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Restore original values
    process.env.NODE_ENV = originalIsDev ? 'development' : 'production';
  });

  describe('initializeAutoUpdates', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset NODE_ENV to undefined before each test
      delete process.env.NODE_ENV;
    });

    it('should skip initialization in development mode', () => {
      process.env.NODE_ENV = 'development';
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      
      initializeAutoUpdates();
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('Skipping auto-updates in development mode.');
      expect(autoUpdater.on).not.toHaveBeenCalled();
      
      consoleInfoSpy.mockRestore();
    });

    it('should set up auto-update event listeners in production', () => {
      process.env.NODE_ENV = 'production';
      
      initializeAutoUpdates();
      
      expect(autoUpdater.autoDownload).toBe(false);
      expect(autoUpdater.autoInstallOnAppQuit).toBe(false);
      
      // The actual number of event listeners might vary based on the implementation
      // Just verify that we have at least the expected ones
      expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Verify app event listeners
      expect(app.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
    });
  });

  describe('requestUpdateCheck', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      initializeAutoUpdates();
      jest.clearAllMocks();
    });

    it('should check for updates when requested', async () => {
      const isManual = true;
      
      await requestUpdateCheck(isManual);
      
      expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it('should handle update available scenario', async () => {
      const mockInfo = { version: '2.0.0' };
      autoUpdater.checkForUpdates.mockResolvedValueOnce({ updateInfo: mockInfo });
      
      await requestUpdateCheck(true);
      
      // Simulate update-available event
      const updateAvailableHandler = autoUpdater.on.mock.calls.find(
        call => call[0] === 'update-available'
      )[1];
      
      await updateAvailableHandler(mockInfo);
      
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Update available',
          message: 'Chattio 2.0.0 is available.'
        })
      );
    });

    it('should handle update not available scenario', async () => {
      await requestUpdateCheck(true);
      
      // Simulate update-not-available event
      const updateNotAvailableHandler = autoUpdater.on.mock.calls.find(
        call => call[0] === 'update-not-available'
      )[1];
      
      await updateNotAvailableHandler();
      
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'No updates found',
          message: 'You already have the latest version of Chattio.'
        })
      );
    });

    it('should handle update downloaded scenario', async () => {
      await requestUpdateCheck(false);
      
      // Simulate update-downloaded event
      const updateDownloadedHandler = autoUpdater.on.mock.calls.find(
        call => call[0] === 'update-downloaded'
      )[1];
      
      await updateDownloadedHandler();
      
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Update ready',
          message: 'A new version of Chattio has been downloaded.'
        })
      );
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Network error');
      autoUpdater.checkForUpdates.mockRejectedValueOnce(mockError);
      
      await requestUpdateCheck(true);
      
      // Simulate error event
      const errorHandler = autoUpdater.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      await errorHandler(mockError);
      
      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'Update failed',
        'Unable to check for updates.'
      );
    });
  });

  describe('update installation', () => {
    it('should install update when user confirms', async () => {
      // Mock user confirms installation
      dialog.showMessageBox.mockResolvedValueOnce({ response: 0 });
      
      await requestUpdateCheck(true);
      
      // Simulate update-downloaded event
      const updateDownloadedHandler = autoUpdater.on.mock.calls.find(
        call => call[0] === 'update-downloaded'
      )[1];
      
      await updateDownloadedHandler();
      
      expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
    });

    it('should not install update when user cancels', async () => {
      // Mock user cancels installation
      dialog.showMessageBox.mockResolvedValueOnce({ response: 1 });
      
      await requestUpdateCheck(true);
      
      // Simulate update-downloaded event
      const updateDownloadedHandler = autoUpdater.on.mock.calls.find(
        call => call[0] === 'update-downloaded'
      )[1];
      
      await updateDownloadedHandler();
      
      expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });
  });
});
