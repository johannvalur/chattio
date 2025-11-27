const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json')

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
}

app.whenReady().then(() => {
  createWindow()
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
