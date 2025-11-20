/**
 * ErrorTranslator Service
 * Translates Facebook API errors into user-friendly messages
 */

class ErrorTranslator {
  /**
   * Translate Facebook API error to user-friendly message
   * @param {Error} error - The error object from Facebook API
   * @returns {Object} - { userFriendlyMessage, errorCode, category }
   */
  static translateFacebookError(error) {
    // Extract error details
    const errorData = error?.response?.data?.error || {};
    const errorCode = errorData.code || error?.code || 'UNKNOWN';
    const errorMessage = errorData.message || error?.message || 'Unknown error';
    const errorType = errorData.type || 'Unknown';
    const errorSubcode = errorData.error_subcode;

    // Rate limiting errors
    if (errorCode === 4 || errorCode === 17 || errorCode === 613 || errorCode === 80004) {
      return {
        userFriendlyMessage: 'Facebook rate limit reached. Your ad is being created with automatic retries. Please wait a few minutes.',
        errorCode: String(errorCode),
        category: 'rate_limit',
        isTechnical: false
      };
    }

    // Budget errors
    if (errorCode === 100 && errorMessage.includes('budget')) {
      return {
        userFriendlyMessage: 'Budget settings are invalid. Please check that your daily/lifetime budget meets Facebook\'s minimum requirements ($1.00 USD).',
        errorCode: String(errorCode),
        category: 'budget',
        isTechnical: false
      };
    }

    // Targeting errors
    if (errorCode === 100 && (errorMessage.includes('targeting') || errorMessage.includes('audience'))) {
      return {
        userFriendlyMessage: 'Targeting settings are too narrow or invalid. Please adjust your audience targeting (location, age, interests).',
        errorCode: String(errorCode),
        category: 'targeting',
        isTechnical: false
      };
    }

    // Permission errors
    if (errorCode === 200 || errorCode === 190) {
      return {
        userFriendlyMessage: 'Access token expired or insufficient permissions. Please reconnect your Facebook account.',
        errorCode: String(errorCode),
        category: 'permissions',
        isTechnical: false
      };
    }

    // Ad account errors
    if (errorCode === 2635) {
      return {
        userFriendlyMessage: 'Your ad account has spending restrictions. Please check your Facebook Ad Account settings.',
        errorCode: String(errorCode),
        category: 'account',
        isTechnical: false
      };
    }

    // Media errors
    if (errorMessage.includes('image') || errorMessage.includes('video') || errorMessage.includes('media')) {
      return {
        userFriendlyMessage: 'Media upload failed. Please check that your images/videos meet Facebook\'s requirements (file size, format, dimensions).',
        errorCode: String(errorCode),
        category: 'media',
        isTechnical: false
      };
    }

    // Policy violations
    if (errorCode === 1487741 || errorMessage.includes('policy') || errorMessage.includes('prohibited')) {
      return {
        userFriendlyMessage: 'Your ad content violates Facebook\'s advertising policies. Please review your ad text, images, and targeting.',
        errorCode: String(errorCode),
        category: 'policy',
        isTechnical: false
      };
    }

    // Pixel/conversion errors
    if (errorMessage.includes('pixel') || errorMessage.includes('conversion')) {
      return {
        userFriendlyMessage: 'Pixel or conversion tracking setup is invalid. Please check your Facebook Pixel configuration.',
        errorCode: String(errorCode),
        category: 'pixel',
        isTechnical: false
      };
    }

    // Placement errors
    if (errorMessage.includes('placement')) {
      return {
        userFriendlyMessage: 'Invalid ad placement settings. Please check your placement selections (Facebook, Instagram, etc.).',
        errorCode: String(errorCode),
        category: 'placement',
        isTechnical: false
      };
    }

    // Invalid parameter errors
    if (errorCode === 100) {
      return {
        userFriendlyMessage: `Invalid campaign settings: ${this.simplifyErrorMessage(errorMessage)}`,
        errorCode: String(errorCode),
        category: 'invalid_param',
        isTechnical: true
      };
    }

    // Network/timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        userFriendlyMessage: 'Connection to Facebook timed out. Your request is being retried automatically.',
        errorCode: error.code,
        category: 'network',
        isTechnical: false
      };
    }

    // Generic fallback
    return {
      userFriendlyMessage: `Facebook API Error: ${this.simplifyErrorMessage(errorMessage)}. Our team has been notified.`,
      errorCode: String(errorCode),
      category: 'unknown',
      isTechnical: true
    };
  }

  /**
   * Simplify technical error messages
   * @param {String} message - Raw error message
   * @returns {String} - Simplified message
   */
  static simplifyErrorMessage(message) {
    // Remove technical jargon
    let simplified = message
      .replace(/\(#\d+\)/g, '') // Remove error codes in parentheses
      .replace(/\bat\s+[\w.]+:\d+:\d+/g, '') // Remove stack trace references
      .replace(/\bError:\s*/g, '') // Remove "Error:" prefix
      .trim();

    // Truncate if too long
    if (simplified.length > 200) {
      simplified = simplified.substring(0, 197) + '...';
    }

    return simplified;
  }

  /**
   * Determine if error is retryable
   * @param {Error} error - The error object
   * @returns {Boolean} - Whether error is retryable
   */
  static isRetryable(error) {
    const errorCode = error?.response?.data?.error?.code || error?.code;

    // Rate limiting - always retryable
    if ([4, 17, 613, 80004].includes(errorCode)) {
      return true;
    }

    // Network errors - retryable
    if (['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code)) {
      return true;
    }

    // Temporary Facebook issues (5xx errors)
    if (errorCode >= 500 && errorCode < 600) {
      return true;
    }

    // Permission errors - not retryable (need user action)
    if ([200, 190].includes(errorCode)) {
      return false;
    }

    // Policy violations - not retryable
    if (errorCode === 1487741) {
      return false;
    }

    // Default: consider retryable for safety
    return true;
  }

  /**
   * Get retry recommendation
   * @param {Error} error - The error object
   * @param {Number} retryCount - Current retry count
   * @returns {Object} - { shouldRetry, delayMs, reason }
   */
  static getRetryRecommendation(error, retryCount = 0) {
    const isRetryable = this.isRetryable(error);
    const errorCode = error?.response?.data?.error?.code || error?.code;

    // Rate limiting - longer delays
    if ([4, 17, 613, 80004].includes(errorCode)) {
      const delays = [60000, 180000, 300000]; // 1min, 3min, 5min
      return {
        shouldRetry: retryCount < 3,
        delayMs: delays[retryCount] || 300000,
        reason: 'Rate limit - waiting for Facebook API reset'
      };
    }

    // Network errors - standard exponential backoff
    if (['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code)) {
      const delays = [5000, 15000, 30000]; // 5s, 15s, 30s
      return {
        shouldRetry: retryCount < 3,
        delayMs: delays[retryCount] || 30000,
        reason: 'Network issue - retrying connection'
      };
    }

    // Non-retryable errors
    if (!isRetryable) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: 'Error requires manual intervention'
      };
    }

    // Generic retryable errors
    const delays = [15000, 45000, 90000]; // 15s, 45s, 90s
    return {
      shouldRetry: retryCount < 3,
      delayMs: delays[retryCount] || 90000,
      reason: 'Temporary error - retrying'
    };
  }

  /**
   * Extract all error details for logging
   * @param {Error} error - The error object
   * @returns {Object} - Complete error details
   */
  static extractErrorDetails(error) {
    const errorData = error?.response?.data?.error || {};

    return {
      code: errorData.code || error?.code || 'UNKNOWN',
      message: errorData.message || error?.message || 'Unknown error',
      type: errorData.type || error?.name || 'Unknown',
      subcode: errorData.error_subcode,
      userTitle: errorData.error_user_title,
      userMessage: errorData.error_user_msg,
      fbtraceid: errorData.fbtrace_id,
      httpStatus: error?.response?.status,
      fullError: JSON.stringify(errorData, null, 2)
    };
  }
}

module.exports = ErrorTranslator;
