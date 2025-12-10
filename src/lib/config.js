// Platform configuration
const PLATFORMS = {
  messenger: {
    name: 'Messenger',
    url: 'https://www.messenger.com/',
    icon: 'messenger.png',
    needsUserAgent: false,
  },
  whatsapp: {
    name: 'WhatsApp',
    url: 'https://web.whatsapp.com/',
    icon: 'whatsapp.png',
    needsUserAgent: true,
  },
  instagram: {
    name: 'Instagram',
    url: 'https://www.instagram.com/direct/inbox/',
    icon: 'instagram.png',
    needsUserAgent: false,
  },
  linkedin: {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/messaging/',
    icon: 'linkedin.png',
    needsUserAgent: false,
  },
  x: {
    name: 'X (Twitter)',
    url: 'https://x.com/messages',
    icon: 'x.png',
    needsUserAgent: false,
  },
  slack: {
    name: 'Slack',
    url: 'https://app.slack.com/client',
    icon: 'slack.png',
    needsUserAgent: true,
  },
  telegram: {
    name: 'Telegram',
    url: 'https://web.telegram.org',
    icon: 'telegram.png',
    needsUserAgent: false,
  },
  discord: {
    name: 'Discord',
    url: 'https://discord.com/app',
    icon: 'discord.png',
    needsUserAgent: false,
  },
  teams: {
    name: 'Microsoft Teams',
    url: 'https://teams.microsoft.com/',
    icon: 'teams.png',
    needsUserAgent: true,
  },
};

// User agent string
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Development mode flag
// In renderer process, we can only check NODE_ENV
// In main process, we can also check app.isPackaged
let IS_DEV = false;
try {
  if (typeof process !== 'undefined' && process.env) {
    IS_DEV = process.env.NODE_ENV === 'development';
    // Try to check if app is packaged (only works in main process)
    try {
      const { app } = require('electron');
      if (app && typeof app.isPackaged === 'boolean') {
        IS_DEV = IS_DEV || !app.isPackaged;
      }
    } catch (e) {
      // In renderer process, electron.app is not available
      // Just use NODE_ENV check above
    }
  }
} catch (e) {
  // Fallback: assume production
  IS_DEV = false;
}

module.exports = {
  PLATFORMS,
  CHROME_USER_AGENT,
  IS_DEV,
};
