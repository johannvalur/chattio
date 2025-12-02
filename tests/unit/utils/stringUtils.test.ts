/**
 * @jest-environment jsdom
 */

describe('String Utilities', () => {
  describe('truncate', () => {
    it('should truncate string with default length', () => {
      const result = truncate('This is a long string that needs to be truncated');
      expect(result).toBe('This is a long string...');
    });

    it('should truncate string with custom length', () => {
      const result = truncate('Short string', 5);
      expect(result).toBe('Short...');
    });

    it('should not truncate string shorter than max length', () => {
      const result = truncate('Short', 10);
      expect(result).toBe('Short');
    });
  });

  describe('capitalize', () => {
    it('should capitalize the first letter of a string', () => {
      const result = capitalize('hello');
      expect(result).toBe('Hello');
    });

    it('should handle empty string', () => {
      const result = capitalize('');
      expect(result).toBe('');
    });
  });
});

// Utility functions for testing
function truncate(str: string, maxLength: number = 20): string {
  if (!str) return '';
  return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
