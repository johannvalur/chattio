const { ipcRenderer, shell } = require('electron');
const { applyThemeToDocument } = require('./lib/theme');
const { CHROME_USER_AGENT, PLATFORMS } = require('./lib/config');
const logger = require('./lib/logger');
const telemetry = require('./lib/telemetry');
const performanceSettings = require('./lib/performanceSettings');

const { collectButtonRefs, applySidebarState } = require('./lib/sidebarManager');

const PLATFORM_KEYS = Object.keys(PLATFORMS);

const UNREAD_STORAGE_KEY = 'chattio-unread-state';

// Extended unread state for all platforms (stores counts)
const unreadState = PLATFORM_KEYS.reduce((state, platform) => {
  state[platform] = 0;
  return state;
}, {});

function updateUnreadSummary() {
  try {
    const unreadEntries = Object.entries(unreadState).filter(
      ([platform, count]) => count > 0 && isNotificationsEnabled(platform)
    );
    const hasUnreadServices = unreadEntries.length;
    const totalMessages = unreadEntries.reduce((sum, [_, count]) => sum + count, 0);

    // Only send badge update if badge is enabled
    if (appState.settings.badgeDockIcon) {
      ipcRenderer.send('unread-summary', {
        ...unreadState,
        totalUnreadServices: hasUnreadServices,
        totalMessages: totalMessages,
      });
    } else {
      // Clear badge if disabled
      ipcRenderer.send('unread-summary', {
        ...unreadState,
        totalUnreadServices: 0,
        totalMessages: 0,
      });
    }

    // Send native notification if enabled and there are unread messages
    if (appState.settings.globalNotifications && totalMessages > 0) {
      if (totalMessages > lastNotificationSnapshot) {
        sendNativeNotification(unreadEntries, totalMessages);
        lastNotificationSnapshot = totalMessages;
      }
    } else {
      // When notifications disabled or no unread, keep snapshot in sync to avoid noise when re-enabled
      if (totalMessages === 0) {
        lastNotificationSnapshot = 0;
      } else {
        lastNotificationSnapshot = totalMessages;
      }
    }
  } catch (error) {
    logger.error('Error updating unread summary:', error);
  }
}

// Track last notification time to prevent spam
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 5000; // 5 seconds between notifications
let lastNotificationSnapshot = 0;

// Send native macOS notification
function sendNativeNotification(unreadEntries, totalMessages) {
  try {
    // Check if Notification API is available
    if ('Notification' in window) {
      // Request permission if not already granted
      if (Notification.permission === 'default') {
        Notification.requestPermission();
        return;
      }

      // Only send if permission is granted and cooldown has passed
      if (Notification.permission === 'granted') {
        const now = Date.now();
        if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
          return; // Too soon, skip notification
        }
        lastNotificationTime = now;

        const platformNames = unreadEntries.map(([platform]) => {
          const names = {
            messenger: 'Messenger',
            whatsapp: 'WhatsApp',
            instagram: 'Instagram',
            linkedin: 'LinkedIn',
            x: 'X',
            slack: 'Slack',
            telegram: 'Telegram',
            discord: 'Discord',
            teams: 'Teams',
          };
          return names[platform] || platform;
        });

        let message = '';
        if (platformNames.length === 1) {
          message = `${totalMessages} new ${totalMessages === 1 ? 'message' : 'messages'} in ${platformNames[0]}`;
        } else {
          message = `${totalMessages} new messages across ${platformNames.length} services`;
        }

        new Notification('Chattio', {
          body: message,
          icon: '../public/transparent.png',
          tag: 'chattio-unread',
          requireInteraction: false,
        });
      }
    }
  } catch (error) {
    logger.error('Error sending native notification:', error);
  }
}

function saveUnreadState() {
  try {
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(unreadState));
  } catch (error) {
    logger.error('Error saving unread state:', error);
  }
}

function restoreUnreadState() {
  try {
    const saved = localStorage.getItem(UNREAD_STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([platform, count]) => {
      if (platform in unreadState) {
        setTabUnread(platform, count, { silent: true, skipPersist: true });
      }
    });
    updateUnreadSummary();
  } catch (error) {
    logger.error('Error restoring unread state:', error);
  }
}

function setTabUnread(platform, count, options = {}) {
  const { silent = false, skipPersist = false } = options;
  const unreadCount = Math.max(0, Number(count) || 0);
  unreadState[platform] = unreadCount;
  const tabButton = document.querySelector(`.tablinks[data-platform="${platform}"]`);
  const notificationsEnabled = isNotificationsEnabled(platform);
  if (tabButton) {
    if (notificationsEnabled && unreadCount > 0) {
      tabButton.classList.add('has-unread');
      const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);
      tabButton.setAttribute('data-unread-count', displayCount);
    } else {
      tabButton.classList.remove('has-unread');
      tabButton.removeAttribute('data-unread-count');
    }
  }
  if (!skipPersist) {
    saveUnreadState();
  }
  if (!silent) {
    updateUnreadSummary();
  }
}

function openTab(evt, platform) {
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }

  const tablinks = document.getElementsByClassName('tablinks');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '');
  }

  document.getElementById(platform).style.display = 'block';
  evt.currentTarget.className += ' active';

  // Do not reset unread count immediately; rely on service title updates
}

// Modern Chrome user agent string to avoid browser compatibility issues
// Using config file for centralized constant
const chromeUserAgent = CHROME_USER_AGENT;

// Secure webview defaults
const WEBVIEW_DEFAULTS = {
  // Disable node integration for security
  nodeIntegration: false,
  // Enable context isolation
  contextIsolation: true,
  // Enable web security
  webSecurity: true,
  // Disallow running insecure content
  allowRunningInsecureContent: false,
  // Disable webview tag (we'll enable it per-webview)
  webviewTag: false,
  // Enable sandbox
  sandbox: true,
};

// Secure webview attributes
const SECURE_WEBVIEW_ATTRIBUTES = {
  // Disable popups
  allowpopups: 'false',
  // Disable web security (use with caution, only if absolutely necessary)
  webpreferences: Object.entries(WEBVIEW_DEFAULTS)
    .map(([key, value]) => `${key}=${value}`)
    .join(','),
};

// Function to safely set webview attributes
function setWebviewAttributes(webview, attributes) {
  Object.entries(attributes).forEach(([key, value]) => {
    try {
      webview.setAttribute(key, value);
    } catch (error) {
      console.warn(`Failed to set webview attribute ${key}:`, error);
    }
  });
}

function getPlatformHost(platform) {
  try {
    const platformConfig = PLATFORMS[platform];
    if (!platformConfig || !platformConfig.url) return null;
    const url = new URL(platformConfig.url);
    return url.host;
  } catch (error) {
    logger.warn('Failed to get platform host', platform, error);
    return null;
  }
}

function isInternalHost(targetHost, baseHost) {
  if (!targetHost || !baseHost) return false;
  if (targetHost === baseHost) return true;
  return targetHost.endsWith(`.${baseHost}`);
}

function openExternalLink(url) {
  if (!url) return;
  try {
    shell.openExternal(url);
  } catch (error) {
    logger.error('Failed to open external link:', url, error);
  }
}

function createPlatformButton(platform, config) {
  const button = document.createElement('button');
  button.className = 'tablinks';
  button.setAttribute('data-platform', platform);
  button.setAttribute('title', config.name);
  button.addEventListener('click', (event) => openTab(event, platform));

  const icon = document.createElement('img');
  icon.className = 'tab-icon';
  icon.src = `../public/icons/${config.icon}`;
  icon.alt = config.name;
  button.appendChild(icon);

  return button;
}

function renderSidebarButtons() {
  try {
    const sidebarMain = document.querySelector('.sidebar-main');
    if (!sidebarMain) {
      logger.warn('Sidebar main not found while rendering buttons');
      return;
    }

    const existing = sidebarMain.querySelectorAll(
      '.tablinks[data-platform]:not([data-platform="welcome"])'
    );
    existing.forEach((btn) => btn.remove());

    const fragment = document.createDocumentFragment();
    PLATFORM_KEYS.forEach((platform) => {
      const config = PLATFORMS[platform];
      if (!config) return;
      fragment.appendChild(createPlatformButton(platform, config));
    });
    sidebarMain.appendChild(fragment);
  } catch (error) {
    logger.error('Failed to render sidebar buttons', error);
  }
}

function createPlatformTab(platform, config) {
  const tab = document.createElement('div');
  tab.id = platform;
  tab.className = 'tabcontent';
  tab.style.display = 'none';

  const webview = document.createElement('webview');
  webview.id = `${platform}-webview`;
  webview.src = config.url;
  webview.style.width = '100%';
  webview.style.height = '100vh';
  if (config.needsUserAgent) {
    webview.setAttribute('useragent', CHROME_USER_AGENT);
  }

  tab.appendChild(webview);
  return tab;
}

function renderPlatformTabs() {
  try {
    const mainContent = document.querySelector('.main-content');
    const settingsTab = document.getElementById('settings');
    if (!mainContent || !settingsTab) {
      logger.warn('Main content or settings tab missing while rendering platform tabs');
      return;
    }

    PLATFORM_KEYS.forEach((platform) => {
      const existing = document.getElementById(platform);
      if (existing) {
        existing.remove();
      }
    });

    const fragment = document.createDocumentFragment();
    PLATFORM_KEYS.forEach((platform) => {
      const config = PLATFORMS[platform];
      if (!config) return;
      fragment.appendChild(createPlatformTab(platform, config));
    });

    mainContent.insertBefore(fragment, settingsTab);
  } catch (error) {
    logger.error('Failed to render platform tabs', error);
  }
}

// Setup webviews after DOM is ready
function setupWebviews() {
  const webviews = document.querySelectorAll('webview');
  webviews.forEach((webview) => {
    const platform = webview.id.replace('-webview', '');
    const platformHost = getPlatformHost(platform);

    // Enable additional features for better compatibility
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=no,nodeIntegration=no');

    // Set user agent attribute (this works before webview is ready)
    if (!webview.getAttribute('useragent')) {
      webview.setAttribute('useragent', chromeUserAgent);
    }

    // Set user agent via method only after webview is ready (avoids errors)
    webview.addEventListener(
      'dom-ready',
      () => {
        if (typeof webview.setUserAgent === 'function') {
          try {
            webview.setUserAgent(chromeUserAgent);
          } catch (_e) {
            // Silently ignore - useragent attribute is already set
          }
        }
      },
      { once: true }
    );

    // For Slack and WhatsApp, set user agent before navigation
    if (platform === 'slack' || platform === 'whatsapp' || platform === 'teams') {
      webview.addEventListener('will-navigate', (_event) => {
        if (typeof webview.setUserAgent === 'function') {
          try {
            webview.setUserAgent(chromeUserAgent);
          } catch (_e) {
            // Ignore errors
          }
        }
      });

      webview.addEventListener('did-start-navigation', (_event) => {
        if (typeof webview.setUserAgent === 'function') {
          try {
            webview.setUserAgent(chromeUserAgent);
          } catch (_e) {
            // Ignore errors
          }
        }
      });
    }

    webview.addEventListener('new-window', (event) => {
      if (event.url) {
        event.preventDefault();
        openExternalLink(event.url);
      }
    });

    webview.addEventListener('will-navigate', (event) => {
      if (!event.url) return;
      try {
        if (!platformHost) {
          // No base host defined, open externally by default
          event.preventDefault();
          openExternalLink(event.url);
          return;
        }
        const targetHost = new URL(event.url).host;
        if (!isInternalHost(targetHost, platformHost)) {
          event.preventDefault();
          openExternalLink(event.url);
        }
      } catch (error) {
        logger.error('Failed to handle navigation for', platform, error);
      }
    });

    const updateUnreadFromTitle = (title) => {
      const trimmedTitle = (title || '').trim();
      const match = trimmedTitle.match(/^\((\d+)\)/);
      const unreadCount = match ? parseInt(match[1], 10) : 0;
      setTabUnread(platform, unreadCount);
    };

    let lastKnownTitle = '';
    const pollTitle = () => {
      try {
        const title = webview.getTitle ? webview.getTitle() : '';
        if (title && title !== lastKnownTitle) {
          lastKnownTitle = title;
          updateUnreadFromTitle(title);
        }
      } catch (e) {
        // ignore
      }
    };

    webview.addEventListener('did-stop-loading', () => {
      try {
        const title = webview.getTitle ? webview.getTitle() : '';
        lastKnownTitle = title;
        updateUnreadFromTitle(title);
      } catch (e) {
        // Ignore errors
      }
    });

    webview.addEventListener('page-title-updated', (event) => {
      const newTitle = event.title || '';
      lastKnownTitle = newTitle;
      updateUnreadFromTitle(newTitle);
    });

    const titleInterval = setInterval(pollTitle, 5000);
    webview.addEventListener('destroyed', () => clearInterval(titleInterval));
    webview.addEventListener('close', () => clearInterval(titleInterval));

    if (platform === 'messenger') {
      const pollMessengerUnread = () => {
        if (typeof webview.executeJavaScript !== 'function') {
          return;
        }
        webview
          .executeJavaScript(
            `
					(() => {
						try {
							const badge = document.querySelector('[data-testid="mwthreadlist_unread_badge_count"], [data-testid="unread_indicator_badge"]');
							if (badge && badge.textContent) {
								return badge.textContent.trim();
							}
							const unreadRows = Array.from(document.querySelectorAll('[role="row"], [data-testid="mwthreadlist-row"]')).filter(row => {
								const label = (row.getAttribute('aria-label') || '').toLowerCase();
								return label.includes('unread') || label.includes('new message');
							});
							const unreadDots = document.querySelectorAll('[aria-label="Unread"], [aria-label="Unread dot"], [aria-label="Mark as read"], [data-testid="mwthreadlist_row_unread_indicator"]');
							const counts = [
								unreadRows.length,
								unreadDots ? unreadDots.length : 0
							].filter(Boolean);
							return counts.length ? Math.max(...counts) : 0;
						} catch (err) {
							return 0;
						}
					})()
				`
          )
          .then((result) => {
            const count = parseInt(result, 10);
            if (!Number.isNaN(count)) {
              setTabUnread(platform, count);
            }
          })
          .catch(() => {});
      };
      const messengerInterval = setInterval(pollMessengerUnread, 4000);
      webview.addEventListener('destroyed', () => clearInterval(messengerInterval));
      webview.addEventListener('close', () => clearInterval(messengerInterval));
    }

    webview.addEventListener(
      'did-fail-load',
      (event) => {
        // Only log errors that we don't explicitly ignore
        if (![-3, -102, -105, -106, -107, -109].includes(event.errorCode)) {
          logger.error('WebView failed to load:', {
            errorCode: event.errorCode,
            errorDescription: event.errorDescription,
            validatedURL: event.validatedURL,
            isMainFrame: event.isMainFrame,
          });
        }

        // For certain error codes, we can try to recover
        if (event.errorCode === -105) {
          // CONNECTION_REFUSED
          setTimeout(() => webview.reload(), 2000);
        }
      },
      { passive: true }
    );

    // Apply secure attributes to all webviews
    setWebviewAttributes(webview, SECURE_WEBVIEW_ATTRIBUTES);

    // For WhatsApp, Slack, and Teams specifically, inject scripts to bypass browser checks
    if (platform === 'whatsapp' || platform === 'slack' || platform === 'teams') {
      webview.addEventListener('dom-ready', () => {
        // Inject script multiple times to ensure it works
        const injectScript = () => {
          if (typeof webview.executeJavaScript === 'function') {
            webview
              .executeJavaScript(
                `
							(function() {
								try {
									// Override navigator.userAgent
									Object.defineProperty(navigator, 'userAgent', {
										get: function() {
											return '${chromeUserAgent}';
										},
										configurable: true
									});
									
									// Override navigator.platform
									Object.defineProperty(navigator, 'platform', {
										get: function() {
											return 'MacIntel';
										},
										configurable: true
									});
									
									// Override navigator.vendor
									Object.defineProperty(navigator, 'vendor', {
										get: function() {
											return 'Google Inc.';
										},
										configurable: true
									});
									
									// Override navigator.appVersion
									Object.defineProperty(navigator, 'appVersion', {
										get: function() {
											return '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
										},
										configurable: true
									});
									
									// Remove Electron-specific properties
									if (window.navigator.standalone !== undefined) {
										delete window.navigator.standalone;
									}
									
									// Override window.chrome
									if (!window.chrome) {
										window.chrome = {};
									}
									window.chrome.runtime = {};
								} catch(e) {
									console.log('Navigator override error:', e);
								}
							})();
						`
              )
              .catch((err) => logger.warn('Script injection error:', err));
          }
        };

        injectScript();
        // Also inject after a short delay to catch late-loading scripts
        setTimeout(injectScript, 100);
        setTimeout(injectScript, 500);
      });
    }
  });
}

// Keyboard shortcuts have been removed

// App state management
function buildDefaultAppsState() {
  return PLATFORM_KEYS.reduce((acc, platform) => {
    acc[platform] = { enabled: true, notifications: true };
    return acc;
  }, {});
}

const appState = {
  apps: buildDefaultAppsState(),
  order: [...PLATFORM_KEYS],
  settings: {
    globalNotifications: true,
    badgeDockIcon: true,
    sidebarDensity: 'comfortable', // 'comfortable' or 'compact'
    telemetry: false,
  },
};

const defaultAppStateSnapshot = JSON.parse(JSON.stringify(appState));

function isNotificationsEnabled(platform) {
  const appEntry = appState.apps[platform];
  if (!appEntry) {
    return false;
  }
  return appEntry.enabled !== false && appEntry.notifications !== false;
}

// Load app state from localStorage
function loadAppState() {
  try {
    const savedState = localStorage.getItem('chattio-app-state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.apps) {
        Object.assign(appState.apps, parsed.apps);
      }
      if (parsed.order && Array.isArray(parsed.order)) {
        appState.order = parsed.order;
      }
      if (parsed.settings) {
        Object.assign(appState.settings, parsed.settings);
      }
    }
  } catch (e) {
    logger.error('Error loading app state:', e);
  }
}

// Save app state to localStorage
function saveAppState() {
  try {
    localStorage.setItem('chattio-app-state', JSON.stringify(appState));
  } catch (e) {
    logger.error('Error saving app state:', e);
  }
}

// Apply sidebar density setting
function applySidebarDensity(density) {
  try {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    if (density === 'compact') {
      sidebar.classList.add('sidebar-compact');
      sidebar.classList.remove('sidebar-comfortable');
    } else {
      sidebar.classList.add('sidebar-comfortable');
      sidebar.classList.remove('sidebar-compact');
    }
  } catch (error) {
    logger.error('Error applying sidebar density:', error);
  }
}

// Setup global settings toggles
function setupGlobalSettings() {
  try {
    // Global notifications toggle
    const globalNotificationsToggle = document.getElementById('global-notifications-toggle');
    if (globalNotificationsToggle) {
      globalNotificationsToggle.checked = appState.settings.globalNotifications;
      globalNotificationsToggle.addEventListener('change', (e) => {
        appState.settings.globalNotifications = e.target.checked;
        saveAppState();
        logger.log(`Global notifications ${e.target.checked ? 'enabled' : 'disabled'}`);

        // Request notification permission if enabling
        if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });
    }

    // Badge dock icon toggle
    const badgeDockIconToggle = document.getElementById('badge-dock-icon-toggle');
    if (badgeDockIconToggle) {
      badgeDockIconToggle.checked = appState.settings.badgeDockIcon;
      badgeDockIconToggle.addEventListener('change', (e) => {
        appState.settings.badgeDockIcon = e.target.checked;
        saveAppState();
        logger.log(`Badge dock icon ${e.target.checked ? 'enabled' : 'disabled'}`);
        // Update badge immediately
        updateUnreadSummary();
      });
    }

    // Notification sounds toggle
    const notificationSoundsToggle = document.getElementById('notification-sounds-toggle');
    if (notificationSoundsToggle) {
      notificationSoundsToggle.checked = appState.settings.notificationSounds !== false;
      notificationSoundsToggle.addEventListener('change', (e) => {
        appState.settings.notificationSounds = e.target.checked;
        saveAppState();
        logger.log(`Notification sounds ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    // Notification preview toggle
    const notificationPreviewToggle = document.getElementById('notification-preview-toggle');
    if (notificationPreviewToggle) {
      notificationPreviewToggle.checked = appState.settings.notificationPreview !== false;
      notificationPreviewToggle.addEventListener('change', (e) => {
        appState.settings.notificationPreview = e.target.checked;
        saveAppState();
        logger.log(`Notification preview ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    // Do Not Disturb toggle
    const dndToggle = document.getElementById('dnd-toggle');
    if (dndToggle) {
      dndToggle.checked = appState.settings.doNotDisturb === true;
      dndToggle.addEventListener('change', (e) => {
        appState.settings.doNotDisturb = e.target.checked;
        saveAppState();
        logger.log(`Do Not Disturb ${e.target.checked ? 'enabled' : 'disabled'}`);
        updateUnreadSummary(); // Update notifications immediately
      });
    }

    // Do Not Disturb schedule toggle
    const dndScheduleToggle = document.getElementById('dnd-schedule-toggle');
    const dndScheduleSettings = document.getElementById('dnd-schedule-settings');
    if (dndScheduleToggle) {
      dndScheduleToggle.checked = appState.settings.doNotDisturbSchedule === true;
      if (dndScheduleSettings) {
        dndScheduleSettings.style.display = dndScheduleToggle.checked ? 'block' : 'none';
      }
      dndScheduleToggle.addEventListener('change', (e) => {
        appState.settings.doNotDisturbSchedule = e.target.checked;
        saveAppState();
        if (dndScheduleSettings) {
          dndScheduleSettings.style.display = e.target.checked ? 'block' : 'none';
        }
        logger.log(`Do Not Disturb schedule ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    // DND schedule time pickers
    const dndStartTime = document.getElementById('dnd-start-time');
    const dndEndTime = document.getElementById('dnd-end-time');
    if (dndStartTime) {
      dndStartTime.value = appState.settings.doNotDisturbStart || '22:00';
      dndStartTime.addEventListener('change', (e) => {
        appState.settings.doNotDisturbStart = e.target.value;
        saveAppState();
        logger.log(`DND start time set to ${e.target.value}`);
      });
    }
    if (dndEndTime) {
      dndEndTime.value = appState.settings.doNotDisturbEnd || '08:00';
      dndEndTime.addEventListener('change', (e) => {
        appState.settings.doNotDisturbEnd = e.target.value;
        saveAppState();
        logger.log(`DND end time set to ${e.target.value}`);
      });
    }

    const telemetryToggle = document.getElementById('telemetry-toggle');
    if (telemetryToggle) {
      telemetryToggle.checked = appState.settings.telemetry;
      telemetryToggle.addEventListener('change', (e) => {
        appState.settings.telemetry = e.target.checked;
        saveAppState();
        logger.log(`Telemetry ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    // Initialize per-app notification settings
    initializePerAppNotifications();

    // Initialize app visibility settings
    initializeAppVisibility();

    // Initialize unified app settings grid
    initializeAppSettings();

    // Theme chips
    const themeChips = document.querySelectorAll('.settings-chip[data-theme]');
    themeChips.forEach((chip) => {
      const theme = chip.getAttribute('data-theme');
      if (theme === (window.localStorage.getItem('chattio-theme') || 'system')) {
        chip.classList.add('active');
      }

      chip.addEventListener('click', () => {
        window.localStorage.setItem('chattio-theme', theme);
        applyTheme(theme);
        updateThemeChips(theme);
        updateAppearanceThemeChips();
        logger.log(`Theme set to ${theme}`);
      });
    });

    // Density chips
    const densityChips = document.querySelectorAll('.settings-chip[data-density]');
    densityChips.forEach((chip) => {
      const density = chip.getAttribute('data-density');
      if (density === appState.settings.sidebarDensity) {
        chip.classList.add('active');
      }

      chip.addEventListener('click', () => {
        appState.settings.sidebarDensity = density;
        saveAppState();
        applySidebarDensity(density);

        // Update chip states
        densityChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');

        logger.log(`Sidebar density set to ${density}`);
      });
    });
  } catch (error) {
    logger.error('Error setting up global settings:', error);
  }
}

let buttonRefs = new Map();

function initializeButtonRefs() {
  const sidebarMain = document.querySelector('.sidebar-main');
  buttonRefs = collectButtonRefs(sidebarMain);
}

// Update sidebar visibility based on app state
function updateSidebarVisibility() {
  const sidebarMain = document.querySelector('.sidebar-main');
  if (!sidebarMain) {
    logger.warn('Sidebar main not found');
    return;
  }

  // Ensure button refs populated
  if (!buttonRefs || buttonRefs.size === 0) {
    initializeButtonRefs();
  }

  // Get welcome button (should stay at top)
  const welcomeButton = sidebarMain.querySelector('.tablinks[data-platform="welcome"]');
  if (!welcomeButton) {
    logger.warn('Welcome button not found');
    return;
  }

  if (!buttonRefs || buttonRefs.size === 0) {
    logger.warn('No app buttons found');
    return;
  }
  try {
    applySidebarState({
      sidebarMain,
      welcomeButton,
      buttonRefs,
      appState,
    });
  } catch (error) {
    logger.error('Failed to update sidebar', error);
  }
}

// Update notification toggle disabled state
function updateNotificationToggles() {
  Object.keys(appState.apps).forEach((app) => {
    const notificationToggle = document.querySelector(
      `input[data-app="${app}"][data-toggle="notifications"]`
    );
    const appToggle = document.querySelector(`input[data-app="${app}"][data-toggle="app"]`);
    if (notificationToggle && appToggle) {
      notificationToggle.disabled = !appToggle.checked;
    }
  });
}

// Initialize per-app notification settings
function initializePerAppNotifications() {
  const container = document.getElementById('per-app-notifications-container');
  if (!container) return;

  container.innerHTML = '';

  Object.keys(appState.apps).forEach((platform) => {
    const app = appState.apps[platform];
    const platformConfig = PLATFORMS[platform];

    // Skip platforms that are not in the current PLATFORMS config
    if (!platformConfig) {
      return;
    }

    const platformName =
      platformConfig.name || platform.charAt(0).toUpperCase() + platform.slice(1);

    const toggleItem = document.createElement('div');
    toggleItem.className = 'settings-toggle-item';
    toggleItem.innerHTML = `
      <div class="settings-toggle-label">
        <label class="settings-label">${platformName}</label>
        <p class="settings-label-hint">Enable notifications for ${platformName}</p>
      </div>
      <label class="switch">
        <input type="checkbox" data-app="${platform}" data-toggle="notifications" ${app.notifications !== false ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    `;

    const toggle = toggleItem.querySelector('input');
    toggle.addEventListener('change', (e) => {
      appState.apps[platform].notifications = e.target.checked;
      saveAppState();
      logger.log(`${platformName} notifications ${e.target.checked ? 'enabled' : 'disabled'}`);
      updateUnreadSummary(); // Update badge/notifications immediately
    });

    container.appendChild(toggleItem);
  });
}

// Initialize app visibility settings
function initializeAppVisibility() {
  const container = document.getElementById('app-visibility-container');
  if (!container) return;

  container.innerHTML = '';

  Object.keys(appState.apps).forEach((platform) => {
    const app = appState.apps[platform];
    const platformConfig = PLATFORMS[platform];

    // Skip platforms that are not in the current PLATFORMS config
    if (!platformConfig) {
      return;
    }

    const platformName =
      platformConfig.name || platform.charAt(0).toUpperCase() + platform.slice(1);

    const toggleItem = document.createElement('div');
    toggleItem.className = 'settings-toggle-item';
    toggleItem.innerHTML = `
      <div class="settings-toggle-label">
        <label class="settings-label">${platformName}</label>
        <p class="settings-label-hint">Show ${platformName} in sidebar</p>
      </div>
      <label class="switch">
        <input type="checkbox" data-app="${platform}" data-toggle="visibility" ${app.enabled !== false ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    `;

    const toggle = toggleItem.querySelector('input');
    toggle.addEventListener('change', (e) => {
      appState.apps[platform].enabled = e.target.checked;
      saveAppState();
      logger.log(`${platformName} ${e.target.checked ? 'shown' : 'hidden'}`);
      updateSidebarVisibility(); // Update sidebar immediately
    });

    container.appendChild(toggleItem);
  });
}

// Initialize unified app settings grid
function initializeAppSettings() {
  const container = document.getElementById('app-settings-grid');
  if (!container) return;

  container.innerHTML = '';

  Object.keys(appState.apps).forEach((platform) => {
    const app = appState.apps[platform];
    const platformConfig = PLATFORMS[platform];

    // Skip platforms that are not in the current PLATFORMS config
    if (!platformConfig) {
      return;
    }

    const platformName =
      platformConfig.name || platform.charAt(0).toUpperCase() + platform.slice(1);
    const iconPath = platformConfig.icon
      ? `../public/icons/${platformConfig.icon}`
      : '../public/icons/messenger.png';

    const card = document.createElement('div');
    card.className = `settings-app-card ${app.enabled === false ? 'disabled' : ''}`;
    card.setAttribute('data-platform', platform);

    card.innerHTML = `
      <div class="settings-app-icon"><img src="${iconPath}" alt="${platformName}" /></div>
      <div class="settings-app-name">${platformName}</div>
      <div class="settings-app-toggles">
        <div class="settings-app-toggle-row">
          <span>Show</span>
          <label class="switch">
            <input type="checkbox" data-app="${platform}" data-toggle="visibility" ${app.enabled !== false ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="settings-app-toggle-row">
          <span>Notify</span>
          <label class="switch">
            <input type="checkbox" data-app="${platform}" data-toggle="notifications" ${app.notifications !== false ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;

    // Add event listeners
    const visibilityToggle = card.querySelector('[data-toggle="visibility"]');
    const notificationToggle = card.querySelector('[data-toggle="notifications"]');

    visibilityToggle.addEventListener('change', (e) => {
      e.stopPropagation();
      appState.apps[platform].enabled = e.target.checked;
      saveAppState();
      logger.log(`${platformName} ${e.target.checked ? 'shown' : 'hidden'}`);

      // Update card appearance
      if (e.target.checked) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }

      updateSidebarVisibility(); // Update sidebar immediately
    });

    notificationToggle.addEventListener('change', (e) => {
      e.stopPropagation();
      appState.apps[platform].notifications = e.target.checked;
      saveAppState();
      logger.log(`${platformName} notifications ${e.target.checked ? 'enabled' : 'disabled'}`);
      updateUnreadSummary(); // Update badge/notifications immediately
    });

    container.appendChild(card);
  });
}

// Handle app toggle changes
function setupAppToggles() {
  const toggles = document.querySelectorAll('input[data-app][data-toggle]');
  toggles.forEach((toggle) => {
    const app = toggle.getAttribute('data-app');
    const toggleType = toggle.getAttribute('data-toggle');

    // Set initial state
    if (appState.apps[app]) {
      if (toggleType === 'app') {
        toggle.checked = appState.apps[app].enabled;
      } else if (toggleType === 'notifications') {
        toggle.checked = appState.apps[app].notifications;
      }
    }

    toggle.addEventListener('change', (e) => {
      if (!appState.apps[app]) {
        logger.warn(`App ${app} not found in appState`);
        return;
      }

      if (toggleType === 'app') {
        const wasEnabled = appState.apps[app].enabled;
        appState.apps[app].enabled = e.target.checked;
        logger.log(`App ${app} ${e.target.checked ? 'enabled' : 'disabled'}`);

        // If re-enabling an app, add it to the order if it's not there
        if (e.target.checked && !wasEnabled && !appState.order.includes(app)) {
          appState.order.push(app);
          saveAppState();
        }

        // Update notification toggle state first
        updateNotificationToggles();

        // Then update sidebar visibility
        updateSidebarVisibility();

        // Save the order
        saveSidebarOrder();

        // Re-setup drag and drop after visibility changes
        setTimeout(() => {
          setupSidebarDragAndDrop();
        }, 150);
      } else if (toggleType === 'notifications') {
        appState.apps[app].notifications = e.target.checked;
        logger.log(`Notifications for ${app} ${e.target.checked ? 'enabled' : 'disabled'}`);
        setTabUnread(app, unreadState[app], { silent: true, skipPersist: true });
        updateUnreadSummary();
      }
      saveAppState();
    });
  });

  // Initial update of notification toggle states
  updateNotificationToggles();
}

// Save sidebar order to appState
function saveSidebarOrder() {
  const sidebarMain = document.querySelector('.sidebar-main');
  if (!sidebarMain) return;

  const buttons = Array.from(
    sidebarMain.querySelectorAll(
      '.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'
    )
  );
  const newOrder = buttons
    .map((btn) => btn.getAttribute('data-platform'))
    .filter((platform) => platform && appState.apps[platform] && appState.apps[platform].enabled);

  if (newOrder.length > 0) {
    appState.order = newOrder;
    saveAppState();
  }
}

// Simple drag-and-drop reordering for sidebar icons (excluding welcome)
let draggedButton = null;
const dragHandlers = new WeakMap();

function setupSidebarDragAndDrop() {
  const sidebarMain = document.querySelector('.sidebar-main');
  if (!sidebarMain) return;

  // Get all app buttons (excluding welcome and settings) - only visible ones
  const allButtons = Array.from(
    sidebarMain.querySelectorAll(
      '.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'
    )
  );
  const buttons = allButtons.filter((btn) => {
    const platform = btn.getAttribute('data-platform');
    return (
      platform &&
      appState.apps[platform] &&
      appState.apps[platform].enabled &&
      btn.style.display !== 'none'
    );
  });

  buttons.forEach((button) => {
    const platform = button.getAttribute('data-platform');
    const isEnabled = platform && appState.apps[platform] && appState.apps[platform].enabled;

    // Remove old handlers if they exist
    const oldHandlers = dragHandlers.get(button);
    if (oldHandlers) {
      oldHandlers.forEach(({ event, handler }) => {
        button.removeEventListener(event, handler);
      });
      dragHandlers.delete(button);
    }

    if (isEnabled) {
      button.setAttribute('draggable', 'true');
      button.style.cursor = 'grab';

      const handlers = [];

      const dragStartHandler = (e) => {
        draggedButton = button;
        e.dataTransfer.effectAllowed = 'move';
        button.style.opacity = '0.5';
        button.style.cursor = 'grabbing';
      };
      button.addEventListener('dragstart', dragStartHandler);
      handlers.push({ event: 'dragstart', handler: dragStartHandler });

      const dragOverHandler = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (button !== draggedButton && button.getAttribute('data-platform') !== 'welcome') {
          button.style.backgroundColor = '#e0e0e5';
        }
      };
      button.addEventListener('dragover', dragOverHandler);
      handlers.push({ event: 'dragover', handler: dragOverHandler });

      const dragLeaveHandler = () => {
        if (button !== draggedButton) {
          button.style.backgroundColor = '';
        }
      };
      button.addEventListener('dragleave', dragLeaveHandler);
      handlers.push({ event: 'dragleave', handler: dragLeaveHandler });

      const dropHandler = (e) => {
        e.preventDefault();
        button.style.backgroundColor = '';

        if (!draggedButton || draggedButton === button) {
          draggedButton = null;
          return;
        }

        if (button.getAttribute('data-platform') === 'welcome') {
          draggedButton = null;
          return;
        }

        const buttonsArray = Array.from(
          sidebarMain.querySelectorAll(
            '.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'
          )
        );
        const draggedIndex = buttonsArray.indexOf(draggedButton);
        const targetIndex = buttonsArray.indexOf(button);

        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
          logger.log(
            `Moving ${draggedButton.getAttribute('data-platform')} from position ${draggedIndex} to ${targetIndex}`
          );
          if (draggedIndex < targetIndex) {
            sidebarMain.insertBefore(draggedButton, button.nextSibling);
          } else {
            sidebarMain.insertBefore(draggedButton, button);
          }
          saveSidebarOrder();
          logger.log('New order:', appState.order);
          // Re-setup drag and drop after reordering
          setTimeout(() => setupSidebarDragAndDrop(), 50);
        }

        draggedButton = null;
      };
      button.addEventListener('drop', dropHandler);
      handlers.push({ event: 'drop', handler: dropHandler });

      const dragEndHandler = () => {
        if (draggedButton) {
          draggedButton.style.opacity = '';
          draggedButton.style.cursor = 'grab';
        }
        draggedButton = null;
      };
      button.addEventListener('dragend', dragEndHandler);
      handlers.push({ event: 'dragend', handler: dragEndHandler });

      dragHandlers.set(button, handlers);
    } else {
      button.setAttribute('draggable', 'false');
      button.style.cursor = 'pointer';
      button.style.opacity = '';
    }
  });

  // Also disable drag for hidden buttons
  allButtons.forEach((button) => {
    const platform = button.getAttribute('data-platform');
    if (platform && appState.apps[platform] && !appState.apps[platform].enabled) {
      button.setAttribute('draggable', 'false');
      button.style.cursor = 'default';
    }
  });
}

function resetUnreadStateForTests() {
  Object.keys(unreadState).forEach((key) => {
    unreadState[key] = 0;
  });
}

function resetAppStateForTests() {
  appState.order = [...defaultAppStateSnapshot.order];

  // Reset apps
  Object.keys(appState.apps).forEach((key) => {
    delete appState.apps[key];
  });
  Object.keys(defaultAppStateSnapshot.apps).forEach((key) => {
    appState.apps[key] = { ...defaultAppStateSnapshot.apps[key] };
  });

  // Reset settings
  appState.settings = { ...defaultAppStateSnapshot.settings };
}

// Tooltip functions removed

window.addEventListener('DOMContentLoaded', () => {
  renderSidebarButtons();
  renderPlatformTabs();

  // Removed tooltips initialization

  // Initialize button references first
  initializeButtonRefs();

  // Setup webviews first
  setupWebviews();

  // Load app state first
  loadAppState();
  restoreUnreadState();

  // Initialize order if not saved (use current HTML order)
  if (!localStorage.getItem('chattio-app-state')) {
    const sidebarMain = document.querySelector('.sidebar-main');
    if (sidebarMain) {
      const buttons = Array.from(
        sidebarMain.querySelectorAll(
          '.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'
        )
      );
      appState.order = buttons.map((btn) => btn.getAttribute('data-platform')).filter(Boolean);
      saveAppState();
    }
  }

  // Setup app toggles first (so they reflect the loaded state)
  setupAppToggles();

  // Update sidebar visibility based on loaded state
  updateSidebarVisibility();

  // Setup drag and drop after visibility is set
  setupSidebarDragAndDrop();

  // Show welcome page by default
  const welcomeTab = document.getElementById('welcome');
  if (welcomeTab) {
    welcomeTab.style.display = 'block';
  }
  const welcomeButton = document.querySelector('.tablinks[data-platform="welcome"]');
  if (welcomeButton) {
    welcomeButton.classList.add('active');
  }
  // Remove active from messenger button
  const messengerButton = document.querySelector('.tablinks[data-platform="messenger"]');
  if (messengerButton) {
    messengerButton.classList.remove('active');
  }

  const storedTheme = window.localStorage.getItem('chattio-theme') || 'system';
  applyTheme(storedTheme);
  updateThemeChips(storedTheme);

  // Listen for system theme changes if using system theme
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (_e) => {
      const currentTheme = window.localStorage.getItem('chattio-theme') || 'system';
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  }

  // Setup theme chips (only those without data-density attribute)
  const themeChips = document.querySelectorAll('.settings-chip[data-theme]');
  themeChips.forEach((chip) => {
    const theme = chip.getAttribute('data-theme');
    if (theme === (window.localStorage.getItem('chattio-theme') || 'system')) {
      chip.classList.add('settings-chip-active');
    }

    chip.addEventListener('click', () => {
      window.localStorage.setItem('chattio-theme', theme);
      applyTheme(theme);
      updateThemeChips(theme);

      // Update chip states
      themeChips.forEach((c) => c.classList.remove('settings-chip-active'));
      chip.classList.add('settings-chip-active');
    });
  });

  // Setup global settings
  setupGlobalSettings();

  // Apply saved sidebar density
  applySidebarDensity(appState.settings.sidebarDensity);

  // Request notification permission on startup if notifications are enabled
  if (
    appState.settings.globalNotifications &&
    'Notification' in window &&
    Notification.permission === 'default'
  ) {
    Notification.requestPermission();
  }

  setupSupportDonations();
  setupUpdatesCheck();
});

function setupUpdatesCheck() {
  const checkUpdatesBtn = document.getElementById('check-updates-btn');
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', () => {
      logger.log('Checking for updates...');
      ipcRenderer.send('check-for-updates');
    });
  }
}

function applyTheme(theme) {
  applyThemeToDocument(document, theme);
}

function updateThemeChips(theme) {
  const chips = document.querySelectorAll('.settings-chip');
  chips.forEach((chip) => {
    const value = chip.textContent.trim().toLowerCase();
    let chipTheme = 'system';
    if (value === 'light') chipTheme = 'light';
    if (value === 'dark') chipTheme = 'dark';
    if (value === 'system default') chipTheme = 'system';
    if (chipTheme === theme) {
      chip.classList.add('settings-chip-active');
    } else {
      chip.classList.remove('settings-chip-active');
    }
  });
}

function updateAppearanceThemeChips() {
  const themeChips = document.querySelectorAll('.settings-chip[data-theme]');
  const currentTheme = window.localStorage.getItem('chattio-theme') || 'system';
  themeChips.forEach((chip) => {
    const theme = chip.getAttribute('data-theme');
    if (theme === currentTheme) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function openSettingsTab(tabId) {
  const panels = document.querySelectorAll('.settings-panel');
  panels.forEach((panel) => {
    panel.style.display = 'none';
  });

  const tabs = document.querySelectorAll('.settings-tab');
  tabs.forEach((tab) => {
    tab.classList.remove('active');
  });

  const targetPanel = document.getElementById(`settings-${tabId}`);
  if (targetPanel) {
    targetPanel.style.display = 'block';
  }

  const activeTab = document.querySelector(`.settings-tab[data-settings-tab="${tabId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }

  // Initialize performance tab if selected
  if (tabId === 'performance') {
    initializePerformanceTab();
  }
}

function initializePerformanceTab() {
  // Load current settings
  const settings = performanceSettings.getAll();

  // Set input values
  const maxWebviewsInput = document.getElementById('max-webviews-input');
  const inactivityTimeoutInput = document.getElementById('inactivity-timeout-input');
  const hardwareAccelToggle = document.getElementById('hardware-accel-toggle');

  if (maxWebviewsInput) {
    maxWebviewsInput.value = settings.maxActiveWebviews || 3;
    maxWebviewsInput.addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 2 && value <= 10) {
        performanceSettings.set('maxActiveWebviews', value);
      }
    });
  }

  if (inactivityTimeoutInput) {
    inactivityTimeoutInput.value = settings.inactivityTimeoutMinutes || 5;
    inactivityTimeoutInput.addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 1 && value <= 30) {
        performanceSettings.set('inactivityTimeoutMinutes', value);
      }
    });
  }

  if (hardwareAccelToggle) {
    hardwareAccelToggle.checked = settings.hardwareAcceleration !== false;
    hardwareAccelToggle.addEventListener('change', (e) => {
      performanceSettings.set('hardwareAcceleration', e.target.checked);
      // Show restart required message
      alert('Hardware acceleration changes require an app restart to take effect.');
    });
  }

  // Update diagnostics stats
  updateDiagnosticsStats();

  // Setup export button
  const exportBtn = document.getElementById('export-diagnostics-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportDiagnostics);
  }
}

async function updateDiagnosticsStats() {
  try {
    const summary = await telemetry.requestSummary();

    const webviewLoadsEl = document.getElementById('webview-loads-stat');
    const recycleEventsEl = document.getElementById('recycle-events-stat');
    const errorsEl = document.getElementById('errors-stat');
    const avgLoadTimeEl = document.getElementById('avg-load-time-stat');

    if (webviewLoadsEl) {
      const total = summary.webviewStats?.totalLoads || 0;
      const successful = summary.webviewStats?.successfulLoads || 0;
      webviewLoadsEl.textContent = `${successful}/${total}`;
    }

    if (recycleEventsEl) {
      const count = summary.byType?.webview_recycle || 0;
      recycleEventsEl.textContent = count;
    }

    if (errorsEl) {
      const count = summary.webviewErrors?.total || 0;
      errorsEl.textContent = count;
    }

    if (avgLoadTimeEl) {
      const avgTime = summary.webviewStats?.averageLoadTime || 0;
      avgLoadTimeEl.textContent = `${Math.round(avgTime)}ms`;
    }
  } catch (error) {
    logger.error('Failed to update diagnostics stats:', error);
  }
}

async function exportDiagnostics() {
  try {
    const data = await telemetry.requestExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chattio-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('Diagnostics exported successfully');
  } catch (error) {
    logger.error('Failed to export diagnostics:', error);
    alert('Failed to export diagnostics data.');
  }
}

function setupSupportDonations() {
  const donateButtons = document.querySelectorAll('[data-donation-button]');
  const modal = document.querySelector('[data-support-modal]');
  const amountLabel = modal ? modal.querySelector('[data-donation-amount]') : null;
  const paymentOptions = modal ? modal.querySelectorAll('[data-payment-provider]') : [];
  const closeButtons = modal ? modal.querySelectorAll('.support-modal-close') : [];

  if (!donateButtons.length || !modal || !paymentOptions.length) {
    return;
  }

  const closeModal = () => {
    modal.classList.remove('open');
    document.body.classList.remove('support-modal-open');
  };

  const openModal = () => {
    modal.classList.add('open');
    document.body.classList.add('support-modal-open');
  };

  donateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const amount = button.dataset.amount || '$5';
      if (amountLabel) {
        amountLabel.textContent = amount;
      }

      paymentOptions.forEach((option) => {
        const provider = option.dataset.paymentProvider;
        if (!provider) return;
        const datasetKey = `${provider}Link`;
        const link = button.dataset[datasetKey] || option.dataset.defaultHref;
        const currentOption = option;
        currentOption.dataset.targetHref = link;
      });

      openModal();
    });
  });

  paymentOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const link = option.dataset.targetHref || option.dataset.defaultHref;
      if (link) {
        openExternalLink(link);
      }
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

// Make openTab available globally for onclick handlers
window.openTab = openTab;
window.openSettingsTab = openSettingsTab;

// Initialize app on load
(function initializeApp() {
  // Load performance settings
  performanceSettings.load();
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applySidebarDensity,
    setupGlobalSettings,
    updateUnreadSummary,
    setTabUnread,
    applyTheme,
    openTab,
    openExternalLink,
    unreadState,
    appState,
    resetUnreadStateForTests,
    resetAppStateForTests,
  };
}
