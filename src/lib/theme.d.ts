/**
 * Resolves the appropriate theme class based on the current theme and system preference
 * @param theme - The current theme ('light', 'dark', or 'system')
 * @param prefersDark - Whether the system prefers dark mode
 * @returns The resolved theme class ('light' or 'dark')
 */
declare function resolveThemeClass(theme: string, prefersDark?: boolean): 'light' | 'dark';

/**
 * Applies the specified theme to the given document
 * @param doc - The document to apply the theme to
 * @param theme - The theme to apply ('light', 'dark', or 'system')
 * @param prefersDark - Whether the system prefers dark mode
 */
declare function applyThemeToDocument(
  doc: Document,
  theme: string,
  prefersDark: boolean
): void;

export { resolveThemeClass, applyThemeToDocument };
