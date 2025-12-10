// Mock Electron
const mockIpcRenderer = {
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  invoke: jest.fn(),
  sendSync: jest.fn(),
  sendToHost: jest.fn(),
  postMessage: jest.fn(),
};

const mockShell = {
  openExternal: jest.fn().mockResolvedValue(true),
  showItemInFolder: jest.fn(),
  openPath: jest.fn(),
  trashItem: jest.fn(),
  beep: jest.fn(),
};

const mockRemote = {
  getGlobal: jest.fn(),
  require: jest.fn(),
  getCurrentWindow: jest.fn(() => ({
    webContents: {
      getURL: jest.fn(),
    },
  })),
  getCurrentWebContents: jest.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock document and window objects
const createMockElement = (tagName = 'div') => {
  const element = {
    tagName: tagName.toUpperCase(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn(),
    },
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getAttribute: jest.fn(),
    setAttribute: jest.fn(),
    hasAttribute: jest.fn(),
    style: {},
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    focus: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
  };
  return element;
};

// Create a simple HTML parser using jsdom if available, otherwise use a basic mock
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  // jsdom not available, use basic mocks
}

if (JSDOM) {
  // Use jsdom for better DOM support
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable',
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  // Ensure localStorage is available
  if (!global.window.localStorage) {
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
          store[key] = String(value);
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
      };
    })();
    Object.defineProperty(global.window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  }
} else {
  // Fallback to basic mocks
  const bodyElement = createMockElement('body');
  Object.defineProperty(bodyElement, 'innerHTML', {
    get: () => bodyElement._innerHTML || '',
    set: (value) => {
      bodyElement._innerHTML = value;
    },
    enumerable: true,
    configurable: true,
  });

  global.document = {
    ...global.document,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn(),
    createElement: jest.fn((tagName) => createMockElement(tagName)),
    body: bodyElement,
  };
}

global.window = {
  ...global.window,
  localStorage: localStorageMock,
  sessionStorage: {},
  matchMedia: jest.fn(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: jest.fn(),
  scrollTo: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getComputedStyle: jest.fn(() => ({
    getPropertyValue: jest.fn(),
  })),
};

// Mock Electron
jest.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
  shell: mockShell,
  remote: mockRemote,
}));

// Mock console methods to track calls
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  debug: jest.fn(originalConsole.debug),
  log: jest.fn(originalConsole.log),
  info: jest.fn(originalConsole.info),
  warn: jest.fn(originalConsole.warn),
  error: jest.fn(originalConsole.error),
};

// Mock Date
const OriginalDate = Date;
global.Date = jest.fn((...args) => {
  if (args.length) {
    return new OriginalDate(...args);
  }
  return new OriginalDate('2023-01-01T00:00:00.000Z');
});

global.Date.now = jest.fn(() => new OriginalDate('2023-01-01T00:00:00.000Z').getTime());

// Mock requestAnimationFrame
const requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

const cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

global.requestAnimationFrame = requestAnimationFrame;
global.cancelAnimationFrame = cancelAnimationFrame;

// Reset all mocks before each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Reset localStorage mock
  localStorageMock.clear();

  // Reset all function mocks
  Object.values(mockIpcRenderer).forEach((mock) => mock.mockClear());
  Object.values(mockShell).forEach((mock) => mock.mockClear());
  if (mockRemote.getCurrentWindow) {
    mockRemote.getCurrentWindow.mockClear();
  }
});

global.createMockElement = createMockElement;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;
