import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

// Extend expect with jest-axe
expect.extend(toHaveNoViolations);

// Configure test timeout
jest.setTimeout(30000);

// Configure test environment
configure({
  testIdAttribute: 'data-testid',
  // Add any additional configuration here
});

// Mock window.matchMedia which is not implemented in JSDOM
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () {
        return false;
      },
    };
  };
