function collectButtonRefs(sidebarMain) {
	const map = new Map();
	if (!sidebarMain) return map;
	const buttons = sidebarMain.querySelectorAll(
		'.tablinks[data-platform]:not([data-platform="welcome"]):not([data-platform="settings"])'
	);
	buttons.forEach(button => {
		const platform = button.getAttribute('data-platform');
		if (platform) {
			map.set(platform, button);
		}
	});
	return map;
}

function computeOrderedButtons(appState, buttonRefs) {
	const orderedButtons = [];
	if (!appState || !buttonRefs) return orderedButtons;

	appState.order.forEach(platform => {
		const entry = appState.apps[platform];
		const button = buttonRefs.get(platform);
		if (entry && entry.enabled && button) {
			orderedButtons.push(button);
		}
	});

	// Append any enabled buttons missing from order
	buttonRefs.forEach((button, platform) => {
		if (
			appState.apps[platform] &&
			appState.apps[platform].enabled &&
			!orderedButtons.includes(button)
		) {
			orderedButtons.push(button);
		}
	});

	return orderedButtons;
}

function applySidebarState({ sidebarMain, welcomeButton, buttonRefs, appState }) {
	if (!sidebarMain || !welcomeButton || !buttonRefs) {
		throw new Error('Sidebar state requires sidebarMain, welcomeButton, and buttonRefs');
	}

	const allButtons = Array.from(buttonRefs.values());

	// Remove all app buttons from DOM temporarily
	allButtons.forEach(btn => {
		if (btn.parentNode === sidebarMain) {
			sidebarMain.removeChild(btn);
		}
	});

	// Ensure welcome button is first
	if (welcomeButton.parentNode !== sidebarMain) {
		sidebarMain.insertBefore(welcomeButton, sidebarMain.firstChild);
	} else if (sidebarMain.firstChild !== welcomeButton) {
		sidebarMain.insertBefore(welcomeButton, sidebarMain.firstChild);
	}

	const orderedButtons = computeOrderedButtons(appState, buttonRefs);

	orderedButtons.forEach(btn => {
		btn.style.display = 'flex';
		if (btn.parentNode !== sidebarMain) {
			sidebarMain.appendChild(btn);
		}
	});

	// Hide disabled buttons
	buttonRefs.forEach((btn, platform) => {
		const entry = appState.apps[platform];
		if (!entry || !entry.enabled) {
			btn.style.display = 'none';
		}
	});

	return orderedButtons.map(btn => btn.getAttribute('data-platform'));
}

module.exports = {
	collectButtonRefs,
	computeOrderedButtons,
	applySidebarState
};

