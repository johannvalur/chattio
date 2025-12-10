// Logger utility with error filtering
const { IS_DEV } = require('./config');

// Common error patterns to ignore
const IGNORED_ERRORS = [
  // Error code -3 (net::ERR_ABORTED) for specific URLs
  {
    test: (args) =>
      args.some(
        (arg) =>
          arg?.errorCode === -3 &&
          arg.validatedURL &&
          (arg.validatedURL.includes('messenger.com/e2ee/') ||
            arg.validatedURL.includes('instagram.com/direct') ||
            arg.validatedURL.includes('x.com/i/flow/login') ||
            arg.validatedURL.includes('teams.microsoft.com') ||
            arg.validatedURL.includes('facebook.com/tr/'))
      ),
  },
  // Common network errors
  {
    test: (args) =>
      args.some((arg) => arg?.errorCode && [-102, -105, -106, -107, -109].includes(arg.errorCode)),
  },
  // Common resource loading errors
  {
    test: (args) =>
      args.some(
        (arg) =>
          arg?.validatedURL &&
          /\.(jpg|jpeg|png|gif|css|js|woff|woff2|ttf|eot|svg|mp4|webm|mp3)(\?.*)?$/i.test(
            arg.validatedURL
          )
      ),
  },
];

// Check if the log should be ignored
function shouldIgnoreLog(level, ...args) {
  if (level === 'error' || level === 'warn') {
    return IGNORED_ERRORS.some(({ test }) => test(args));
  }
  return false;
}

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Override console methods
console.log = (...args) => {
  if (!IS_DEV) return;
  originalConsole.log('[Chattio]', ...args);
};

console.error = (...args) => {
  if (shouldIgnoreLog('error', ...args)) return;
  originalConsole.error('[Chattio Error]', ...args);
};

console.warn = (...args) => {
  if (!IS_DEV || shouldIgnoreLog('warn', ...args)) return;
  originalConsole.warn('[Chattio Warning]', ...args);
};

console.info = (...args) => {
  if (!IS_DEV) return;
  originalConsole.info('[Chattio Info]', ...args);
};

console.debug = (...args) => {
  if (!IS_DEV) return;
  originalConsole.debug('[Chattio Debug]', ...args);
};

// Export logger for consistency
const logger = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

module.exports = logger;
