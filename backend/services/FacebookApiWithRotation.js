/**
 * Facebook API with Automatic App Rotation
 *
 * This service wraps all Facebook Graph API calls and automatically rotates between
 * main app and backup apps when rate limits are hit.
 *
 * Features:
 * - Automatic 429 detection and app rotation
 * - Retry logic with exponential backoff
 * - Token validation before API calls
 * - Comprehensive error handling
 * - Usage tracking per app
 * - Queue requests when all apps exhausted
 *
 * Usage:
 *   const fbApi = require('./FacebookApiWithRotation');
 *   const data = await fbApi.get('me/campaigns', { fields: 'id,name' }, userAccessToken);
 */

const axios = require('axios');
const appRotationService = require('./AppRotationService');
const { decryptToken } = require('../utils/encryption');
const {
  AllAppsExhaustedError,
  FacebookApiError,
  InvalidTokenError,
  isRateLimitError,
  isInvalidTokenError,
  parseFacebookError
} = require('../utils/customErrors');

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v19.0';
const MAX_RETRY_ATTEMPTS = 3; // Try up to 3 apps before giving up
const REQUEST_TIMEOUT = 30000; // 30 seconds

class FacebookApiWithRotation {
  constructor() {
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.rotationCount = 0;
  }

  /**
   * Make a Facebook API call with automatic app rotation
   *
   * @param {string} endpoint - API endpoint (e.g., 'me/campaigns' or '123456/adsets')
   * @param {Object} params - Query parameters
   * @param {string} method - HTTP method (GET, POST, DELETE, PUT)
   * @param {Object} data - Request body for POST/PUT requests
   * @param {string} userAccessToken - User's OAuth access token (for main app)
   * @param {number} attempt - Current retry attempt (internal use)
   * @returns {Promise<Object>} API response data
   * @throws {AllAppsExhaustedError} When all apps are rate limited
   * @throws {FacebookApiError} For other Facebook API errors
   */
  async makeApiCall(endpoint, params = {}, method = 'GET', data = null, userAccessToken = null, attempt = 0) {
    this.requestCount++;

    // Get next available app
    const app = appRotationService.getNextAvailableApp(userAccessToken);

    if (!app) {
      // All apps exhausted
      console.error('❌ All apps exhausted - no available apps for API call');
      throw new AllAppsExhaustedError('All apps have been rate limited. Request will be queued.', {
        endpoint,
        attempt,
        summary: appRotationService.getSummary()
      });
    }

    // Decrypt token if needed
    let accessToken = app.accessToken;
    if (app.isBackup && accessToken) {
      try {
        accessToken = decryptToken(accessToken);
      } catch (error) {
        console.error(`❌ Failed to decrypt token for ${app.name}:`, error.message);
        // Mark app as unavailable and retry with next app
        appRotationService.markAppExhausted(app.appId);
        if (attempt < MAX_RETRY_ATTEMPTS) {
          return this.makeApiCall(endpoint, params, method, data, userAccessToken, attempt + 1);
        }
        throw error;
      }
    }

    // Validate token exists
    if (!accessToken) {
      throw new InvalidTokenError('No access token available', app.name);
    }

    // Build request config
    const config = {
      method: method.toUpperCase(),
      url: `${FACEBOOK_API_BASE}/${endpoint}`,
      timeout: REQUEST_TIMEOUT,
      params: {
        ...params,
        access_token: accessToken
      }
    };

    // Add request body for POST/PUT
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    // Log the API call
    const startTime = Date.now();
    console.log(`🔵 [${app.name}] ${method} /${endpoint} (Attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);

    try {
      // Make the API call
      const response = await axios(config);
      const duration = Date.now() - startTime;

      // Track successful call
      appRotationService.trackApiCall(app.appId);
      this.successCount++;

      console.log(`✅ [${app.name}] Success in ${duration}ms`);

      return response.data;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.failureCount++;

      // Handle rate limit error (429)
      if (isRateLimitError(error)) {
        console.warn(`⚠️ [${app.name}] Rate limit hit after ${duration}ms`);

        // Mark this app as exhausted
        appRotationService.markAppExhausted(app.appId);
        this.rotationCount++;

        // Retry with next available app
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          console.log(`🔄 Rotating to next available app... (Attempt ${attempt + 2}/${MAX_RETRY_ATTEMPTS})`);
          return this.makeApiCall(endpoint, params, method, data, userAccessToken, attempt + 1);
        } else {
          // All retry attempts exhausted
          console.error(`❌ All ${MAX_RETRY_ATTEMPTS} apps tried and exhausted`);
          throw new AllAppsExhaustedError('All apps have been rate limited', {
            endpoint,
            attempts: MAX_RETRY_ATTEMPTS,
            summary: appRotationService.getSummary()
          });
        }
      }

      // Handle invalid token error (401)
      if (isInvalidTokenError(error)) {
        console.error(`❌ [${app.name}] Invalid or expired token`);

        // If this is a backup app, mark it as exhausted and try next app
        if (app.isBackup && attempt < MAX_RETRY_ATTEMPTS - 1) {
          appRotationService.markAppExhausted(app.appId);
          console.log(`🔄 Token invalid, rotating to next app...`);
          return this.makeApiCall(endpoint, params, method, data, userAccessToken, attempt + 1);
        }

        throw new InvalidTokenError(
          error.response?.data?.error?.message || 'Access token is invalid or expired',
          app.name
        );
      }

      // Handle other Facebook API errors
      if (error.response?.data?.error) {
        const fbError = parseFacebookError(error.response);
        console.error(`❌ [${app.name}] Facebook API Error: ${fbError.message}`);
        throw fbError;
      }

      // Handle network/timeout errors
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error(`❌ [${app.name}] Request timeout after ${REQUEST_TIMEOUT}ms`);

        // Retry with same or next app
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          console.log(`🔄 Retrying after timeout...`);
          await this.sleep(1000 * (attempt + 1)); // Exponential backoff
          return this.makeApiCall(endpoint, params, method, data, userAccessToken, attempt + 1);
        }

        throw new FacebookApiError(`Request timeout after ${REQUEST_TIMEOUT}ms`);
      }

      // Re-throw unknown errors
      console.error(`❌ [${app.name}] Unknown error:`, error.message);
      throw error;
    }
  }

  /**
   * Convenience method for GET requests
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {string} userAccessToken - User's OAuth token (optional)
   * @returns {Promise<Object>} API response data
   */
  async get(endpoint, params = {}, userAccessToken = null) {
    return this.makeApiCall(endpoint, params, 'GET', null, userAccessToken);
  }

  /**
   * Convenience method for POST requests
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} params - Query parameters
   * @param {string} userAccessToken - User's OAuth token (optional)
   * @returns {Promise<Object>} API response data
   */
  async post(endpoint, data = {}, params = {}, userAccessToken = null) {
    return this.makeApiCall(endpoint, params, 'POST', data, userAccessToken);
  }

  /**
   * Convenience method for DELETE requests
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {string} userAccessToken - User's OAuth token (optional)
   * @returns {Promise<Object>} API response data
   */
  async delete(endpoint, params = {}, userAccessToken = null) {
    return this.makeApiCall(endpoint, params, 'DELETE', null, userAccessToken);
  }

  /**
   * Convenience method for PUT requests
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} params - Query parameters
   * @param {string} userAccessToken - User's OAuth token (optional)
   * @returns {Promise<Object>} API response data
   */
  async put(endpoint, data = {}, params = {}, userAccessToken = null) {
    return this.makeApiCall(endpoint, params, 'PUT', data, userAccessToken);
  }

  /**
   * Sleep utility for exponential backoff
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about API calls
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      rotations: this.rotationCount,
      successRate: this.requestCount > 0
        ? Math.round((this.successCount / this.requestCount) * 100)
        : 0
    };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats() {
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.rotationCount = 0;
  }

  /**
   * Get current rotation service status
   * @returns {Object} Rotation service status
   */
  getRotationStatus() {
    return {
      apps: appRotationService.getAppsStatus(),
      summary: appRotationService.getSummary()
    };
  }
}

// Export singleton instance
const facebookApiWithRotation = new FacebookApiWithRotation();

module.exports = facebookApiWithRotation;
