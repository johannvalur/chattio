const { ipcRenderer: _ipcRenderer } = require('electron');
const { PLATFORMS } = require('../../lib/config');
const _appState = require('../state/appState');
const _unreadState = require('../state/unreadState');
const _logger = require('../../lib/logger');

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const buttonRefs = new Map();

function createPlatformButton(platform, config) {
  const button = document.createElement('button');
  button.className = 'sidebar-button';
  button.dataset.platform = platform;
  button.title = config.name;
  button.innerHTML = `
    <img src="../public/icons/${platform}.svg" alt="${config.name}" />
    <span class="tooltip">${config.name}</span>
  `;

  button.addEventListener('click', (e) => {
    e.preventDefault();
    window.openTab(e, platform);
  });

  // Store reference for drag and drop
  buttonRefs.set(platform, button);

  return button;
}

function updateButtonStates() {
  buttonRefs.forEach((btn, platform) => {
    const isEnabled = _appState.apps[platform]?.enabled !== false;
    btn.style.display = isEnabled ? '' : 'none';
  });
}

function setupSidebarDragAndDrop() {
  let draggedButton = null;
  let dragOverTimeout = null;

  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const handleDragStart = (e) => {
    draggedButton = e.target.closest('.sidebar-button');
    if (!draggedButton) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedButton.dataset.platform);

    // Add visual feedback
    setTimeout(() => {
      draggedButton.classList.add('dragging');
    }, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedButton) return;

    const targetButton = e.target.closest('.sidebar-button');
    if (!targetButton || targetButton === draggedButton) return;

    // Clear any existing timeout
    if (dragOverTimeout) {
      clearTimeout(dragOverTimeout);
      dragOverTimeout = null;
    }

    // Add visual feedback for drop target
    const rect = targetButton.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isBefore = e.clientY < midpoint;

    targetButton.classList.add(isBefore ? 'drop-before' : 'drop-after');

    // Set a timeout to actually move the item
    dragOverTimeout = setTimeout(() => {
      if (isBefore) {
        sidebar.insertBefore(draggedButton, targetButton);
      } else {
        sidebar.insertBefore(draggedButton, targetButton.nextSibling);
      }
      saveSidebarOrder();
      targetButton.classList.remove('drop-before', 'drop-after');
    }, 300);
  };

  const handleDragEnd = () => {
    if (dragOverTimeout) {
      clearTimeout(dragOverTimeout);
      dragOverTimeout = null;
    }

    if (draggedButton) {
      draggedButton.classList.remove('dragging');

      // Remove any leftover drop indicators
      document.querySelectorAll('.sidebar-button').forEach((btn) => {
        btn.classList.remove('drop-before', 'drop-after');
      });

      draggedButton = null;
    }
  };

  // Add event listeners
  sidebar.addEventListener('dragstart', handleDragStart);
  sidebar.addEventListener('dragover', handleDragOver);
  sidebar.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('sidebar-button')) {
      e.target.classList.remove('drop-before', 'drop-after');
    }
  });
  document.addEventListener('dragend', handleDragEnd);

  // Make buttons draggable
  document.querySelectorAll('.sidebar-button').forEach((button) => {
    button.draggable = true;
  });
}

function saveSidebarOrder() {
  const buttons = Array.from(buttonRefs.values())
    .filter((btn) => btn.style.display !== 'none')
    .map((btn) => btn.dataset.platform);

  // Update _appState with new order
  _appState.order = buttons;

  // Save to storage
  localStorage.setItem('chatterly-sidebar-order', JSON.stringify(buttons));
}

function renderSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Clear existing buttons (except welcome and settings)
  const existingButtons = sidebar.querySelectorAll(
    '.sidebar-button:not([data-platform="welcome"]):not([data-platform="settings"])'
  );
  existingButtons.forEach((btn) => btn.remove());

  // Get saved order or use default
  const savedOrder = JSON.parse(localStorage.getItem('chatterly-sidebar-order') || '[]');
  const orderedPlatforms = savedOrder.filter((platform) => PLATFORM_KEYS.includes(platform));
  const remainingPlatforms = PLATFORM_KEYS.filter((platform) => !savedOrder.includes(platform));
  const finalOrder = [...orderedPlatforms, ...remainingPlatforms];

  // Create and append buttons in order
  finalOrder.forEach((platform) => {
    if (_appState.apps[platform]?.enabled !== false) {
      const button = createPlatformButton(platform, PLATFORMS[platform]);
      sidebar.insertBefore(button, document.querySelector('.settings-button'));
      buttonRefs.set(platform, button);
    }
  });

  // Set up drag and drop
  setupSidebarDragAndDrop();

  // Update button states
  updateButtonStates();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderSidebar);
} else {
  renderSidebar();
}

module.exports = {
  renderSidebar,
  updateButtonStates,
  getButtonRefs: () => buttonRefs,
};
