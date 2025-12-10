const { resolveThemeClass } = require('../../src/lib/theme');

describe('resolveThemeClass', () => {
  test('returns dark when theme is dark', () => {
    expect(resolveThemeClass('dark', false)).toBe('theme-dark');
  });

  test('returns light when theme is light', () => {
    expect(resolveThemeClass('light', true)).toBe('theme-light');
  });

  test('falls back to prefersDark value when theme is system', () => {
    expect(resolveThemeClass('system', true)).toBe('theme-dark');
    expect(resolveThemeClass('system', false)).toBe('theme-light');
  });
});
