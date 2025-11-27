// Logger utility - gates console logs in production
const { IS_DEV } = require('./config');

const logger = {
	log: (...args) => {
		if (IS_DEV) {
			console.log('[Chattio]', ...args);
		}
	},
	error: (...args) => {
		// Always log errors, even in production
		console.error('[Chattio Error]', ...args);
	},
	warn: (...args) => {
		if (IS_DEV) {
			console.warn('[Chattio Warning]', ...args);
		}
	},
	info: (...args) => {
		if (IS_DEV) {
			console.info('[Chattio Info]', ...args);
		}
	}
};

module.exports = logger;

