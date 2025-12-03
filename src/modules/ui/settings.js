const { ipcRenderer } = require('electron');
const appState = require('../state/appState');
const logger = require('../../lib/logger');

class SettingsManager {
  constructor() {
    this.settingsForm = null;
    this.themeSelect = null;
    this.densitySelect = null;
    this.notificationToggle = null;
    this.badgeToggle = null;
    this.launchAtLoginToggle = null;
    this.hardwareAccelToggle = null;
    
    this.initialize();
  }

  initialize() {
    // Initialize settings UI when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
    
    // Listen for settings changes from other windows
    ipcRenderer.on('settings-updated', (_, settings) => {
      this.updateUI(settings);
    });
  }

  setupUI() {
    // Get references to UI elements
    this.settingsForm = document.getElementById('settings-form');
    this.themeSelect = document.getElementById('theme-select');
    this.densitySelect = document.getElementById('density-select');
    this.notificationToggle = document.getElementById('notifications-toggle');
    this.badgeToggle = document.getElementById('badge-toggle');
    this.launchAtLoginToggle = document.getElementById('launch-login-toggle');
    this.hardwareAccelToggle = document.getElementById('hardware-accel-toggle');
    this.resetSettingsBtn = document.getElementById('reset-settings');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load current settings
    this.loadSettings();
  }

  setupEventListeners() {
    if (!this.settingsForm) return;
    
    // Theme change
    if (this.themeSelect) {
      this.themeSelect.addEventListener('change', (e) => {
        this.saveSetting('theme', e.target.value);
      });
    }
    
    // Density change
    if (this.densitySelect) {
      this.densitySelect.addEventListener('change', (e) => {
        this.saveSetting('sidebarDensity', e.target.value);
      });
    }
    
    // Toggle switches
    const toggles = [
      { element: this.notificationToggle, setting: 'globalNotifications' },
      { element: this.badgeToggle, setting: 'badgeDockIcon' },
      { element: this.launchAtLoginToggle, setting: 'launchAtLogin' },
      { element: this.hardwareAccelToggle, setting: 'hardwareAcceleration' }
    ];
    
    toggles.forEach(({ element, setting }) => {
      if (element) {
        element.addEventListener('change', (e) => {
          this.saveSetting(setting, e.target.checked);
        });
      }
    });
    
    // Reset settings
    if (this.resetSettingsBtn) {
      this.resetSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to reset all settings to default?')) {
          this.resetSettings();
        }
      });
    }
  }

  loadSettings() {
    const { settings } = appState.getState();
    this.updateUI(settings);
  }

  updateUI(settings) {
    if (!settings) return;
    
    // Update theme select
    if (this.themeSelect) {
      this.themeSelect.value = settings.theme || 'system';
    }
    
    // Update density select
    if (this.densitySelect) {
      this.densitySelect.value = settings.sidebarDensity || 'comfortable';
    }
    
    // Update toggles
    const toggles = [
      { element: this.notificationToggle, setting: 'globalNotifications' },
      { element: this.badgeToggle, setting: 'badgeDockIcon' },
      { element: this.launchAtLoginToggle, setting: 'launchAtLogin' },
      { element: this.hardwareAccelToggle, setting: 'hardwareAcceleration' }
    ];
    
    toggles.forEach(({ element, setting }) => {
      if (element) {
        element.checked = !!settings[setting];
      }
    });
    
    // Apply theme
    this.applyTheme(settings.theme);
  }

  saveSetting(key, value) {
    try {
      // Update app state
      appState.updateState({
        settings: {
          [key]: value
        }
      });
      
      // Special handling for theme changes
      if (key === 'theme') {
        this.applyTheme(value);
      }
      
      // Notify main process if needed (e.g., for launch at login)
      if (key === 'launchAtLogin' || key === 'hardwareAcceleration') {
        ipcRenderer.send('update-setting', { key, value });
      }
      
      logger.debug(`Setting updated: ${key} = ${value}`);
      return true;
    } catch (error) {
      logger.error('Error saving setting:', error);
      return false;
    }
  }

  async resetSettings() {
    try {
      // Reset to default settings
      const defaultSettings = {
        theme: 'system',
        sidebarDensity: 'comfortable',
        globalNotifications: true,
        badgeDockIcon: true,
        launchAtLogin: false,
        hardwareAcceleration: true
      };
      
      // Update app state
      appState.updateState({
        settings: defaultSettings
      });
      
      // Update UI
      this.updateUI(defaultSettings);
      
      // Notify main process
      ipcRenderer.send('reset-settings');
      
      logger.info('Settings reset to defaults');
      return true;
    } catch (error) {
      logger.error('Error resetting settings:', error);
      return false;
    }
  }

  applyTheme(theme) {
    // Remove all theme classes
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-system');
    
    // Add the selected theme class
    document.documentElement.classList.add(`theme-${theme || 'system'}`);
    
    // Notify other windows of theme change
    ipcRenderer.send('theme-changed', theme);
  }
}

// Create and export a singleton instance
const settingsManager = new SettingsManager();
module.exports = settingsManager;
