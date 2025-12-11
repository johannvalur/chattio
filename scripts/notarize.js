require('dotenv').config();
const { notarize } = require('@electron/notarize');

// This is the main function that will be called by electron-builder
exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Skip if not on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Not on macOS, skipping notarization');
    return;
  }

  // Get the app name and path
  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  // Check if the required environment variables are set
  if (!process.env.APPLE_ID) {
    throw new Error('APPLE_ID environment variable not set');
  }
  if (!process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    throw new Error('APPLE_APP_SPECIFIC_PASSWORD environment variable not set');
  }
  if (!process.env.APPLE_TEAM_ID) {
    console.warn('APPLE_TEAM_ID environment variable not set, using default');
  }

  try {
    await notarize({
      appBundleId: 'com.unified.messenger',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID || 'QD9KBHBRRZ',
      tool: 'notarytool', // Use the newer notarytool instead of altool
    });

    console.log('✅ Notarization complete!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
