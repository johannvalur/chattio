const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
    icon: path.join(__dirname, '../public/icon.png')
  })

  mainWindow.loadFile('src/index.html')
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()
  ipcMain.on('unread-summary', (event, summary) => {
    if (process.platform === 'darwin' && app.dock) {
      const count = summary && typeof summary.totalUnreadServices === 'number'
        ? summary.totalUnreadServices
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
