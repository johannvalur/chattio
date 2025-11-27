let ipcRenderer;

describe('renderer state management', () => {
	let testables;

	beforeEach(() => {
		jest.resetModules();
		({ ipcRenderer } = require('electron'));
		window.localStorage.clear();
		document.body.innerHTML = '';
		ipcRenderer.send.mockClear();

		// Require renderer after reset to obtain fresh state + helpers
		const rendererModule = require('../../src/renderer.js');
		testables = rendererModule.__testables;
		testables.resetUnreadStateForTests();
		testables.resetAppStateForTests();
	});

	afterEach(() => {
		delete global.Notification;
	});

	test('updateUnreadSummary respects dock badge toggle', () => {
		testables.appState.settings.badgeDockIcon = true;
		testables.appState.settings.globalNotifications = false;
		testables.unreadState.messenger = 3;

		testables.updateUnreadSummary();

		expect(ipcRenderer.send).toHaveBeenCalledWith(
			'unread-summary',
			expect.objectContaining({ totalUnreadServices: 1 })
		);

		ipcRenderer.send.mockClear();

		testables.appState.settings.badgeDockIcon = false;
		testables.updateUnreadSummary();

		expect(ipcRenderer.send).toHaveBeenCalledWith(
			'unread-summary',
			expect.objectContaining({ totalUnreadServices: 0 })
		);
	});

	test('global toggles persist to localStorage and density chips update sidebar', () => {
		document.body.innerHTML = `
			<div class="sidebar sidebar-comfortable"></div>
			<input type="checkbox" id="global-notifications-toggle">
			<input type="checkbox" id="badge-dock-icon-toggle">
			<div>
				<button class="settings-chip" data-density="comfortable">Comfortable</button>
				<button class="settings-chip" data-density="compact">Compact</button>
			</div>
		`;

		testables.appState.settings.globalNotifications = false;
		testables.appState.settings.badgeDockIcon = true;
		testables.appState.settings.sidebarDensity = 'comfortable';

		global.Notification = {
			permission: 'default',
			requestPermission: jest.fn()
		};

		testables.setupGlobalSettings();

		const globalToggle = document.getElementById('global-notifications-toggle');
		globalToggle.checked = true;
		globalToggle.dispatchEvent(new Event('change'));

		expect(testables.appState.settings.globalNotifications).toBe(true);
		expect(Notification.requestPermission).toHaveBeenCalled();

		let savedState = JSON.parse(window.localStorage.getItem('chatterly-app-state'));
		expect(savedState.settings.globalNotifications).toBe(true);

		const badgeToggle = document.getElementById('badge-dock-icon-toggle');
		badgeToggle.checked = false;
		badgeToggle.dispatchEvent(new Event('change'));

		expect(testables.appState.settings.badgeDockIcon).toBe(false);
		savedState = JSON.parse(window.localStorage.getItem('chatterly-app-state'));
		expect(savedState.settings.badgeDockIcon).toBe(false);

		const compactChip = document.querySelector('.settings-chip[data-density="compact"]');
		compactChip.click();

		expect(testables.appState.settings.sidebarDensity).toBe('compact');

		const sidebar = document.querySelector('.sidebar');
		expect(sidebar.classList.contains('sidebar-compact')).toBe(true);

		savedState = JSON.parse(window.localStorage.getItem('chatterly-app-state'));
		expect(savedState.settings.sidebarDensity).toBe('compact');
	});
});

