const {
	computeOrderedButtons
} = require('../../src/lib/sidebarManager');

function createButton(platform) {
	const btn = document.createElement('button');
	btn.setAttribute('data-platform', platform);
	return btn;
}

describe('computeOrderedButtons', () => {
	test('returns enabled buttons in saved order', () => {
		const appState = {
			apps: {
				messenger: { enabled: true },
				slack: { enabled: true },
				x: { enabled: false }
			},
			order: ['slack', 'messenger', 'x']
		};

		const buttonRefs = new Map([
			['messenger', createButton('messenger')],
			['slack', createButton('slack')],
			['x', createButton('x')]
		]);

		const ordered = computeOrderedButtons(appState, buttonRefs);
		expect(ordered.map(btn => btn.getAttribute('data-platform'))).toEqual(['slack', 'messenger']);
	});
});

