const { computeOrderedButtons } = require('../../src/lib/sidebarManager');

function createButton(platform) {
  const btn = document.createElement('button');
  // Make sure getAttribute and setAttribute work properly
  btn.getAttribute = jest.fn((attr) => {
    if (attr === 'data-platform') return platform;
    return null;
  });
  btn.setAttribute = jest.fn();
  return btn;
}

describe('computeOrderedButtons', () => {
  test('returns enabled buttons in saved order', () => {
    const appState = {
      apps: {
        messenger: { enabled: true },
        slack: { enabled: true },
        x: { enabled: false },
      },
      order: ['slack', 'messenger', 'x'],
    };

    const messengerBtn = createButton('messenger');
    const slackBtn = createButton('slack');
    const xBtn = createButton('x');

    const buttonRefs = new Map([
      ['messenger', messengerBtn],
      ['slack', slackBtn],
      ['x', xBtn],
    ]);

    const ordered = computeOrderedButtons(appState, buttonRefs);
    expect(ordered.map((btn) => btn.getAttribute('data-platform'))).toEqual(['slack', 'messenger']);
  });
});
