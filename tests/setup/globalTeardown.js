// Global teardown file for Jest
module.exports = async function () {
  // Add any global teardown logic here
  // For example, close any open connections, stop servers, etc.

  // Force exit after a short delay to ensure all resources are cleaned up
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Force exit the process to prevent hanging
  if (global.__BROWSER_GLOBAL__) {
    await global.__BROWSER_GLOBAL__.close();
  }

  // Ensure the process exits
  process.exit(0);
};
