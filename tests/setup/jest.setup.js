// Mock Electron
const electron = require('electron');

// Mock Electron's ipcRenderer
const mockIpcRenderer = {
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  sendSync: jest.fn(),
  invoke: jest.fn(),
  postMessage: jest.fn(),
  sendToHost: jest.fn(),
};

// Mock Electron's shell
const mockShell = {
  openExternal: jest.fn(),
  showItemInFolder: jest.fn(),
  openPath: jest.fn(),
  trashItem: jest.fn(),
  beep: jest.fn(),
};

// Mock Electron's app
const mockApp = {
  getPath: jest.fn().mockReturnValue('/tmp'),
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  getName: jest.fn().mockReturnValue('Chattio'),
  getLocale: jest.fn().mockReturnValue('en-US'),
  isPackaged: false,
};

// Mock Electron's dialog
const mockDialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
  showErrorBox: jest.fn(),
  showCertificateTrustDialog: jest.fn(),
};

// Mock Electron's BrowserWindow
const mockBrowserWindow = {
  getAllWindows: jest.fn(),
  getFocusedWindow: jest.fn(),
  fromWebContents: jest.fn(),
  fromId: jest.fn(),
  fromBrowserView: jest.fn(),
  fromDevToolsExtnView: jest.fn(),
};

// Set up the Electron mock
electron.ipcRenderer = mockIpcRenderer;
electron.shell = mockShell;
electron.app = mockApp;
electron.dialog = mockDialog;
electron.BrowserWindow = mockBrowserWindow;

// Mock Electron's remote
electron.remote = {
  app: mockApp,
  dialog: mockDialog,
  getCurrentWindow: jest.fn(),
  getCurrentWebContents: jest.fn(),
};

// Mock Electron's contextBridge
const mockContextBridge = {
  exposeInMainWorld: jest.fn(),
};

// Mock Electron's webFrame
const mockWebFrame = {
  setZoomFactor: jest.fn(),
  setZoomLevel: jest.fn(),
  getZoomFactor: jest.fn(),
  getZoomLevel: jest.fn(),
};

// Set up global mocks
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

global.localStorage = localStorageMock;

// Mock matchMedia
global.matchMedia = jest.fn(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

// Mock IntersectionObserver
class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserver;

// Add cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// Add global test timeout
jest.setTimeout(30000);
