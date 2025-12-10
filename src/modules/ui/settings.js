const { ipcRenderer } = require('electron');
const appState = require('../state/appState');
const logger = require('../../lib/logger');
const { ShortcutManager } = require('../shortcuts/ShortcutManager');

class SettingsManager {
  constructor() {
    this.settingsForm = null;
    this.themeSelect = null;
    this.densitySelect = null;
    this.notificationToggle = null;
    this.badgeToggle = null;
    this.launchAtLoginToggle = null;
    this.hardwareAccelToggle = null;
    this.shortcutManager = new ShortcutManager();
    this.activeTab = 'general';

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

    // Set up tab switching
    this.setupTabs();

    // Set up event listeners
    this.setupEventListeners();

    // Load current settings
    this.loadSettings();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = tab.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Show the active tab by default
    this.switchTab(this.activeTab);
  }

  switchTab(tabId) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach((element) => {
      const contentElement = element;
      contentElement.style.display = 'none';
    });

    // Remove active class from all tabs
    document.querySelectorAll('.settings-tab').forEach((tabElement) => {
      tabElement.classList.remove('active');
    });

    // Show the selected tab content
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeContent) {
      activeContent.style.display = 'block';
    }

    // Add active class to the selected tab
    const activeTab = document.querySelector(`.settings-tab[data-tab="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    this.activeTab = tabId;

    // Initialize shortcut settings if needed
    if (tabId === 'shortcuts') {
      this.initializeShortcutSettings();
    }
  }

  initializeShortcutSettings() {
    const container = document.getElementById('shortcuts-container');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Get all registered shortcuts
    const shortcuts = this.shortcutManager.getAllShortcuts();

    // Group shortcuts by category
    const categories = {};
    Object.entries(shortcuts).forEach(([id, shortcut]) => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = [];
      }
      categories[shortcut.category].push({ id, ...shortcut });
    });

    // Create UI for each category
    Object.entries(categories).forEach(([category, categoryShortcuts]) => {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'shortcut-category';

      const categoryTitle = document.createElement('h3');
      categoryTitle.textContent = category;
      categoryElement.appendChild(categoryTitle);

      const shortcutsList = document.createElement('div');
      shortcutsList.className = 'shortcuts-list';

      categoryShortcuts.forEach((shortcut) => {
        const shortcutElement = this.createShortcutElement(shortcut);
        shortcutsList.appendChild(shortcutElement);
      });

      categoryElement.appendChild(shortcutsList);
      container.appendChild(categoryElement);
    });
  }

  createShortcutElement(shortcut) {
    const element = document.createElement('div');
    element.className = 'shortcut-item';
    element.dataset.id = shortcut.id;

    const label = document.createElement('span');
    label.className = 'shortcut-label';
    label.textContent = shortcut.description;

    const keys = document.createElement('div');
    keys.className = 'shortcut-keys';

    const keyElements = shortcut.key
      .split('+')
      .map((key) => {
        const keyElement = document.createElement('kbd');
        keyElement.textContent = key.trim();
        return keyElement.outerHTML;
      })
      .join(' + ');

    keys.innerHTML = keyElements;

    const editButton = document.createElement('button');
    editButton.className = 'btn btn-sm btn-outline-secondary edit-shortcut';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => this.startEditingShortcut(shortcut.id));

    element.appendChild(label);
    element.appendChild(keys);
    element.appendChild(editButton);

    return element;
  }

  startEditingShortcut(shortcutId) {
    const element = document.querySelector(`.shortcut-item[data-id="${shortcutId}"]`);
    if (!element) return;

    const keysElement = element.querySelector('.shortcut-keys');
    if (!keysElement) return;

    const originalContent = keysElement.innerHTML;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm shortcut-input';
    input.value = this.shortcutManager.getShortcut(shortcutId).key;

    keysElement.innerHTML = '';
    keysElement.appendChild(input);

    input.focus();

    const saveShortcut = () => {
      const newKey = input.value.trim();
      if (newKey) {
        this.shortcutManager.updateShortcut(shortcutId, newKey);
        this.initializeShortcutSettings(); // Refresh the view
      } else {
        keysElement.innerHTML = originalContent;
      }
    };

    input.addEventListener('blur', saveShortcut);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveShortcut();
      } else if (e.key === 'Escape') {
        keysElement.innerHTML = originalContent;
      }
    });
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
      { element: this.hardwareAccelToggle, setting: 'hardwareAcceleration' },
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
      { element: this.hardwareAccelToggle, setting: 'hardwareAcceleration' },
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
          [key]: value,
        },
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
