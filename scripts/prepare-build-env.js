#!/usr/bin/env node
/**
 * Prepares build environment by cleaning up notarization credentials
 * This prevents electron-builder from trying to notarize with invalid credentials
 */

// Unset empty or invalid notarization environment variables
const envVars = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD'];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    // Variable is empty or not set - we can't unset it in Node, but electron-builder
    // should check for empty values. The fix script handles this for shell usage.
    console.log(`⚠️  ${varName} is not set or empty`);
  } else {
    console.log(`✓ ${varName} is set`);
  }
});

// Set required code signing variables if not set
if (!process.env.CSC_NAME) {
  process.env.CSC_NAME = 'Jóhann Sævarsson (QD9KBHBRRZ)';
  console.log('✓ CSC_NAME set to default');
}

if (!process.env.APPLE_TEAM_ID) {
  process.env.APPLE_TEAM_ID = 'QD9KBHBRRZ';
  console.log('✓ APPLE_TEAM_ID set to default');
}

// Check if we have all required notarization credentials
const hasNotarization =
  process.env.APPLE_ID &&
  process.env.APPLE_ID.trim() !== '' &&
  process.env.APPLE_APP_SPECIFIC_PASSWORD &&
  process.env.APPLE_APP_SPECIFIC_PASSWORD.trim() !== '';

if (hasNotarization) {
  console.log('✓ Notarization will be enabled');
} else {
  console.log('⚠️  Notarization will be skipped (credentials not provided)');
  // Explicitly unset to prevent electron-builder from trying
  delete process.env.APPLE_ID;
  delete process.env.APPLE_APP_SPECIFIC_PASSWORD;
}
