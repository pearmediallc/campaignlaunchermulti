/**
 * App Rotation Service
 *
 * Manages intelligent rotation between main app and backup apps when rate limits are hit.
 * Tracks usage per app and automatically selects the best available app for each request.
 *
 * Features:
 * - Automatic rotation when 429 errors detected
 * - Usage tracking per app per hour
 * - Automatic reset every hour
 * - Priority-based app selection
 * - Real-time availability checking
 */

const { getBackupApps, validateBackupApps } = require('../config/backupApps');
const { encryptToken, decryptToken } = require('../utils/encryption');

class AppRotationService {
  constructor() {
    // Validate backup apps configuration on startup
    const validation = validateBackupApps();
    if (!validation.isValid) {
      console.error('❌ Backup apps configuration validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      throw new Error('Invalid backup apps configuration');
    }

    this.apps = getBackupApps();
    this.usage = {}; // Track usage per app: { appId: callCount }
    this.exhaustedApps = new Set(); // Track which apps hit 429
    this.exhaustionTimestamps = {}; // Track when each app was marked exhausted
    this.resetTime = Date.now() + 3600000; // Reset counters every hour
    this.lastResetDate = new Date();

    // Initialize usage counters
    this.apps.forEach(app => {
      this.usage[app.appId] = 0;
      this.exhaustionTimestamps[app.appId] = null;
    });

    console.log('✅ AppRotationService initialized');
    console.log(`   - Total apps: ${this.apps.length}`);
    console.log(`   - Backup apps: ${this.apps.filter(a => a.isBackup).length}`);
    console.log(`   - Total capacity: ${this.getTotalCapacity()} calls/hour`);
  }

  /**
   * Get the next available app based on priority and usage
   * @param {string} userAccessToken - Optional user OAuth token for main app
   * @returns {Object|null} Next available app or null if all exhausted
   */
  getNextAvailableApp(userAccessToken = null) {
    // Reset counters if hour has passed
    this.resetUsageCountersIfNeeded();

    // Filter out exhausted apps
    let availableApps = this.apps.filter(app => {
      const isNotExhausted = !this.exhaustedApps.has(app.appId);
      const hasCapacity = this.usage[app.appId] < app.rateLimit;
      return isNotExhausted && hasCapacity;
    });

    if (availableApps.length === 0) {
      console.warn('⚠️ All apps exhausted - no available apps');
      return null;
    }

    // Sort by priority (lower number = higher priority)
    availableApps.sort((a, b) => a.priority - b.priority);

    // Get the top priority app
    const selectedApp = availableApps[0];

    // If it's the main app, inject user's OAuth token
    if (selectedApp.appId === 'main_app' && userAccessToken) {
      return {
        ...selectedApp,
        accessToken: userAccessToken
      };
    }

    return selectedApp;
  }

  /**
   * Track that an API call was made using a specific app
   * @param {string} appId - The app ID that made the call
   */
  trackApiCall(appId) {
    if (!this.usage[appId]) {
      this.usage[appId] = 0;
    }
    this.usage[appId]++;

    const app = this.apps.find(a => a.appId === appId);
    const percentage = app ? Math.round((this.usage[appId] / app.rateLimit) * 100) : 0;

    console.log(`📊 API call tracked: ${app?.name || appId} (${this.usage[appId]}/${app?.rateLimit || '?'} calls, ${percentage}%)`);
  }

  /**
   * Mark an app as exhausted (hit 429 rate limit)
   * @param {string} appId - The app ID that hit rate limit
   */
  markAppExhausted(appId) {
    this.exhaustedApps.add(appId);
    this.exhaustionTimestamps[appId] = Date.now();
    const app = this.apps.find(a => a.appId === appId);

    if (app) {
      this.usage[appId] = app.rateLimit; // Max out the usage counter
      console.warn(`⚠️ App marked as exhausted: ${app.name} (${appId})`);
    }

    // Detect if this is likely an ad account limit (multiple apps exhausted within 10 seconds)
    this.detectAdAccountLimit();
  }

  /**
   * Detect if rate limit is at ad account level (not app level)
   * If all apps are marked exhausted within a short time window, it's likely the ad account limit
   */
  detectAdAccountLimit() {
    const now = Date.now();
    const recentExhaustionWindow = 10000; // 10 seconds

    const recentlyExhaustedApps = this.apps.filter(app => {
      const timestamp = this.exhaustionTimestamps[app.appId];
      return timestamp && (now - timestamp) < recentExhaustionWindow;
    });

    // If 2 or more apps exhausted within 10 seconds, likely ad account limit
    if (recentlyExhaustedApps.length >= 2) {
      console.error('');
      console.error('🚨 AD ACCOUNT RATE LIMIT DETECTED 🚨');
      console.error('   Multiple apps failed within 10 seconds - this indicates ad account limit, not app-level limit');
      console.error('   Ad account limit: ~5000 calls/hour SHARED across all apps');
      console.error('   App rotation cannot solve this - all apps access the same ad account');
      console.error('   Recommendation: Wait for hourly reset or implement request queuing');
      console.error('');
    }
  }

  /**
   * Reset usage counters if an hour has passed
   */
  resetUsageCountersIfNeeded() {
    const now = Date.now();

    if (now >= this.resetTime) {
      console.log('🔄 Resetting rate limit counters (1 hour passed)');

      // Reset all counters
      this.apps.forEach(app => {
        this.usage[app.appId] = 0;
        this.exhaustionTimestamps[app.appId] = null;
      });

      // Clear exhausted apps
      this.exhaustedApps.clear();

      // Set next reset time
      this.resetTime = now + 3600000;
      this.lastResetDate = new Date();

      console.log(`✅ Counters reset complete. Next reset at: ${new Date(this.resetTime).toLocaleString()}`);
    }
  }

  /**
   * Manually reset all usage counters (for testing or admin intervention)
   */
  forceResetCounters() {
    console.log('🔧 Force resetting rate limit counters...');

    this.apps.forEach(app => {
      this.usage[app.appId] = 0;
      this.exhaustionTimestamps[app.appId] = null;
    });

    this.exhaustedApps.clear();
    this.resetTime = Date.now() + 3600000;
    this.lastResetDate = new Date();

    console.log('✅ Force reset complete');
  }

  /**
   * Get current status of all apps
   * @returns {Array} Array of app status objects
   */
  getAppsStatus() {
    return this.apps.map(app => {
      const usage = this.usage[app.appId] || 0;
      const isExhausted = this.exhaustedApps.has(app.appId);
      const percentage = Math.round((usage / app.rateLimit) * 100);

      let status = 'available';
      if (isExhausted) {
        status = 'exhausted';
      } else if (percentage >= 90) {
        status = 'warning';
      } else if (usage > 0) {
        status = 'active';
      }

      return {
        appId: app.appId,
        name: app.name,
        type: app.type,
        priority: app.priority,
        isBackup: app.isBackup,
        usage: usage,
        rateLimit: app.rateLimit,
        percentage: percentage,
        remaining: app.rateLimit - usage,
        status: status,
        isExhausted: isExhausted
      };
    });
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const status = this.getAppsStatus();
    const totalUsage = status.reduce((sum, app) => sum + app.usage, 0);
    const totalCapacity = this.getTotalCapacity();
    const availableApps = status.filter(app => app.status === 'available' || app.status === 'active' || app.status === 'warning').length;

    const now = Date.now();
    const timeUntilReset = this.resetTime - now;
    const minutesUntilReset = Math.max(0, Math.floor(timeUntilReset / 60000));

    return {
      totalApps: this.apps.length,
      availableApps: availableApps,
      exhaustedApps: this.exhaustedApps.size,
      totalUsage: totalUsage,
      totalCapacity: totalCapacity,
      usagePercentage: Math.round((totalUsage / totalCapacity) * 100),
      remaining: totalCapacity - totalUsage,
      minutesUntilReset: minutesUntilReset,
      lastResetDate: this.lastResetDate,
      nextResetDate: new Date(this.resetTime)
    };
  }

  /**
   * Get total API capacity across all apps
   * @returns {number} Total calls per hour
   */
  getTotalCapacity() {
    return this.apps.reduce((total, app) => total + app.rateLimit, 0);
  }

  /**
   * Check if a specific app is available
   * @param {string} appId - The app ID to check
   * @returns {boolean} True if app is available
   */
  isAppAvailable(appId) {
    const app = this.apps.find(a => a.appId === appId);
    if (!app) return false;

    const isNotExhausted = !this.exhaustedApps.has(appId);
    const hasCapacity = this.usage[appId] < app.rateLimit;

    return isNotExhausted && hasCapacity;
  }

  /**
   * Get remaining capacity for a specific app
   * @param {string} appId - The app ID
   * @returns {number} Remaining calls available
   */
  getRemainingCapacity(appId) {
    const app = this.apps.find(a => a.appId === appId);
    if (!app) return 0;

    const usage = this.usage[appId] || 0;
    return Math.max(0, app.rateLimit - usage);
  }
}

// Export singleton instance
const appRotationService = new AppRotationService();

module.exports = appRotationService;
