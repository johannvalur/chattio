const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// Safely require electron-updater
let autoUpdater
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch (error) {
  console.error('Failed to load electron-updater:', error)
  autoUpdater = null
}

let mainWindow
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json')
const isMac = process.platform === 'darwin'
const isDev = !app.isPackaged
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 6 // 6 hours
const FIRST_CHECK_DELAY = 1000 * 30 // 30 seconds

let updateInterval
let updateInitialTimeout
let updateCheckInProgress = false
let manualUpdateRequested = false
const getDialogParent = () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined)

// Load window state
function loadWindowState() {
  try {
    if (fs.existsSync(windowStateFile)) {
      const data = fs.readFileSync(windowStateFile, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading window state:', error)
  }
  return null
}

// Save window state
function saveWindowState() {
  if (!mainWindow) return
  
  try {
    const bounds = mainWindow.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized()
    }
    fs.writeFileSync(windowStateFile, JSON.stringify(state), 'utf8')
  } catch (error) {
    console.error('Error saving window state:', error)
  }
}

function createWindow() {
  const savedState = loadWindowState()
  const defaultWidth = 1200
  const defaultHeight = 800
  
  const windowOptions = {
    width: savedState?.width || defaultWidth,
    height: savedState?.height || defaultHeight,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
    icon: path.join(__dirname, '../public/transparent.png')
  }
  
  // Restore position if saved
  if (savedState && savedState.x !== undefined && savedState.y !== undefined) {
    windowOptions.x = savedState.x
    windowOptions.y = savedState.y
  }
  
  mainWindow = new BrowserWindow(windowOptions)
  
  // Restore maximized state
  if (savedState?.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.loadFile('src/index.html')
  
  // Save window state on move/resize
  let saveStateTimeout
  const debouncedSaveState = () => {
    clearTimeout(saveStateTimeout)
    saveStateTimeout = setTimeout(saveWindowState, 500)
  }
  
  mainWindow.on('move', debouncedSaveState)
  mainWindow.on('resize', debouncedSaveState)
  mainWindow.on('maximize', saveWindowState)
  mainWindow.on('unmaximize', saveWindowState)
  
  // Save state before closing
  mainWindow.on('close', saveWindowState)
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools()

  buildMenu()
}

function buildMenu() {
  const checkForUpdatesItem = {
    label: 'Check for Updates…',
    click: () => requestUpdateCheck(true)
  }

  const template = [
    ...(isMac ? [{
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
        { role: 'quit' }
      ]
    }] : [{
      label: 'File',
      submenu: [
        checkForUpdatesItem,
        { type: 'separator' },
        { role: 'close' },
        { role: 'quit' }
      ]
    }]),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
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
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Project Website',
          click: () => {
            shell.openExternal('https://www.chatterly.com')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function initializeAutoUpdates() {
  if (!autoUpdater) {
    console.warn('Auto-updater not available, skipping initialization.')
    return
  }

  if (isDev) {
    console.info('Skipping auto-updates in development mode.')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', info => {
    updateCheckInProgress = false
    const buttons = ['Download & Install', 'Later']
    dialog.showMessageBox(getDialogParent(), {
      type: 'info',
      title: 'Update available',
      message: `Chattio ${info.version} is available.`,
      detail: 'Download and install the update now?',
      buttons,
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate().catch(error => {
          console.error('Failed to download update:', error)
          dialog.showMessageBox(getDialogParent(), {
            type: 'error',
            title: 'Update failed',
            message: 'Could not download the update.',
            detail: error?.message || 'Unknown error'
          })
        })
      } else {
        manualUpdateRequested = false
      }
    })
  })

  autoUpdater.on('update-not-available', () => {
    updateCheckInProgress = false
    if (manualUpdateRequested) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'No updates found',
        message: 'You already have the latest version of Chattio.'
      })
      manualUpdateRequested = false
    }
  })

  autoUpdater.on('update-downloaded', () => {
    manualUpdateRequested = false
    const buttons = ['Restart Now', 'Later']
    dialog.showMessageBox(getDialogParent(), {
      type: 'info',
      title: 'Update ready',
      message: 'A new version of Chattio has been downloaded.',
      detail: 'Restart to apply the update.',
      buttons,
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  autoUpdater.on('error', error => {
    updateCheckInProgress = false
    // Suppress 404 errors (no releases yet) and network errors for automatic checks
    const is404 = error?.message?.includes('404') || error?.code === 'ERR_HTTP_RESPONSE_CODE_FAILURE'
    const isNetworkError = error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED'
    
    if (is404 || isNetworkError) {
      // Silently ignore 404s and network errors for automatic checks
      if (!manualUpdateRequested) {
        return
      }
      // For manual checks, show a friendly message
      if (is404) {
        dialog.showMessageBox(getDialogParent(), {
          type: 'info',
          title: 'No updates available',
          message: 'No releases found on GitHub yet.',
          detail: 'Updates will be available once you publish a release.'
        })
        manualUpdateRequested = false
        return
      }
    }
    
    console.error('Auto-update error:', error)
    if (manualUpdateRequested) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'error',
        title: 'Update failed',
        message: 'Unable to check for updates.',
        detail: error?.message || 'Unknown error'
      })
      manualUpdateRequested = false
    }
  })

  scheduleAutomaticUpdateChecks()
}

function scheduleAutomaticUpdateChecks() {
  clearTimeout(updateInitialTimeout)
  clearInterval(updateInterval)

  const triggerUpdateCheck = () => requestUpdateCheck(false)
  updateInitialTimeout = setTimeout(() => {
    triggerUpdateCheck()
    updateInterval = setInterval(triggerUpdateCheck, UPDATE_CHECK_INTERVAL)
  }, FIRST_CHECK_DELAY)
}

function requestUpdateCheck(isManual) {
  if (!autoUpdater) {
    if (isManual) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'error',
        title: 'Update unavailable',
        message: 'Auto-updater is not available in this build.'
      })
    }
    return
  }

  if (isDev) {
    if (isManual) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'Development build',
        message: 'Auto-updates are only available in packaged builds.'
      })
    }
    return
  }

  if (updateCheckInProgress) {
    if (isManual) {
      dialog.showMessageBox(getDialogParent(), {
        type: 'info',
        title: 'Already checking',
        message: 'Please wait while we finish the current update check.'
      })
    }
    return
  }

  manualUpdateRequested = Boolean(isManual)
  updateCheckInProgress = true

  autoUpdater.checkForUpdates().catch(error => {
    updateCheckInProgress = false
    // Suppress 404 errors (no releases yet)
    const is404 = error?.message?.includes('404') || error?.code === 'ERR_HTTP_RESPONSE_CODE_FAILURE'
    if (is404 && !manualUpdateRequested) {
      // Silently ignore 404s for automatic checks
      return
    }
    console.error('Failed to check for updates:', error)
    if (manualUpdateRequested) {
      if (is404) {
        dialog.showMessageBox(getDialogParent(), {
          type: 'info',
          title: 'No updates available',
          message: 'No releases found on GitHub yet.',
          detail: 'Updates will be available once you publish a release.'
        })
      } else {
        dialog.showMessageBox(getDialogParent(), {
          type: 'error',
          title: 'Update failed',
          message: 'Unable to check for updates.',
          detail: error?.message || 'Unknown error'
        })
      }
      manualUpdateRequested = false
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  initializeAutoUpdates()
  ipcMain.on('unread-summary', (event, summary) => {
    if (process.platform === 'darwin' && app.dock) {
      const count = summary && typeof summary.totalMessages === 'number'
        ? summary.totalMessages
        : 0
      app.dock.setBadge(count > 0 ? String(count) : '')
    }
  })
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  clearTimeout(updateInitialTimeout)
  clearInterval(updateInterval)
})
