// Global type declarations for the application

declare global {
  interface Window {
    openTab: (event: Event, platform: string) => void;
    openSettingsTab: (tabId: string) => void;
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeListener: (channel: string, func: (...args: any[]) => void) => void;
      };
    };
  }
}

// Platform configuration
export interface PlatformConfig {
  name: string;
  url: string;
  icon: string;
  needsUserAgent: boolean;
}

// Application state types
export interface AppState {
  order: string[];
  apps: {
    [key: string]: {
      enabled: boolean;
      notifications: boolean;
    };
  };
  settings: {
    globalNotifications: boolean;
    badgeDockIcon: boolean;
    telemetry: boolean;
    sidebarDensity: string;
  };
}

// Unread state type
export type UnreadState = {
  [key: string]: number;
};

// DOM Element extensions for TypeScript
declare global {
  interface HTMLElement {
    style: CSSStyleDeclaration;
    checked?: boolean;
    disabled?: boolean;
    value?: string;
    setUserAgent?: (userAgent: string) => void;
    getAttribute(qualifiedName: string): string | null;
    getElementsByClassName(classNames: string): HTMLCollectionOf<Element>;
    querySelector<E extends Element = Element>(selectors: string): E | null;
    querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
  }

  interface HTMLInputElement extends HTMLElement {
    checked: boolean;
    disabled: boolean;
    value: string;
  }

  interface HTMLWebViewElement extends HTMLElement {
    setUserAgent(userAgent: string): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions
    ): void;
  }
}

// Add types for process.env
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  }
}
