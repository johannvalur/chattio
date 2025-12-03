const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const accessAsync = promisify(fs.access);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

class WindowStateManager {
  constructor(app) {
    if (!app || typeof app.getPath !== 'function') {
      throw new Error('Invalid app instance provided to WindowStateManager');
    }
    
    this.userDataPath = app.getPath('userData');
    this.windowStateFile = path.join(this.userDataPath, 'window-state.json');
    this.maxRetries = 3;
    this.retryDelay = 100; // ms
  }

  /**
   * Ensures the user data directory exists
   */
  async ensureUserDataDir() {
    try {
      await accessAsync(this.userDataPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await mkdirAsync(this.userDataPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Loads window state with retry logic
   */
  async load() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await accessAsync(this.windowStateFile, fs.constants.R_OK);
        const data = await readFileAsync(this.windowStateFile, 'utf8');
        
        if (!data.trim()) {
          console.warn('Window state file is empty');
          return null;
        }

        const state = JSON.parse(data);
        
        // Validate the loaded state
        if (this.validateState(state)) {
          return state;
        }
        
        console.warn('Invalid window state format, using defaults');
        return null;
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist yet, which is fine for first run
          return null;
        }
        
        if (attempt === this.maxRetries) {
          console.error(`Failed to load window state after ${this.maxRetries} attempts:`, error);
          return null;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    return null;
  }

  /**
   * Validates the window state object
   */
  validateState(state) {
    if (!state || typeof state !== 'object') return false;
    
    // Check for required numeric properties
    const requiredProps = ['width', 'height', 'x', 'y'];
    for (const prop of requiredProps) {
      if (typeof state[prop] !== 'number' || !isFinite(state[prop]) || state[prop] <= 0) {
        return false;
      }
    }
    
    // Validate screen boundaries (basic check)
    if (state.x > 10000 || state.y > 10000) {
      return false;
    }
    
    return true;
  }

  /**
   * Saves window state with retry logic and validation
   */
  async save(bounds, isMaximized) {
    if (!bounds || typeof bounds !== 'object') {
      console.error('Invalid bounds provided to save');
      return false;
    }

    const state = {
      width: Math.floor(bounds.width),
      height: Math.floor(bounds.height),
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      isMaximized: Boolean(isMaximized),
      lastUpdated: new Date().toISOString()
    };

    // Validate before saving
    if (!this.validateState(state)) {
      console.error('Invalid window state, not saving:', state);
      return false;
    }

    try {
      await this.ensureUserDataDir();
      
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          await writeFileAsync(
            this.windowStateFile,
            JSON.stringify(state, null, 2),
            { encoding: 'utf8', mode: 0o600 } // Restrictive permissions
          );
          return true;
        } catch (error) {
          if (attempt === this.maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    } catch (error) {
      console.error('Failed to save window state:', error);
      // Consider notifying the user if this is critical
      return false;
    }
    
    return true;
  }

  /**
   * Gets window options with validation and fallbacks
   */
  getWindowOptions(savedState, defaultOptions = {}) {
    const defaultWidth = Math.max(800, Math.min(2560, 1200));
    const defaultHeight = Math.max(600, Math.min(1440, 800));
    
    const windowOptions = {
      width: (savedState?.width && savedState.width > 0) ? Math.floor(savedState.width) : defaultWidth,
      height: (savedState?.height && savedState.height > 0) ? Math.floor(savedState.height) : defaultHeight,
      minWidth: 400,
      minHeight: 300,
      ...defaultOptions
    };
    
    // Restore position if saved and valid
    if (savedState && 
        typeof savedState.x === 'number' && 
        typeof savedState.y === 'number' &&
        savedState.x >= 0 && 
        savedState.y >= 0) {
      windowOptions.x = Math.floor(savedState.x);
      windowOptions.y = Math.floor(savedState.y);
    }
    
    return windowOptions;
  }
}

module.exports = WindowStateManager;
