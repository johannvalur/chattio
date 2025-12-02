import { app, BrowserWindow } from 'electron';
import path from 'path';

console.log('Main process starting...');

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  console.log('Creating browser window...');
  
  try {
    const preloadPath = '/Users/johannvs/Downloads/chattio-000fb357738512e721a193abd6cedc62f888e0d3/dist/main/preload.js';
    console.log('Preload script path:', preloadPath);
    
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath
      }
    });

    console.log('Loading index.html...');
    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log('Index path:', indexPath);
    
    await mainWindow.loadFile(indexPath);
    console.log('Index loaded successfully');

    if (process.env.NODE_ENV === 'development') {
      console.log('Opening dev tools...');
      mainWindow.webContents.openDevTools();
    }

  } catch (error) {
    console.error('Error creating window:', error);
  }
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow().catch(console.error);
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch(console.error);
  }
});

console.log('Main process setup complete');
