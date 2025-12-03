const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const WindowStateManager = require('../../src/lib/windowStateManager');

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/electron-test')
  }
}));

// Mock fs methods
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2
  }
}));

describe('WindowStateManager', () => {
  let windowStateManager;
  const testStatePath = path.join('/tmp/electron-test', 'window-state.json');
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mocks
    fs.promises.access.mockResolvedValue();
    fs.promises.mkdir.mockResolvedValue();
    
    // Create a new instance for each test
    windowStateManager = new WindowStateManager(app);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(windowStateManager.userDataPath).toBe('/tmp/electron-test');
      expect(windowStateManager.windowStateFile).toBe(testStatePath);
      expect(windowStateManager.maxRetries).toBe(3);
      expect(windowStateManager.retryDelay).toBe(100);
    });

    it('should throw if app instance is invalid', () => {
      expect(() => new WindowStateManager(null)).toThrow('Invalid app instance');
      expect(() => new WindowStateManager({})).toThrow('Invalid app instance');
    });
  });

  describe('ensureUserDataDir', () => {
    it('should create directory if it does not exist', async () => {
      const error = new Error('Not found');
      error.code = 'ENOENT';
      fs.promises.access.mockRejectedValueOnce(error);
      
      await windowStateManager.ensureUserDataDir();
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith('/tmp/electron-test', { recursive: true });
    });

    it('should not create directory if it exists', async () => {
      await windowStateManager.ensureUserDataDir();
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('validateState', () => {
    it('should validate a valid state object', () => {
      const validState = {
        width: 1000,
        height: 800,
        x: 100,
        y: 100
      };
      expect(windowStateManager.validateState(validState)).toBe(true);
    });

    it('should reject invalid state objects', () => {
      expect(windowStateManager.validateState(null)).toBe(false);
      expect(windowStateManager.validateState({})).toBe(false);
      expect(windowStateManager.validateState({
        width: 'invalid',
        height: 800,
        x: 100,
        y: 100
      })).toBe(false);
    });
  });

  describe('load', () => {
    it('should return null for non-existent state file', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.promises.access.mockRejectedValueOnce(error);
      
      const state = await windowStateManager.load();
      expect(state).toBeNull();
    });

    it('should return parsed state for valid file', async () => {
      const mockState = {
        width: 1000,
        height: 800,
        x: 100,
        y: 100,
        isMaximized: false
      };
      
      fs.promises.readFile.mockResolvedValueOnce(JSON.stringify(mockState));
      
      const state = await windowStateManager.load();
      expect(state).toEqual(mockState);
    });

    it('should retry on read errors', async () => {
      fs.promises.readFile
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(JSON.stringify({ width: 1000, height: 800, x: 0, y: 0 }));
      
      const state = await windowStateManager.load();
      expect(state).toEqual({ width: 1000, height: 800, x: 0, y: 0 });
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('save', () => {
    const mockBounds = {
      x: 100,
      y: 100,
      width: 1000,
      height: 800
    };

    it('should save valid state', async () => {
      const result = await windowStateManager.save(mockBounds, false);
      expect(result).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      const error = new Error('No such file');
      error.code = 'ENOENT';
      fs.promises.writeFile.mockRejectedValueOnce(error);
      
      const result = await windowStateManager.save(mockBounds, false);
      expect(result).toBe(true);
      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('should return false for invalid bounds', async () => {
      const result = await windowStateManager.save(null, false);
      expect(result).toBe(false);
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('getWindowOptions', () => {
    it('should return default options for null state', () => {
      const options = windowStateManager.getWindowOptions(null);
      expect(options.width).toBeGreaterThanOrEqual(800);
      expect(options.height).toBeGreaterThanOrEqual(600);
      expect(options.minWidth).toBe(400);
      expect(options.minHeight).toBe(300);
    });

    it('should use saved dimensions', () => {
      const savedState = {
        width: 1200,
        height: 900,
        x: 100,
        y: 100
      };
      
      const options = windowStateManager.getWindowOptions(savedState);
      expect(options.width).toBe(1200);
      expect(options.height).toBe(900);
      expect(options.x).toBe(100);
      expect(options.y).toBe(100);
    });

    it('should respect minimum dimensions', () => {
      const savedState = {
        width: 300,  // Below minimum
        height: 200, // Below minimum
        x: 0,
        y: 0
      };
      
      const options = windowStateManager.getWindowOptions(savedState);
      expect(options.width).toBe(400);  // Should use minimum
      expect(options.height).toBe(300); // Should use minimum
    });
  });
});
