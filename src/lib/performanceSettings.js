const logger = require('./logger');
const { ipcRenderer } = require('electron');

/**
 * Performance settings manager
 * Handles user-configurable performance options
 */
class PerformanceSettings {
  constructor() {
    this.defaults = {
      maxActiveWebviews: 3,
      inactivityTimeoutMinutes: 5,
      hardwareAcceleration: true,
    };

    this.settings = { ...this.defaults };
    this.listeners = new Set();

    // Load settings from localStorage
    this.load();
  }

  /**
   * Load settings from storage
   */
  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('chattio-performance-settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.settings = { ...this.defaults, ...parsed };
          logger.info('Performance settings loaded:', this.settings);
        }
      }
    } catch (error) {
      logger.error('Failed to load performance settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('chattio-performance-settings', JSON.stringify(this.settings));
        logger.info('Performance settings saved:', this.settings);

        // Also save to file for main process access (hardware acceleration)
        if (ipcRenderer) {
          ipcRenderer.send('save-performance-settings', this.settings);
        }

        this.notifyListeners();
      }
    } catch (error) {
      logger.error('Failed to save performance settings:', error);
    }
  }

  /**
   * Get a specific setting
   * @param {string} key - Setting key
   * @returns {*} Setting value
   */
  get(key) {
    return this.settings[key];
  }

  /**
   * Set a specific setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  set(key, value) {
    if (this.settings[key] !== value) {
      this.settings[key] = value;
      this.save();
    }
  }

  /**
   * Get all settings
   * @returns {object} All settings
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Update multiple settings at once
   * @param {object} updates - Settings to update
   */
  update(updates) {
    let changed = false;
    Object.entries(updates).forEach(([key, value]) => {
      if (this.settings[key] !== value) {
        this.settings[key] = value;
        changed = true;
      }
    });

    if (changed) {
      this.save();
    }
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.settings = { ...this.defaults };
    this.save();
  }

  /**
   * Get inactivity timeout in milliseconds
   * @returns {number} Timeout in milliseconds
   */
  getInactivityTimeoutMs() {
    return this.settings.inactivityTimeoutMinutes * 60 * 1000;
  }

  /**
   * Add a listener for settings changes
   * @param {function} listener - Callback function
   * @returns {function} Unsubscribe function
   */
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.settings);
      } catch (error) {
        logger.error('Error in performance settings listener:', error);
      }
    });
  }
}

// Create and export singleton
const performanceSettings = new PerformanceSettings();
module.exports = performanceSettings;
