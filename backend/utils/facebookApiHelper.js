/**
 * Facebook API Helper - Drop-in Replacement for Direct Axios Calls
 *
 * This helper provides easy migration from direct axios calls to rotation-enabled calls.
 * Simply replace axios imports with this helper and enable rotation flag.
 *
 * Migration path:
 * 1. NO CODE CHANGES: Keep using direct axios (default behavior)
 * 2. ENABLE ROTATION: Set useRotation=true to enable automatic app rotation
 * 3. FULL MIGRATION: Replace all axios.get/post calls with fbApi.get/post
 */

const axios = require('axios');
const fbApiWithRotation = require('../services/FacebookApiWithRotation');
const { AllAppsExhaustedError } = require('../utils/customErrors');

// Global rotation flag - can be enabled/disabled without code changes
const USE_ROTATION = process.env.ENABLE_FB_APP_ROTATION === 'true' || false;

/**
 * Make a Facebook Graph API call with optional rotation
 *
 * @param {string} url - Full URL or endpoint
 * @param {Object} options - Axios-compatible options
 * @param {string} userAccessToken - User's OAuth token
 * @param {boolean} enableRotation - Override global rotation setting
 * @returns {Promise<Object>} Axios response object
 */
async function makeFacebookApiCall(url, options = {}, userAccessToken = null, enableRotation = USE_ROTATION) {
  // If rotation is disabled, use direct axios call (backward compatible)
  if (!enableRotation) {
    return axios(url, options);
  }

  // Extract endpoint from URL
  let endpoint = url;
  if (url.includes('graph.facebook.com')) {
    // Extract endpoint from full URL
    const match = url.match(/graph\.facebook\.com\/v[\d.]+\/(.*)/);
    if (match) {
      endpoint = match[1];
    }
  }

  // Extract params and access token
  const params = options.params || options.data || {};
  const method = options.method || 'GET';
  const data = (method === 'POST' || method === 'PUT') ? options.data : null;

  // Get user access token from params if not provided
  const accessToken = userAccessToken || params.access_token;

  // Remove access_token from params (rotation service will add it)
  const cleanParams = { ...params };
  delete cleanParams.access_token;

  try {
    // Use rotation service
    const responseData = await fbApiWithRotation.makeApiCall(
      endpoint,
      cleanParams,
      method,
      data,
      accessToken
    );

    // Return axios-compatible response
    return {
      data: responseData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: options
    };

  } catch (error) {
    // Convert rotation errors to axios-compatible errors
    if (error instanceof AllAppsExhaustedError) {
      const axiosError = new Error(error.message);
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        data: error.toJSON()
      };
      axiosError.isAxiosError = true;
      throw axiosError;
    }

    throw error;
  }
}

/**
 * Drop-in replacement for axios.get with automatic rotation
 */
async function get(url, config = {}, userAccessToken = null) {
  return makeFacebookApiCall(url, { ...config, method: 'GET' }, userAccessToken);
}

/**
 * Drop-in replacement for axios.post with automatic rotation
 */
async function post(url, data, config = {}, userAccessToken = null) {
  return makeFacebookApiCall(url, { ...config, method: 'POST', data }, userAccessToken);
}

/**
 * Drop-in replacement for axios.delete with automatic rotation
 */
async function deleteRequest(url, config = {}, userAccessToken = null) {
  return makeFacebookApiCall(url, { ...config, method: 'DELETE' }, userAccessToken);
}

/**
 * Drop-in replacement for axios.put with automatic rotation
 */
async function put(url, data, config = {}, userAccessToken = null) {
  return makeFacebookApiCall(url, { ...config, method: 'PUT', data }, userAccessToken);
}

/**
 * Get rotation status (for admin dashboard)
 */
function getRotationStatus() {
  return fbApiWithRotation.getRotationStatus();
}

/**
 * Get API call statistics
 */
function getStats() {
  return fbApiWithRotation.getStats();
}

/**
 * Check if rotation is enabled
 */
function isRotationEnabled() {
  return USE_ROTATION;
}

module.exports = {
  // Main API
  get,
  post,
  delete: deleteRequest,
  put,
  makeFacebookApiCall,

  // Status and stats
  getRotationStatus,
  getStats,
  isRotationEnabled,

  // Direct access to rotation service (for advanced usage)
  rotationService: fbApiWithRotation
};
