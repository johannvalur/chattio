const { app, BrowserWindow, ipcMain, Menu, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const WindowStateManager = require('./lib/windowStateManager');
const telemetry = require('./lib/telemetry');

// Load performance settings early to apply hardware acceleration
let hardwareAcceleration = true;
try {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'performance-settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    hardwareAcceleration = settings.hardwareAcceleration !== false;
  }
} catch (error) {
  console.error('Failed to load hardware acceleration setting:', error);
}

// Disable hardware acceleration if configured
if (!hardwareAcceleration) {
  console.log('Hardware acceleration disabled by user preference');
  app.disableHardwareAcceleration();
}

// Safely require electron-updater
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (error) {
  console.error('Failed to load electron-updater:', error);
  autoUpdater = null;
}

let mainWindow;
const isMac = process.platform === 'darwin';
const isDev = !app.isPackaged;
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 6; // 6 hours
const FIRST_CHECK_DELAY = 1000 * 30; // 30 seconds

let updateInterval;
let updateInitialTimeout;
let updateCheckInProgress = false;
let manualUpdateRequested = false;
const getDialogParent = () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined);

// Initialize window state manager
const windowStateManager = new WindowStateManager(app);

async function createWindow() {
  // Load saved window state asynchronously
  const savedState = await windowStateManager.load().catch((error) => {
    console.error('Error loading window state:', error);
    return null;
  });

  // Get window options with fallbacks
  const windowOptions = windowStateManager.getWindowOptions(savedState, {
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
    icon: path.join(__dirname, '../public/logo3.png'),
  });

  // Create the browser window
  mainWindow = new BrowserWindow(windowOptions);

  // Restore maximized state if previously saved
  if (savedState?.isMaximized) {
    mainWindow.maximize();
  }

  // Load the index.html file using absolute path
  const indexPath = path.join(__dirname, 'index.html');
  try {
    await mainWindow.loadFile(indexPath);
  } catch (error) {
    console.error('Error loading index.html:', error);
    dialog.showErrorBox('Error', `Failed to load application: ${error.message}`);
  }

  // Debounce save operations to prevent excessive writes
  let saveStateTimeout;
  const debouncedSaveState = () => {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          await windowStateManager.save(mainWindow.getBounds(), mainWindow.isMaximized());
        } catch (error) {
          console.error('Error saving window state:', error);
        }
      }
    }, 500);
  };

  // Set up window event listeners
  mainWindow.on('move', debouncedSaveState);
  mainWindow.on('resize', debouncedSaveState);

  mainWindow.on('maximize', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        await windowStateManager.save(mainWindow.getBounds(), true);
      } catch (error) {
        console.error('Error saving window state on maximize:', error);
      }
    }
  });

  mainWindow.on('unmaximize', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        await windowStateManager.save(mainWindow.getBounds(), false);
      } catch (error) {
        console.error('Error saving window state on unmaximize:', error);
      }
    }
  });

  // Save state before closing
  mainWindow.on('close', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        await windowStateManager.save(mainWindow.getBounds(), mainWindow.isMaximized());
      } catch (error) {
        console.error('Error saving window state on close:', error);
      }
    }
  });

  // Handle webview attachment - configure webview security and navigation
  // eslint-disable-next-line no-unused-vars
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Strip away preload scripts if present
    // eslint-disable-next-line no-param-reassign
    delete webPreferences.preload;

    // Disable Node.js integration in webviews for security
    // eslint-disable-next-line no-param-reassign
    webPreferences.nodeIntegration = false;
    // eslint-disable-next-line no-param-reassign
    webPreferences.contextIsolation = true;

    // Enable web security
    // eslint-disable-next-line no-param-reassign
    webPreferences.webSecurity = true;

    // Allow navigation to platform URLs
    if (isDev) {
      console.log('Webview attaching with URL:', params.src);
    }
  });

  // Handle new window events from webviews (backup handler)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isDev) {
      console.log('Window open handler called for:', url);
    }
    // Open in external browser
    shell.openExternal(url).catch((error) => {
      console.error('Failed to open URL in external browser:', url, error);
    });
    return { action: 'deny' };
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  buildMenu();
  return mainWindow;
}

function buildMenu() {
  const checkForUpdatesItem = {
    label: 'Check for Updates…',
    click: () => requestUpdateCheck(true),
  };

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              checkForUpdatesItem,
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : [
          {
            label: 'File',
            submenu: [
              checkForUpdatesItem,
              { type: 'separator' },
              { role: 'close' },
              { role: 'quit' },
            ],
          },
        ]),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac
          ? [{ role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Project Website',
          click: () => {
            shell.openExternal('https://www.chattio.app');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function initializeAutoUpdates() {
  if (!autoUpdater) {
    console.warn('Auto-updater not available, skipping initialization.');
    return;
  }

  if (isDev) {
    console.info('Skipping auto-updates in development mode.');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    updateCheckInProgress = false;
    telemetry.trackUpdateEvent('available', {
      version: info.version,
      manual: manualUpdateRequested,
    });

    // Show native notification for automatic checks
    if (!manualUpdateRequested && Notification.isSupported()) {
      const notification = new Notification({
        title: 'Update Available',
        body: `Chattio ${info.version} is ready to download.`,
        silent: false,
      });
      notification.show();
    }

    const buttons = ['Download & Install', 'Later'];
    dialog
      .showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'Update available',
        message: `Chattio ${info.version} is available.`,
        detail: 'Download and install the update now?',
        buttons,
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          telemetry.trackUpdateEvent('download_started', { version: info.version });
          autoUpdater.downloadUpdate().catch((error) => {
            console.error('Failed to download update:', error);
            telemetry.trackUpdateEvent('download_failed', {
              version: info.version,
              error: error.message,
            });
            dialog.showMessageBox(getDialogParent(), {
              type: 'error',
              title: 'Update failed',
              message: 'Could not download the update.',
              detail: error?.message || 'Unknown error',
            });
          });
        } else {
          telemetry.trackUpdateEvent('download_deferred', { version: info.version });
          manualUpdateRequested = false;
        }
      });
  });

  autoUpdater.on('update-not-available', () => {
    updateCheckInProgress = false;
    telemetry.trackUpdateEvent('not_available', { manual: manualUpdateRequested });
    if (manualUpdateRequested) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'No updates found',
        message: 'You already have the latest version of Chattio.',
      });
      manualUpdateRequested = false;
    }
  });

  autoUpdater.on('update-downloaded', () => {
    manualUpdateRequested = false;
    telemetry.trackUpdateEvent('downloaded', {});

    // Show native notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Update Ready to Install',
        body: 'Chattio has been updated. Restart to apply the changes.',
        silent: false,
      });
      notification.show();
    }

    const buttons = ['Restart Now', 'Later'];
    dialog
      .showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'Update ready',
        message: 'A new version of Chattio has been downloaded.',
        detail: 'Restart to apply the update.',
        buttons,
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          telemetry.trackUpdateEvent('install_started', {});
          autoUpdater.quitAndInstall();
        } else {
          telemetry.trackUpdateEvent('install_deferred', {});
        }
      });
  });

  autoUpdater.on('error', (error) => {
    updateCheckInProgress = false;
    telemetry.trackUpdateEvent('error', {
      error: error?.message || 'Unknown error',
      code: error?.code,
      manual: manualUpdateRequested,
    });
    // Suppress 404 errors (no releases yet) and network errors for automatic checks
    const is404 =
      error?.message?.includes('404') || error?.code === 'ERR_HTTP_RESPONSE_CODE_FAILURE';
    const isNetworkError = error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED';

    if (is404 || isNetworkError) {
      // Silently ignore 404s and network errors for automatic checks
      if (!manualUpdateRequested) {
        return;
      }
      // For manual checks, show a friendly message
      if (is404) {
        dialog.showMessageBox(getDialogParent(), {
          type: 'info',
          title: 'No updates available',
          message: 'No releases found on GitHub yet.',
          detail: 'Updates will be available once you publish a release.',
        });
        manualUpdateRequested = false;
        return;
      }
    }

    console.error('Auto-update error:', error);
    if (manualUpdateRequested) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'error',
        title: 'Update failed',
        message: 'Unable to check for updates.',
        detail: error?.message || 'Unknown error',
      });
      manualUpdateRequested = false;
    }
  });

  scheduleAutomaticUpdateChecks();
}

function scheduleAutomaticUpdateChecks() {
  clearTimeout(updateInitialTimeout);
  clearInterval(updateInterval);

  const triggerUpdateCheck = () => requestUpdateCheck(false);
  updateInitialTimeout = setTimeout(() => {
    triggerUpdateCheck();
    updateInterval = setInterval(triggerUpdateCheck, UPDATE_CHECK_INTERVAL);
  }, FIRST_CHECK_DELAY);
}

function requestUpdateCheck(isManual) {
  if (!autoUpdater) {
    if (isManual) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'error',
        title: 'Update unavailable',
        message: 'Auto-updater is not available in this build.',
      });
    }
    return;
  }

  if (isDev) {
    if (isManual) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'Development build',
        message: 'Auto-updates are only available in packaged builds.',
      });
    }
    return;
  }

  if (updateCheckInProgress) {
    if (isManual) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'Already checking',
        message: 'Please wait while we finish the current update check.',
      });
    }
    return;
  }

  manualUpdateRequested = Boolean(isManual);
  updateCheckInProgress = true;
  telemetry.trackUpdateEvent('checking', { manual: manualUpdateRequested });

  autoUpdater.checkForUpdates().catch((error) => {
    updateCheckInProgress = false;
    // Suppress 404 errors (no releases yet)
    const is404 =
      error?.message?.includes('404') || error?.code === 'ERR_HTTP_RESPONSE_CODE_FAILURE';
    if (is404 && !manualUpdateRequested) {
      // Silently ignore 404s for automatic checks
      return;
    }
    console.error('Failed to check for updates:', error);
    if (manualUpdateRequested) {
      if (is404) {
        dialog.showMessageBox(getDialogParent(), {
          type: 'info',
          title: 'No updates available',
          message: 'No releases found on GitHub yet.',
          detail: 'Updates will be available once you publish a release.',
        });
      } else {
        dialog.showMessageBox(getDialogParent(), {
          type: 'error',
          title: 'Update failed',
          message: 'Unable to check for updates.',
          detail: error?.message || 'Unknown error',
        });
      }
      manualUpdateRequested = false;
    }
  });
}

app.whenReady().then(async () => {
  try {
    // Setup telemetry handlers
    telemetry.setupMainHandlers();

    // Setup performance settings handler
    ipcMain.on('save-performance-settings', (_, settings) => {
      try {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'performance-settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log('Performance settings saved to file');
      } catch (error) {
        console.error('Failed to save performance settings to file:', error);
      }
    });

    // Setup check for updates handler
    ipcMain.on('check-for-updates', () => {
      requestUpdateCheck(true);
    });

    // Handle get app version request
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Handle opening external links
    ipcMain.on('open-external', (event, url) => {
      if (url && typeof url === 'string') {
        shell.openExternal(url).catch((error) => {
          console.error('Failed to open external URL:', url, error);
        });
      }
    });

    await createWindow();
    initializeAutoUpdates();
    // Handle unread message count updates
    ipcMain.on('unread-summary', (event, summary) => {
      if (process.platform !== 'darwin') return;

      try {
        // Ensure the badge value is a string or number
        let badgeText = '';
        if (typeof summary === 'number' && !isNaN(summary) && summary > 0) {
          badgeText = summary > 99 ? '99+' : summary.toString();
        } else if (typeof summary === 'string') {
          // Only allow alphanumeric characters and a few safe symbols
          badgeText = summary.replace(/[^a-zA-Z0-9+!?\- ]/g, '').substring(0, 10);
        }

        if (app.dock && typeof app.dock.setBadge === 'function') {
          app.dock.setBadge(badgeText);
        }
      } catch (error) {
        console.error('Error setting dock badge:', error);
      }
    });

    // Initialize with empty badge
    if (process.platform === 'darwin' && app.dock && typeof app.dock.setBadge === 'function') {
      app.dock.setBadge('');
    }
  } catch (error) {
    console.error('Error during app initialization:', error);
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to initialize the application. Please check the logs for more details.'
    );
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      await createWindow();
    } catch (error) {
      console.error('Failed to create window:', error);
    }
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  clearTimeout(updateInitialTimeout);
  clearInterval(updateInterval);
});

// Export functions for testing
module.exports = {
  initializeAutoUpdates,
  requestUpdateCheck,
  // Export other functions that need to be tested
  getDialogParent,
};
