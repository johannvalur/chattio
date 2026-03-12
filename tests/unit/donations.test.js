/**
 * @jest-environment jsdom
 */

const { ipcRenderer } = require('electron');

jest.mock(
  'electron',
  () => ({
    ipcRenderer: {
      send: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      invoke: jest.fn(),
    },
    shell: {
      openExternal: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Donations in settings', () => {
  let renderer;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="settings-shell">
        <div id="settings-donate" class="settings-panel" style="display: block">
          <div class="settings-section-group">
            <div class="settings-cards settings-donation-cards">
              <div class="settings-card-donation" data-tier="tip-jar">
                <button
                  class="settings-donation-cta"
                  type="button"
                  data-donation-button
                  data-amount="$1"
                  data-paypal-link="https://www.paypal.com/donate?hosted_button_id=COFFEE123"
                >
                  Donate
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="support-modal" data-support-modal>
          <div class="support-modal-dialog">
            <div class="support-modal-header">
              <h3>Backing us with <span data-donation-amount>$10</span></h3>
            </div>
            <div class="support-payments">
              <button
                class="support-payment-option"
                type="button"
                data-payment-provider="paypal"
                data-default-href="https://www.paypal.com/donate?hosted_button_id=CUSTOM123"
              >
                <div class="support-payment-copy">
                  <strong>PayPal</strong>
                </div>
              </button>
            </div>
            <div class="support-modal-footer">
              <button class="support-modal-close" type="button" aria-label="Close">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    renderer = require('../../src/renderer');
    // Trigger renderer's DOMContentLoaded handler to wire up donations
    window.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('opens modal with correct amount and uses PayPal link', () => {
    const donateButton = document.querySelector('[data-donation-button]');
    const modal = document.querySelector('[data-support-modal]');
    const amountLabel = modal.querySelector('[data-donation-amount]');
    const paypalOption = modal.querySelector('[data-payment-provider=\"paypal\"]');

    // Click donate button
    donateButton.click();

    expect(modal.classList.contains('open')).toBe(true);
    expect(amountLabel.textContent).toBe('$1');

    // Click PayPal option
    paypalOption.click();

    expect(ipcRenderer.send).toHaveBeenCalledWith(
      'open-external',
      'https://www.paypal.com/donate?hosted_button_id=COFFEE123'
    );
  });
});
