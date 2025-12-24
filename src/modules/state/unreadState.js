const { ipcRenderer } = require('electron');
const { PLATFORMS } = require('../../lib/config');
const appState = require('./appState');
const logger = require('../../lib/logger');

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const UNREAD_STORAGE_KEY = 'chatterly-unread-state';
const NOTIFICATION_COOLDOWN = 5000; // 5 seconds between notifications

// Extended unread state for all platforms (stores counts)
let unreadState = PLATFORM_KEYS.reduce((state, platform) => {
  state[platform] = 0;
  return state;
}, {});

let lastNotificationTime = 0;
let lastNotificationSnapshot = 0;

// Check if Do Not Disturb is active
function isDoNotDisturbActive(settings) {
  // If DND is manually enabled, always active
  if (settings.doNotDisturb) {
    return true;
  }

  // Check scheduled DND
  if (!settings.doNotDisturbSchedule) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = (settings.doNotDisturbStart || '22:00').split(':').map(Number);
  const [endHour, endMin] = (settings.doNotDisturbEnd || '08:00').split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle overnight DND period (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  // Handle same-day DND period (e.g., 12:00 to 14:00)
  return currentTime >= startTime && currentTime < endTime;
}

function updateUnreadSummary() {
  try {
    const unreadEntries = Object.entries(unreadState).filter(
      ([platform, count]) => count > 0 && appState.isNotificationsEnabled(platform)
    );
    const hasUnreadServices = unreadEntries.length;
    const totalMessages = unreadEntries.reduce((sum, [_, count]) => sum + count, 0);

    // Only send badge update if badge is enabled
    const { settings } = appState.getState();
    if (settings.badgeDockIcon) {
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

    // Check if notifications should be sent
    const shouldNotify =
      settings.globalNotifications && !isDoNotDisturbActive(settings) && totalMessages > 0;

    // Send native notification if enabled and there are unread messages
    if (shouldNotify) {
      if (totalMessages > lastNotificationSnapshot) {
        sendNativeNotification(unreadEntries, totalMessages);
        lastNotificationSnapshot = totalMessages;
      }
    } else {
      lastNotificationSnapshot = 0;
    }

    saveUnreadState();
  } catch (error) {
    logger.error('Error updating unread summary:', error);
  }
}

function sendNativeNotification(unreadEntries, totalMessages) {
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return;
  }

  lastNotificationTime = now;

  try {
    const { settings } = appState.getState();

    // Prepare notification body based on preview setting
    let body;
    if (settings.notificationPreview !== false) {
      body =
        unreadEntries.length === 1
          ? `${totalMessages} new message${totalMessages > 1 ? 's' : ''} in ${unreadEntries[0][0]}`
          : `${totalMessages} new messages across ${unreadEntries.length} services`;
    } else {
      body = 'You have new messages';
    }

    const notification = new Notification('New Messages', {
      body,
      silent: settings.notificationSounds === false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    logger.error('Error showing notification:', error);
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
    const savedState = localStorage.getItem(UNREAD_STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Only restore counts for known platforms
      Object.keys(parsed).forEach((platform) => {
        if (PLATFORM_KEYS.includes(platform)) {
          unreadState[platform] = parsed[platform];
        }
      });
      updateUnreadSummary();
    }
  } catch (error) {
    logger.error('Error restoring unread state:', error);
  }
}

function updateTabBadge(tabElement, count) {
  if (!tabElement) return;

  const badge = tabElement.querySelector('.unread-badge');
  if (count > 0) {
    const badgeText = count > 99 ? '99+' : count.toString();
    if (!badge) {
      const newBadge = document.createElement('span');
      newBadge.className = 'unread-badge';
      newBadge.textContent = badgeText;
      const header = tabElement.querySelector('.tab-header');
      if (header) header.appendChild(newBadge);
    } else {
      badge.textContent = badgeText;
    }
  } else if (badge) {
    badge.remove();
  }
}

function updateSidebarBadge(buttonElement, count) {
  if (!buttonElement) return;

  const badge = buttonElement.querySelector('.unread-badge');
  if (count > 0) {
    const badgeText = count > 9 ? '9+' : count.toString();
    if (!badge) {
      const newBadge = document.createElement('span');
      newBadge.className = 'unread-badge';
      newBadge.textContent = badgeText;
      buttonElement.appendChild(newBadge);
    } else {
      badge.textContent = badgeText;
    }
  } else if (badge) {
    badge.remove();
  }
}

function setTabUnread(platform, count, options = {}) {
  if (!PLATFORM_KEYS.includes(platform)) {
    logger.warn(`Attempted to set unread for unknown platform: ${platform}`);
    return;
  }

  const previousCount = unreadState[platform] || 0;
  const newCount = Math.max(0, parseInt(count, 10) || 0);

  // Only proceed if count actually changed
  if (newCount === previousCount) return;

  unreadState[platform] = newCount;

  // Update UI elements
  const tabElement = document.querySelector(`.tab-pane[data-platform="${platform}"]`);
  const buttonElement = document.querySelector(`.sidebar-button[data-platform="${platform}"]`);

  updateTabBadge(tabElement, newCount);
  updateSidebarBadge(buttonElement, newCount);

  // Update summary if not silent
  if (!options.silent) {
    updateUnreadSummary();
  }
}

function resetUnreadState() {
  PLATFORM_KEYS.forEach((platform) => {
    unreadState[platform] = 0;
  });
  saveUnreadState();
  updateUnreadSummary();
}

// Initialize
restoreUnreadState();

module.exports = {
  setTabUnread,
  resetUnreadState,
  getUnreadState: () => ({ ...unreadState }),
};
