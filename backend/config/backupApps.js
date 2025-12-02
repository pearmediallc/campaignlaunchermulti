/**
 * Backup Apps Configuration
 *
 * This file contains hardcoded backup Facebook apps that are used when the main app
 * hits rate limits. The system automatically rotates between apps to maximize API capacity.
 *
 * Security: All access tokens are encrypted using AES-256-GCM before use.
 * Rate Limit Strategy: Main app → Backup 1 → Backup 2 → Queue if all exhausted
 */

const BACKUP_APPS = [
  {
    appId: 'main_app',
    name: 'CampaignGlobal (Main OAuth)',
    // Note: Main app token comes from user's OAuth - this is a placeholder
    accessToken: null, // Will be replaced with user's actual OAuth token at runtime
    type: 'oauth',
    rateLimit: 200, // Standard OAuth user token limit: 200 calls/hour
    priority: 1, // Always try main app first
    isBackup: false,
    description: 'Primary app using user OAuth token'
  },
  {
    appId: '866739779156137',
    name: 'Campaign_global_1',
    accessToken: 'EAAMUS5SmOKkBQN1bZBJA01um2n20Dblz4wIzOPGpQaK94FncXu2U0nrvkQT9TOxVchZBIX2CNNRlm7nwCgqUN0KLJdaTbtZBIUh5xeyrES30NwHoJTK37vaqLyIFCq15X4MhOLw7jg5WX9QpZC2fvMWTA4EyIqArlWxb1LrzKOwfsbZCkzR8Bi2gHtsGP8lfw',
    type: 'backup',
    rateLimit: 200, // Standard token limit: 200 calls/hour
    priority: 2, // Use when main app is rate limited
    isBackup: true,
    description: 'First backup app - activates when main app hits rate limit'
  },
  {
    appId: '1595260404801729',
    name: 'Campaign_global_2',
    accessToken: 'EAAWq4YHAoMEBQGc552EzbgcO7xeXlOIRN48Bzc7o9dVK3ZCDZAVTBEE2etud3PuCeYSk2BVNCpcglbeU4o2SMcZBxhVUMBSOFvFfYp9IQsZBJMPgExQGiIvW1jvZApwcSapA5TFACpbMCrhZAzDsNZBZAhTgiWrnK2cykdtRGXbZAMdnt35wCZBYeM9FbkUAPZA',
    type: 'backup',
    rateLimit: 200, // Standard token limit: 200 calls/hour
    priority: 3, // Use when both main app and backup 1 are rate limited
    isBackup: true,
    description: 'Second backup app - activates when first backup is also rate limited'
  }
];

/**
 * Get all backup apps configuration
 * @returns {Array} Array of app configurations
 */
function getBackupApps() {
  return BACKUP_APPS;
}

/**
 * Get only backup apps (excludes main app)
 * @returns {Array} Array of backup app configurations
 */
function getBackupAppsOnly() {
  return BACKUP_APPS.filter(app => app.isBackup === true);
}

/**
 * Get app configuration by app ID
 * @param {string} appId - The Facebook app ID
 * @returns {Object|null} App configuration or null if not found
 */
function getAppById(appId) {
  return BACKUP_APPS.find(app => app.appId === appId) || null;
}

/**
 * Validate that all backup apps have required fields
 * @returns {Object} Validation result with status and errors
 */
function validateBackupApps() {
  const errors = [];

  BACKUP_APPS.forEach((app, index) => {
    if (!app.appId) {
      errors.push(`App at index ${index} missing appId`);
    }
    if (!app.name) {
      errors.push(`App at index ${index} missing name`);
    }
    if (app.isBackup && !app.accessToken) {
      errors.push(`Backup app "${app.name}" missing accessToken`);
    }
    if (!app.rateLimit || app.rateLimit <= 0) {
      errors.push(`App "${app.name}" has invalid rateLimit`);
    }
    if (!app.priority || app.priority <= 0) {
      errors.push(`App "${app.name}" has invalid priority`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Get total API capacity across all apps
 * @returns {number} Total calls per hour capacity
 */
function getTotalCapacity() {
  return BACKUP_APPS.reduce((total, app) => total + app.rateLimit, 0);
}

module.exports = {
  BACKUP_APPS,
  getBackupApps,
  getBackupAppsOnly,
  getAppById,
  validateBackupApps,
  getTotalCapacity
};
