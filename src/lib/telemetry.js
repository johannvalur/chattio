const logger = require('./logger');
const { ipcRenderer, ipcMain } = require('electron');

/**
 * Lightweight telemetry service for tracking app performance and reliability metrics
 * All data is stored locally and optionally reported for diagnostics
 */
class TelemetryService {
  constructor() {
    this.events = [];
    this.maxEvents = 1000; // Keep last 1000 events
    this.sessionStartTime = Date.now();
    this.isRenderer = typeof window !== 'undefined';
  }

  /**
   * Track a webview load event
   * @param {string} platform - Platform name
   * @param {number} loadTime - Time taken to load in milliseconds
   * @param {boolean} success - Whether the load was successful
   */
  trackWebviewLoad(platform, loadTime, success) {
    this.recordEvent({
      type: 'webview_load',
      platform,
      loadTime,
      success,
      timestamp: Date.now(),
    });

    if (!success) {
      logger.warn(`WebView load failed for ${platform} after ${loadTime}ms`);
    }
  }

  /**
   * Track a webview recycle event
   * @param {string} platform - Platform name
   * @param {string} reason - Reason for recycling (e.g., 'inactivity', 'memory_pressure', 'manual')
   */
  trackWebviewRecycle(platform, reason) {
    this.recordEvent({
      type: 'webview_recycle',
      platform,
      reason,
      timestamp: Date.now(),
    });

    logger.info(`WebView recycled for ${platform}: ${reason}`);
  }

  /**
   * Track a webview crash or blank page
   * @param {string} platform - Platform name
   * @param {string} errorType - Type of error (e.g., 'crash', 'blank_page', 'load_failed')
   * @param {object} details - Additional error details
   */
  trackWebviewError(platform, errorType, details = {}) {
    this.recordEvent({
      type: 'webview_error',
      platform,
      errorType,
      details,
      timestamp: Date.now(),
    });

    logger.error(`WebView error for ${platform}:`, { errorType, details });
  }

  /**
   * Track an auto-update event
   * @param {string} stage - Update stage (e.g., 'checking', 'available', 'downloaded', 'installed', 'failed')
   * @param {object} details - Additional details (version, error, etc.)
   */
  trackUpdateEvent(stage, details = {}) {
    this.recordEvent({
      type: 'auto_update',
      stage,
      details,
      timestamp: Date.now(),
    });

    logger.info(`Auto-update ${stage}:`, details);
  }

  /**
   * Track memory usage snapshot
   * @param {object} memoryInfo - Memory information from process.memoryUsage()
   */
  trackMemorySnapshot(memoryInfo) {
    this.recordEvent({
      type: 'memory_snapshot',
      memory: {
        heapUsed: memoryInfo.heapUsed,
        heapTotal: memoryInfo.heapTotal,
        external: memoryInfo.external,
        rss: memoryInfo.rss,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Track app performance metrics
   * @param {string} metricName - Name of the metric
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   */
  trackPerformanceMetric(metricName, value, metadata = {}) {
    this.recordEvent({
      type: 'performance_metric',
      metricName,
      value,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a generic event
   * @param {object} event - Event data
   */
  recordEvent(event) {
    this.events.push(event);

    // Trim events if we exceed the max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Send to main process if in renderer
    if (this.isRenderer && ipcRenderer) {
      ipcRenderer.send('telemetry-event', event);
    }
  }

  /**
   * Get all recorded events
   * @param {string} type - Optional: filter by event type
   * @returns {Array} Array of events
   */
  getEvents(type = null) {
    if (type) {
      return this.events.filter((e) => e.type === type);
    }
    return [...this.events];
  }

  /**
   * Get summary statistics
   * @returns {object} Summary statistics
   */
  getSummary() {
    const summary = {
      sessionDuration: Date.now() - this.sessionStartTime,
      totalEvents: this.events.length,
      byType: {},
    };

    // Count events by type
    this.events.forEach((event) => {
      if (!summary.byType[event.type]) {
        summary.byType[event.type] = 0;
      }
      summary.byType[event.type]++;
    });

    // Calculate average webview load times
    const webviewLoads = this.events.filter((e) => e.type === 'webview_load');
    if (webviewLoads.length > 0) {
      const successfulLoads = webviewLoads.filter((e) => e.success);
      summary.webviewStats = {
        totalLoads: webviewLoads.length,
        successfulLoads: successfulLoads.length,
        failedLoads: webviewLoads.length - successfulLoads.length,
        averageLoadTime:
          successfulLoads.reduce((sum, e) => sum + e.loadTime, 0) / successfulLoads.length || 0,
      };
    }

    // Count webview errors
    const webviewErrors = this.events.filter((e) => e.type === 'webview_error');
    if (webviewErrors.length > 0) {
      summary.webviewErrors = {
        total: webviewErrors.length,
        byType: {},
      };
      webviewErrors.forEach((e) => {
        if (!summary.webviewErrors.byType[e.errorType]) {
          summary.webviewErrors.byType[e.errorType] = 0;
        }
        summary.webviewErrors.byType[e.errorType]++;
      });
    }

    // Update statistics
    const updateEvents = this.events.filter((e) => e.type === 'auto_update');
    if (updateEvents.length > 0) {
      summary.updateStats = {
        total: updateEvents.length,
        byStage: {},
      };
      updateEvents.forEach((e) => {
        if (!summary.updateStats.byStage[e.stage]) {
          summary.updateStats.byStage[e.stage] = 0;
        }
        summary.updateStats.byStage[e.stage]++;
      });
    }

    return summary;
  }

  /**
   * Export telemetry data for diagnostics
   * @returns {object} Full telemetry export
   */
  exportData() {
    return {
      sessionStartTime: this.sessionStartTime,
      sessionDuration: Date.now() - this.sessionStartTime,
      events: this.getEvents(),
      summary: this.getSummary(),
      exportedAt: Date.now(),
    };
  }

  /**
   * Clear all recorded events
   */
  clear() {
    this.events = [];
    logger.info('Telemetry data cleared');
  }

  /**
   * Setup IPC handlers (main process only)
   */
  setupMainHandlers() {
    if (this.isRenderer || !ipcMain) return;

    ipcMain.on('telemetry-event', (_, event) => {
      this.recordEvent(event);
    });

    ipcMain.handle('telemetry-get-summary', () => {
      return this.getSummary();
    });

    ipcMain.handle('telemetry-export', () => {
      return this.exportData();
    });

    ipcMain.handle('telemetry-clear', () => {
      this.clear();
      return true;
    });
  }

  /**
   * Request summary from main process (renderer only)
   * @returns {Promise<object>} Summary statistics
   */
  async requestSummary() {
    if (!this.isRenderer || !ipcRenderer) {
      return this.getSummary();
    }
    return ipcRenderer.invoke('telemetry-get-summary');
  }

  /**
   * Request data export from main process (renderer only)
   * @returns {Promise<object>} Full telemetry export
   */
  async requestExport() {
    if (!this.isRenderer || !ipcRenderer) {
      return this.exportData();
    }
    return ipcRenderer.invoke('telemetry-export');
  }
}

// Create singleton instance
const telemetryService = new TelemetryService();

module.exports = telemetryService;
