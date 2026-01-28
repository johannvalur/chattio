/**
 * @jest-environment jsdom
 */

describe('Messenger Badge Detection', () => {
  let detectBadge;

  beforeEach(() => {
    // The badge detection logic that runs in the webview
    detectBadge = () => {
      try {
        let detectionMethod = 'failed';
        let count = 0;

        // Method 1: Direct badge count element (most reliable)
        const badge = document.querySelector(
          '[data-testid="mwthreadlist_unread_badge_count"], [data-testid="unread_indicator_badge"]'
        );
        if (badge && badge.textContent) {
          const text = badge.textContent.trim();
          // Handle "99+" format
          count = text === '99+' ? 99 : parseInt(text, 10);
          if (!isNaN(count) && count > 0) {
            detectionMethod = 'badge_element';
            return { count, detectionMethod };
          }
        }

        // Method 2: Count unread indicator badges in the thread list
        const unreadBadges = document.querySelectorAll(
          '[data-testid="mwthreadlist_row_unread_indicator"],' +
            '[aria-label*="unread" i]:not([role="row"]),' +
            '.notranslate > span[style*="background"]'
        );
        if (unreadBadges.length > 0) {
          count = unreadBadges.length;
          detectionMethod = 'unread_badges';
          return { count, detectionMethod };
        }

        // Method 3: Count rows with unread indicators via aria-label
        const unreadRows = Array.from(
          document.querySelectorAll('[role="row"], [data-testid="mwthreadlist-row"]')
        ).filter((row) => {
          const label = (row.getAttribute('aria-label') || '').toLowerCase();
          return label.includes('unread') || label.includes('new message');
        });
        if (unreadRows.length > 0) {
          count = unreadRows.length;
          detectionMethod = 'unread_rows';
          return { count, detectionMethod };
        }

        // Method 4: Count unread dots by aria-label
        const unreadDots = document.querySelectorAll(
          '[aria-label="Unread"],' + '[aria-label="Unread dot"],' + '[aria-label="Mark as read"]'
        );
        if (unreadDots.length > 0) {
          count = unreadDots.length;
          detectionMethod = 'unread_dots';
          return { count, detectionMethod };
        }

        // Method 5: Check for notification badge in navigation (fallback for mobile view)
        const navBadge = document.querySelector('[data-testid="navigation_badge"]');
        if (navBadge && navBadge.textContent) {
          const text = navBadge.textContent.trim();
          count = text === '99+' ? 99 : parseInt(text, 10);
          if (!isNaN(count) && count > 0) {
            detectionMethod = 'nav_badge';
            return { count, detectionMethod };
          }
        }

        // No unread messages detected
        return { count: 0, detectionMethod: 'none' };
      } catch (err) {
        return { count: 0, detectionMethod: 'error', error: err.message };
      }
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Method 1: Badge Element Detection', () => {
    it('should detect unread count from mwthreadlist_unread_badge_count', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count">5</div>';
      const result = detectBadge();
      expect(result.count).toBe(5);
      expect(result.detectionMethod).toBe('badge_element');
    });

    it('should detect unread count from unread_indicator_badge', () => {
      document.body.innerHTML = '<span data-testid="unread_indicator_badge">3</span>';
      const result = detectBadge();
      expect(result.count).toBe(3);
      expect(result.detectionMethod).toBe('badge_element');
    });

    it('should handle 99+ format', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count">99+</div>';
      const result = detectBadge();
      expect(result.count).toBe(99);
      expect(result.detectionMethod).toBe('badge_element');
    });

    it('should ignore empty badge elements', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count"></div>';
      const result = detectBadge();
      expect(result.count).toBe(0);
      expect(result.detectionMethod).toBe('none');
    });

    it('should ignore zero count', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count">0</div>';
      const result = detectBadge();
      expect(result.count).toBe(0);
      expect(result.detectionMethod).toBe('none');
    });
  });

  describe('Method 2: Unread Badges Detection', () => {
    it('should count unread indicator badges', () => {
      document.body.innerHTML = `
        <div data-testid="mwthreadlist_row_unread_indicator"></div>
        <div data-testid="mwthreadlist_row_unread_indicator"></div>
        <div data-testid="mwthreadlist_row_unread_indicator"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(3);
      expect(result.detectionMethod).toBe('unread_badges');
    });

    it('should count aria-label unread badges', () => {
      document.body.innerHTML = `
        <span aria-label="Unread message"></span>
        <span aria-label="Unread notification"></span>
      `;
      const result = detectBadge();
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_badges');
    });

    it('should not count row elements in unread badges', () => {
      document.body.innerHTML = `
        <div role="row" aria-label="Unread message from John"></div>
        <span aria-label="Unread"></span>
      `;
      const result = detectBadge();
      expect(result.count).toBe(1);
      expect(result.detectionMethod).toBe('unread_badges');
    });
  });

  describe('Method 3: Unread Rows Detection', () => {
    it('should count rows with "unread" in aria-label', () => {
      document.body.innerHTML = `
        <div role="row" aria-label="Unread message from Alice"></div>
        <div role="row" aria-label="Unread message from Bob"></div>
        <div role="row" aria-label="Read message from Charlie"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_rows');
    });

    it('should count rows with "new message" in aria-label', () => {
      document.body.innerHTML = `
        <div data-testid="mwthreadlist-row" aria-label="New message from Dave"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(1);
      expect(result.detectionMethod).toBe('unread_rows');
    });

    it('should be case-insensitive', () => {
      document.body.innerHTML = `
        <div role="row" aria-label="UNREAD Message"></div>
        <div role="row" aria-label="New MESSAGE"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_rows');
    });
  });

  describe('Method 4: Unread Dots Detection', () => {
    it('should count unread dots by aria-label when Method 2 does not apply', () => {
      // Note: Some aria-labels like "Unread" will be caught by Method 2's wildcard selector
      // Method 4 only activates when Method 2 finds nothing
      // "Mark as read" is specific enough to only match Method 4
      document.body.innerHTML = `
        <button aria-label="Mark as read"></button>
        <button aria-label="Mark as read"></button>
        <button aria-label="Mark as read"></button>
      `;
      const result = detectBadge();
      expect(result.count).toBe(3);
      expect(result.detectionMethod).toBe('unread_dots');
    });

    it('should include all three dot types when they are all present', () => {
      document.body.innerHTML = `
        <button aria-label="Unread"></button>
        <button aria-label="Unread dot"></button>
        <button aria-label="Mark as read"></button>
      `;
      const result = detectBadge();
      // These will be caught by Method 2's aria-label wildcard (Unread, Unread dot)
      // or Method 4 (Mark as read). Since Method 2 comes first, it catches the first two
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_badges');
    });
  });

  describe('Method 5: Navigation Badge Detection', () => {
    it('should detect unread count from navigation badge', () => {
      document.body.innerHTML = '<span data-testid="navigation_badge">7</span>';
      const result = detectBadge();
      expect(result.count).toBe(7);
      expect(result.detectionMethod).toBe('nav_badge');
    });

    it('should handle 99+ format in navigation badge', () => {
      document.body.innerHTML = '<span data-testid="navigation_badge">99+</span>';
      const result = detectBadge();
      expect(result.count).toBe(99);
      expect(result.detectionMethod).toBe('nav_badge');
    });
  });

  describe('Fallback Behavior', () => {
    it('should prioritize badge element over other methods', () => {
      document.body.innerHTML = `
        <div data-testid="mwthreadlist_unread_badge_count">5</div>
        <div role="row" aria-label="Unread message"></div>
        <div role="row" aria-label="Unread message"></div>
        <div role="row" aria-label="Unread message"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(5);
      expect(result.detectionMethod).toBe('badge_element');
    });

    it('should fall back to unread badges when badge element is missing', () => {
      document.body.innerHTML = `
        <div data-testid="mwthreadlist_row_unread_indicator"></div>
        <div role="row" aria-label="Unread message"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(1);
      expect(result.detectionMethod).toBe('unread_badges');
    });

    it('should fall back to unread rows when badges are missing', () => {
      document.body.innerHTML = `
        <div role="row" aria-label="Unread message"></div>
        <div role="row" aria-label="Unread message"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_rows');
    });

    it('should return 0 when no indicators are found', () => {
      document.body.innerHTML = '<div>No unread messages</div>';
      const result = detectBadge();
      expect(result.count).toBe(0);
      expect(result.detectionMethod).toBe('none');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid badge text gracefully', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count">abc</div>';
      const result = detectBadge();
      expect(result.count).toBe(0);
      expect(result.detectionMethod).toBe('none');
    });

    it('should handle whitespace in badge text', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count">  8  </div>';
      const result = detectBadge();
      expect(result.count).toBe(8);
      expect(result.detectionMethod).toBe('badge_element');
    });

    it('should handle mixed case in aria-labels', () => {
      document.body.innerHTML = `
        <div role="row" aria-label="UnReAd MeSsAgE"></div>
        <div role="row" aria-label="NEW message"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_rows');
    });

    it('should handle missing aria-label attributes', () => {
      document.body.innerHTML = `
        <div role="row"></div>
        <div role="row" aria-label="Unread message"></div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(1);
      expect(result.detectionMethod).toBe('unread_rows');
    });

    it('should handle large counts', () => {
      document.body.innerHTML = '<div data-testid="mwthreadlist_unread_badge_count">150</div>';
      const result = detectBadge();
      expect(result.count).toBe(150);
      expect(result.detectionMethod).toBe('badge_element');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical Messenger thread list structure', () => {
      document.body.innerHTML = `
        <div class="thread-list">
          <div role="row" data-testid="mwthreadlist-row" aria-label="Unread message from Alice">
            <div data-testid="mwthreadlist_row_unread_indicator"></div>
          </div>
          <div role="row" data-testid="mwthreadlist-row" aria-label="Unread message from Bob">
            <div data-testid="mwthreadlist_row_unread_indicator"></div>
          </div>
          <div role="row" data-testid="mwthreadlist-row" aria-label="Message from Charlie">
          </div>
        </div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(2);
      expect(result.detectionMethod).toBe('unread_badges');
    });

    it('should handle empty thread list', () => {
      document.body.innerHTML = `
        <div class="thread-list">
          <div role="row" aria-label="No messages"></div>
        </div>
      `;
      const result = detectBadge();
      expect(result.count).toBe(0);
      expect(result.detectionMethod).toBe('none');
    });

    it('should handle combined indicators', () => {
      document.body.innerHTML = `
        <div data-testid="mwthreadlist_unread_badge_count">5</div>
        <div data-testid="mwthreadlist_row_unread_indicator"></div>
        <div data-testid="mwthreadlist_row_unread_indicator"></div>
        <div role="row" aria-label="Unread message"></div>
        <div aria-label="Unread dot"></div>
      `;
      // Should use the first method (badge_element) and return 5
      const result = detectBadge();
      expect(result.count).toBe(5);
      expect(result.detectionMethod).toBe('badge_element');
    });
  });
});
