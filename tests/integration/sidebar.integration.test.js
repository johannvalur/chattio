/**
 * @jest-environment jsdom
 */

const {
	applySidebarState
} = require('../../src/lib/sidebarManager');

function setupDOM() {
	document.body.innerHTML = `
		<div class="sidebar">
			<div class="sidebar-main">
				<button class="tablinks" data-platform="welcome"></button>
				<button class="tablinks" data-platform="messenger"></button>
				<button class="tablinks" data-platform="slack"></button>
			</div>
		</div>
	`;

	const sidebarMain = document.querySelector('.sidebar-main');
	const welcomeButton = sidebarMain.querySelector('.tablinks[data-platform="welcome"]');
	const buttonRefs = new Map();
	sidebarMain
		.querySelectorAll('.tablinks[data-platform]:not([data-platform="welcome"])')
		.forEach(btn => {
			buttonRefs.set(btn.getAttribute('data-platform'), btn);
		});

	return { sidebarMain, welcomeButton, buttonRefs };
}

describe('applySidebarState', () => {
	test('hides disabled apps and keeps welcome first', () => {
		const { sidebarMain, welcomeButton, buttonRefs } = setupDOM();

		const appState = {
			apps: {
				messenger: { enabled: true },
				slack: { enabled: false }
			},
			order: ['messenger', 'slack']
		};

		const appliedOrder = applySidebarState({
			sidebarMain,
			welcomeButton,
			buttonRefs,
			appState
		});

		expect(appliedOrder).toEqual(['messenger']);
		const slackButton = buttonRefs.get('slack');
		expect(slackButton.style.display).toBe('none');
		expect(sidebarMain.firstChild).toBe(welcomeButton);
	});
});

