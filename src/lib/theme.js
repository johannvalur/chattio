function resolveThemeClass(theme, prefersDark = false) {
  if (theme === 'dark') return 'theme-dark';
  if (theme === 'light') return 'theme-light';
  return prefersDark ? 'theme-dark' : 'theme-light';
}

function applyThemeToDocument(doc, theme, prefersDark) {
  if (!doc || !doc.body) {
    throw new Error('Document with body is required to apply theme');
  }
  const className = resolveThemeClass(
    theme,
    typeof prefersDark === 'boolean'
      ? prefersDark
      : typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  doc.body.classList.remove('theme-light', 'theme-dark');
  doc.body.classList.add(className);
  return className;
}

module.exports = {
  resolveThemeClass,
  applyThemeToDocument,
};
