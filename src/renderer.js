const { ipcRenderer, shell } = require('electron');
const { applyThemeToDocument } = require('./lib/theme');
const {
	collectButtonRefs,
	applySidebarState
} = require('./lib/sidebarManager');

const unreadState = {
    messenger: false,
    whatsapp: false,
    instagram: false,
    linkedin: false
};

function updateUnreadSummary() {
    const hasUnreadServices = Object.values(unreadState).filter(Boolean).length;
    ipcRenderer.send('unread-summary', {
        ...unreadState,
        totalUnreadServices: hasUnreadServices
    });
}

function setTabUnread(platform, hasUnread) {
    unreadState[platform] = hasUnread;
    const tabButton = document.querySelector(`.tablinks[data-platform="${platform}"]`);
    if (tabButton) {
        if (hasUnread) {
            tabButton.classList.add('has-unread');
        } else {
            tabButton.classList.remove('has-unread');
        }
    }
    updateUnreadSummary();
}

function openTab(evt, platform) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(platform).style.display = "block";
    evt.currentTarget.className += " active";

    // Only set unread state for messaging platforms, not welcome or settings
    if (platform !== 'welcome' && platform !== 'settings') {
        setTabUnread(platform, false);
    }
}

// Modern Chrome user agent string to avoid browser compatibility issues
const chromeUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Setup webviews after DOM is ready
function setupWebviews() {
    const webviews = document.querySelectorAll('webview');
    webviews.forEach(webview => {
    const platform = webview.id.replace('-webview', '');
    
    // Enable additional features for better compatibility
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=no,nodeIntegration=no');
    
    // Set user agent attribute (this works before webview is ready)
    if (!webview.getAttribute('useragent')) {
        webview.setAttribute('useragent', chromeUserAgent);
    }
    
    // Set user agent via method only after webview is ready (avoids errors)
    webview.addEventListener('dom-ready', () => {
        if (typeof webview.setUserAgent === 'function') {
            try {
                webview.setUserAgent(chromeUserAgent);
            } catch (e) {
                // Silently ignore - useragent attribute is already set
            }
        }
    }, { once: true });
    
    // For Slack and WhatsApp, set user agent before navigation
    if (platform === 'slack' || platform === 'whatsapp') {
        webview.addEventListener('will-navigate', (event) => {
            if (typeof webview.setUserAgent === 'function') {
                try {
                    webview.setUserAgent(chromeUserAgent);
                } catch (e) {
                    // Ignore errors
                }
            }
        });
        
        webview.addEventListener('did-start-navigation', (event) => {
            if (typeof webview.setUserAgent === 'function') {
                try {
                    webview.setUserAgent(chromeUserAgent);
                } catch (e) {
                    // Ignore errors
                }
            }
        });
    }
    
    webview.addEventListener('did-start-loading', () => {
    });
    
    webview.addEventListener('did-stop-loading', () => {
        const title = webview.getTitle ? webview.getTitle() : '';

        const titleIndicatesUnread = typeof title === 'string' && /^\(\d+\)/.test(title.trim());

        if (titleIndicatesUnread) {
            setTabUnread(platform, true);
        }
    });
    
    webview.addEventListener('page-title-updated', (event) => {
        const title = event.title || '';
        const titleIndicatesUnread = typeof title === 'string' && /^\(\d+\)/.test(title.trim());
        setTabUnread(platform, titleIndicatesUnread);
    });
    
    webview.addEventListener('did-fail-load', (event) => {
        console.error('Failed to load:', event);
    });
    
    // For WhatsApp and Slack specifically, inject scripts to bypass browser checks
    if (platform === 'whatsapp' || platform === 'slack') {
        webview.addEventListener('dom-ready', () => {
            // Inject script multiple times to ensure it works
            const injectScript = () => {
                if (typeof webview.executeJavaScript === 'function') {
                    webview.executeJavaScript(`
                    (function() {
                        try {
                            // Override navigator.userAgent
                            Object.defineProperty(navigator, 'userAgent', {
                                get: function() {
                                    return '${chromeUserAgent}';
                                },
                                configurable: true
                            });
                            
                            // Override navigator.platform
                            Object.defineProperty(navigator, 'platform', {
                                get: function() {
                                    return 'MacIntel';
                                },
                                configurable: true
                            });
                            
                            // Override navigator.vendor
                            Object.defineProperty(navigator, 'vendor', {
                                get: function() {
                                    return 'Google Inc.';
                                },
                                configurable: true
                            });
                            
                            // Override navigator.appVersion
                            Object.defineProperty(navigator, 'appVersion', {
                                get: function() {
                                    return '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
                                },
                                configurable: true
                            });
                            
                            // Remove Electron-specific properties
                            if (window.navigator.standalone !== undefined) {
                                delete window.navigator.standalone;
                            }
                            
                            // Override window.chrome
                            if (!window.chrome) {
                                window.chrome = {};
                            }
                            window.chrome.runtime = {};
                        } catch(e) {
                            console.log('Navigator override error:', e);
                        }
                    })();
                `).catch(err => console.log('Script injection error:', err));
                }
            };
            
            injectScript();
            // Also inject after a short delay to catch late-loading scripts
            setTimeout(injectScript, 100);
            setTimeout(injectScript, 500);
        });
    }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey) {
        const tabs = Array.from(document.getElementsByClassName('tablinks'));
        const currentIndex = tabs.findIndex(tab => tab.classList.contains('active'));
        
        if (event.key === 'Tab') {
            event.preventDefault();
            const nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
            tabs[nextIndex].click();
        } else if (event.key >= '1' && event.key <= '4') {
            const tabIndex = parseInt(event.key) - 1;
            if (tabIndex < tabs.length) {
                tabs[tabIndex].click();
            }
        }
    }
});

// App state management
const appState = {
    apps: {
        messenger: { enabled: true, notifications: true },
        whatsapp: { enabled: true, notifications: true },
        instagram: { enabled: true, notifications: true },
        linkedin: { enabled: true, notifications: true },
        x: { enabled: true, notifications: true },
        slack: { enabled: true, notifications: true },
        telegram: { enabled: true, notifications: true },
        discord: { enabled: true, notifications: true },
        imessage: { enabled: true, notifications: true },
        teams: { enabled: true, notifications: true }
    },
    order: ['messenger', 'whatsapp', 'instagram', 'linkedin', 'x', 'slack', 'telegram', 'discord', 'imessage', 'teams']
};

// Load app state from localStorage
function loadAppState() {
    const savedState = localStorage.getItem('chatterly-app-state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed.apps) {
                Object.assign(appState.apps, parsed.apps);
            }
            if (parsed.order && Array.isArray(parsed.order)) {
                appState.order = parsed.order;
            }
        } catch (e) {
            console.error('Error loading app state:', e);
        }
    }
}

// Save app state to localStorage
function saveAppState() {
    localStorage.setItem('chatterly-app-state', JSON.stringify(appState));
}

let buttonRefs = new Map();

function initializeButtonRefs() {
	const sidebarMain = document.querySelector('.sidebar-main');
	buttonRefs = collectButtonRefs(sidebarMain);
}

// Update sidebar visibility based on app state
function updateSidebarVisibility() {
    const sidebarMain = document.querySelector('.sidebar-main');
    if (!sidebarMain) {
        console.warn('Sidebar main not found');
        return;
    }

    // Ensure button refs populated
    if (!buttonRefs || buttonRefs.size === 0) {
        initializeButtonRefs();
    }

    // Get welcome button (should stay at top)
    const welcomeButton = sidebarMain.querySelector('.tablinks[data-platform="welcome"]');
    if (!welcomeButton) {
        console.warn('Welcome button not found');
        return;
    }

    if (!buttonRefs || buttonRefs.size === 0) {
        console.warn('No app buttons found');
        return;
    }
    try {
        applySidebarState({
            sidebarMain,
            welcomeButton,
            buttonRefs,
            appState
        });
    } catch (error) {
        console.error('Failed to update sidebar', error);
    }
}

// Update notification toggle disabled state
function updateNotificationToggles() {
    Object.keys(appState.apps).forEach(app => {
        const notificationToggle = document.querySelector(`input[data-app="${app}"][data-toggle="notifications"]`);
        const appToggle = document.querySelector(`input[data-app="${app}"][data-toggle="app"]`);
        if (notificationToggle && appToggle) {
            notificationToggle.disabled = !appToggle.checked;
        }
    });
}

// Handle app toggle changes
function setupAppToggles() {
    const toggles = document.querySelectorAll('input[data-app][data-toggle]');
    toggles.forEach(toggle => {
        const app = toggle.getAttribute('data-app');
        const toggleType = toggle.getAttribute('data-toggle');
        
        // Set initial state
        if (appState.apps[app]) {
            if (toggleType === 'app') {
                toggle.checked = appState.apps[app].enabled;
            } else if (toggleType === 'notifications') {
                toggle.checked = appState.apps[app].notifications;
            }
        }

        toggle.addEventListener('change', (e) => {
            if (!appState.apps[app]) {
                console.warn(`App ${app} not found in appState`);
                return;
            }

            if (toggleType === 'app') {
                const wasEnabled = appState.apps[app].enabled;
                appState.apps[app].enabled = e.target.checked;
                console.log(`App ${app} ${e.target.checked ? 'enabled' : 'disabled'}`);
                
                // If re-enabling an app, add it to the order if it's not there
                if (e.target.checked && !wasEnabled && !appState.order.includes(app)) {
                    appState.order.push(app);
                    saveAppState();
                }
                
                // Update notification toggle state first
                updateNotificationToggles();
                
                // Then update sidebar visibility
                updateSidebarVisibility();
                
                // Save the order
                saveSidebarOrder();
                
                // Re-setup drag and drop after visibility changes
                setTimeout(() => {
                    setupSidebarDragAndDrop();
                }, 150);
            } else if (toggleType === 'notifications') {
                appState.apps[app].notifications = e.target.checked;
                console.log(`Notifications for ${app} ${e.target.checked ? 'enabled' : 'disabled'}`);
            }
            saveAppState();
        });
    });
    
    // Initial update of notification toggle states
    updateNotificationToggles();
}

// Save sidebar order to appState
function saveSidebarOrder() {
    const sidebarMain = document.querySelector('.sidebar-main');
    if (!sidebarMain) return;

    const buttons = Array.from(sidebarMain.querySelectorAll('.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'));
    const newOrder = buttons
        .map(btn => btn.getAttribute('data-platform'))
        .filter(platform => platform && appState.apps[platform] && appState.apps[platform].enabled);
    
    if (newOrder.length > 0) {
        appState.order = newOrder;
        saveAppState();
    }
}

// Simple drag-and-drop reordering for sidebar icons (excluding welcome)
let draggedButton = null;
const dragHandlers = new WeakMap();

function setupSidebarDragAndDrop() {
    const sidebarMain = document.querySelector('.sidebar-main');
    if (!sidebarMain) return;

    // Get all app buttons (excluding welcome and settings) - only visible ones
    const allButtons = Array.from(sidebarMain.querySelectorAll('.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'));
    const buttons = allButtons.filter(btn => {
        const platform = btn.getAttribute('data-platform');
        return platform && appState.apps[platform] && appState.apps[platform].enabled && btn.style.display !== 'none';
    });
    
    buttons.forEach(button => {
        const platform = button.getAttribute('data-platform');
        const isEnabled = platform && appState.apps[platform] && appState.apps[platform].enabled;
        
        // Remove old handlers if they exist
        const oldHandlers = dragHandlers.get(button);
        if (oldHandlers) {
            oldHandlers.forEach(({ event, handler }) => {
                button.removeEventListener(event, handler);
            });
            dragHandlers.delete(button);
        }
        
        if (isEnabled) {
            button.setAttribute('draggable', 'true');
            button.style.cursor = 'grab';
            
            const handlers = [];
            
            const dragStartHandler = (e) => {
                draggedButton = button;
                e.dataTransfer.effectAllowed = 'move';
                button.style.opacity = '0.5';
                button.style.cursor = 'grabbing';
            };
            button.addEventListener('dragstart', dragStartHandler);
            handlers.push({ event: 'dragstart', handler: dragStartHandler });

            const dragOverHandler = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (button !== draggedButton && button.getAttribute('data-platform') !== 'welcome') {
                    button.style.backgroundColor = '#e0e0e5';
                }
            };
            button.addEventListener('dragover', dragOverHandler);
            handlers.push({ event: 'dragover', handler: dragOverHandler });

            const dragLeaveHandler = () => {
                if (button !== draggedButton) {
                    button.style.backgroundColor = '';
                }
            };
            button.addEventListener('dragleave', dragLeaveHandler);
            handlers.push({ event: 'dragleave', handler: dragLeaveHandler });

            const dropHandler = (e) => {
                e.preventDefault();
                button.style.backgroundColor = '';
                
                if (!draggedButton || draggedButton === button) {
                    draggedButton = null;
                    return;
                }

                if (button.getAttribute('data-platform') === 'welcome') {
                    draggedButton = null;
                    return;
                }

                const buttonsArray = Array.from(sidebarMain.querySelectorAll('.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'));
                const draggedIndex = buttonsArray.indexOf(draggedButton);
                const targetIndex = buttonsArray.indexOf(button);

                if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                    console.log(`Moving ${draggedButton.getAttribute('data-platform')} from position ${draggedIndex} to ${targetIndex}`);
                    if (draggedIndex < targetIndex) {
                        sidebarMain.insertBefore(draggedButton, button.nextSibling);
                    } else {
                        sidebarMain.insertBefore(draggedButton, button);
                    }
                    saveSidebarOrder();
                    console.log('New order:', appState.order);
                    // Re-setup drag and drop after reordering
                    setTimeout(() => setupSidebarDragAndDrop(), 50);
                }
                
                draggedButton = null;
            };
            button.addEventListener('drop', dropHandler);
            handlers.push({ event: 'drop', handler: dropHandler });

            const dragEndHandler = () => {
                if (draggedButton) {
                    draggedButton.style.opacity = '';
                    draggedButton.style.cursor = 'grab';
                }
                draggedButton = null;
            };
            button.addEventListener('dragend', dragEndHandler);
            handlers.push({ event: 'dragend', handler: dragEndHandler });
            
            dragHandlers.set(button, handlers);
            } else {
                button.setAttribute('draggable', 'false');
                button.style.cursor = 'pointer';
                button.style.opacity = '';
            }
        });
    
    // Also disable drag for hidden buttons
    allButtons.forEach(button => {
        const platform = button.getAttribute('data-platform');
        if (platform && appState.apps[platform] && !appState.apps[platform].enabled) {
            button.setAttribute('draggable', 'false');
            button.style.cursor = 'default';
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // Initialize button references first
    initializeButtonRefs();
    
    // Setup webviews first
    setupWebviews();
    
    // Load app state first
    loadAppState();
    
    // Initialize order if not saved (use current HTML order)
    if (!localStorage.getItem('chatterly-app-state')) {
        const sidebarMain = document.querySelector('.sidebar-main');
        if (sidebarMain) {
            const buttons = Array.from(sidebarMain.querySelectorAll('.tablinks:not([data-platform="welcome"]):not([data-platform="settings"])'));
            appState.order = buttons.map(btn => btn.getAttribute('data-platform')).filter(Boolean);
            saveAppState();
        }
    }
    
    // Setup app toggles first (so they reflect the loaded state)
    setupAppToggles();
    
    // Update sidebar visibility based on loaded state
    updateSidebarVisibility();
    
    // Setup drag and drop after visibility is set
    setupSidebarDragAndDrop();

    // Show welcome page by default
    const welcomeTab = document.getElementById('welcome');
    if (welcomeTab) {
        welcomeTab.style.display = 'block';
    }
    const welcomeButton = document.querySelector('.tablinks[data-platform="welcome"]');
    if (welcomeButton) {
        welcomeButton.classList.add('active');
    }
    // Remove active from messenger button
    const messengerButton = document.querySelector('.tablinks[data-platform="messenger"]');
    if (messengerButton) {
        messengerButton.classList.remove('active');
    }

    const storedTheme = window.localStorage.getItem('chatterly-theme') || 'system';
    applyTheme(storedTheme);
    updateThemeChips(storedTheme);
    
    // Listen for system theme changes if using system theme
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e) => {
            const currentTheme = window.localStorage.getItem('chatterly-theme') || 'system';
            if (currentTheme === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    const themeChips = document.querySelectorAll('.settings-chip');
    themeChips.forEach(chip => {
        const value = chip.textContent.trim().toLowerCase();
        chip.addEventListener('click', () => {
            let theme = 'system';
            if (value === 'light') theme = 'light';
            if (value === 'dark') theme = 'dark';
            if (value === 'system default') theme = 'system';
            window.localStorage.setItem('chatterly-theme', theme);
            applyTheme(theme);
            updateThemeChips(theme);
        });
    });

    const donateButton = document.querySelector('.settings-primary-button');
    if (donateButton) {
        donateButton.addEventListener('click', () => {
            shell.openExternal('https://www.chatterly.com');
        });
    }
});

function applyTheme(theme) {
	applyThemeToDocument(document, theme);
}

function updateThemeChips(theme) {
    const chips = document.querySelectorAll('.settings-chip');
    chips.forEach(chip => {
        const value = chip.textContent.trim().toLowerCase();
        let chipTheme = 'system';
        if (value === 'light') chipTheme = 'light';
        if (value === 'dark') chipTheme = 'dark';
        if (value === 'system default') chipTheme = 'system';
        if (chipTheme === theme) {
            chip.classList.add('settings-chip-active');
        } else {
            chip.classList.remove('settings-chip-active');
        }
    });
}

function openSettingsTab(tabId) {
    const panels = document.querySelectorAll('.settings-panel');
    panels.forEach(panel => {
        panel.style.display = 'none';
    });

    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    const targetPanel = document.getElementById(`settings-${tabId}`);
    if (targetPanel) {
        targetPanel.style.display = 'block';
    }

    const activeTab = document.querySelector(`.settings-tab[data-settings-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}
