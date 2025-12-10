/**
 * Accessibility Utilities
 * Provides helper functions for improving application accessibility
 */

/**
 * Initialize all accessibility features
 */
export function initAccessibility() {
  addSkipLink();
  initAriaAttributes();
  setupKeyboardNavigation();
  setupReducedMotion();
}

/**
 * Add skip to content link at the beginning of the document
 */
function addSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Initialize ARIA attributes for interactive elements
 */
function initAriaAttributes() {
  // Add ARIA attributes to tabs
  document.querySelectorAll('.tablinks').forEach((tab) => {
    const target = tab.getAttribute('data-platform');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', `${target}-tab`);

    // Ensure icons have aria-hidden
    const icon = tab.querySelector('.tab-icon');
    if (icon && !icon.getAttribute('aria-hidden')) {
      icon.setAttribute('aria-hidden', 'true');
    }
  });

  // Add ARIA attributes to tab panels
  document.querySelectorAll('.tabcontent').forEach((panel) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('tabindex', '0');

    const tabId = panel.id.replace('-tab', '');
    const tab = document.querySelector(`[data-platform="${tabId}"]`);
    if (tab) {
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-labelledby', tab.id || `${tabId}-button`);
    }
  });
}

/**
 * Set up keyboard navigation
 */
function setupKeyboardNavigation() {
  // Handle tab key for custom components
  document.addEventListener('keydown', (event) => {
    // Close modal on Escape
    if (event.key === 'Escape') {
      const activeModal = document.querySelector('.modal.show');
      if (activeModal) {
        // Close modal logic here
        activeModal.classList.remove('show');
      }
    }

    // Handle arrow key navigation for tabs
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const currentTab = document.activeElement;

      if (tabs.includes(currentTab)) {
        const currentIndex = tabs.indexOf(currentTab);
        let nextIndex;

        if (event.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % tabs.length;
        } else {
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }

        tabs[nextIndex].focus();
        event.preventDefault();
      }
    }
  });
}

/**
 * Set up reduced motion preference
 */
function setupReducedMotion() {
  // Add reduced motion class if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
  }

  // Listen for changes in the preference
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  });
}

/**
 * Check if two colors have sufficient contrast
 * @param {string} color1 - First color in hex format
 * @param {string} color2 - Second color in hex format
 * @returns {boolean} - True if contrast meets WCAG AA standard
 */
export function hasSufficientContrast(color1, color2) {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  const contrast = (lighter + 0.05) / (darker + 0.05);

  // WCAG AA requires at least 4.5:1 for normal text
  return contrast >= 4.5;
}

/**
 * Calculate relative luminance of a color
 * @private
 */
function getLuminance(color) {
  // Remove # if present
  const hex = color.startsWith('#') ? color.substring(1) : color;

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const [rSrgb, gSrgb, bSrgb] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  // Calculate relative luminance
  return 0.2126 * rSrgb + 0.7152 * gSrgb + 0.0722 * bSrgb;
}

/**
 * Make an element focusable and set up keyboard interaction
 * @param {HTMLElement} element - The element to make focusable
 * @param {Function} onClick - Click handler
 */
export function makeFocusable(element, onClick) {
  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'button');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  element.addEventListener('click', onClick);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
    element.removeEventListener('click', onClick);
  };
}
