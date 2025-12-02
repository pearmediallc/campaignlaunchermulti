/**
 * Custom Error Classes
 *
 * Specialized error classes for handling various Facebook API and rate limit scenarios.
 * These errors provide better error handling and debugging capabilities.
 */

/**
 * Error thrown when all backup apps are exhausted (all hit rate limits)
 */
class AllAppsExhaustedError extends Error {
  constructor(message = 'All apps have been rate limited', details = {}) {
    super(message);
    this.name = 'AllAppsExhaustedError';
    this.statusCode = 429;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Error thrown when Facebook API returns an error
 */
class FacebookApiError extends Error {
  constructor(message, code = null, subcode = null, type = null) {
    super(message);
    this.name = 'FacebookApiError';
    this.statusCode = 400;
    this.isOperational = true;
    this.facebookErrorCode = code;
    this.facebookErrorSubcode = subcode;
    this.facebookErrorType = type;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      facebookErrorCode: this.facebookErrorCode,
      facebookErrorSubcode: this.facebookErrorSubcode,
      facebookErrorType: this.facebookErrorType
    };
  }
}

/**
 * Error thrown when an access token is invalid or expired
 */
class InvalidTokenError extends Error {
  constructor(message = 'Access token is invalid or expired', appName = null) {
    super(message);
    this.name = 'InvalidTokenError';
    this.statusCode = 401;
    this.isOperational = true;
    this.appName = appName;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      appName: this.appName
    };
  }
}

/**
 * Error thrown when a request needs to be queued
 */
class RequestQueuedError extends Error {
  constructor(queueId, estimatedWaitMinutes = null) {
    const message = estimatedWaitMinutes
      ? `Request queued due to rate limits. Estimated wait: ${estimatedWaitMinutes} minutes`
      : 'Request queued due to rate limits';

    super(message);
    this.name = 'RequestQueuedError';
    this.statusCode = 202; // Accepted but not completed
    this.isOperational = true;
    this.queueId = queueId;
    this.estimatedWaitMinutes = estimatedWaitMinutes;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      queueId: this.queueId,
      estimatedWaitMinutes: this.estimatedWaitMinutes
    };
  }
}

/**
 * Error thrown when app rotation fails
 */
class AppRotationError extends Error {
  constructor(message = 'App rotation failed', details = {}) {
    super(message);
    this.name = 'AppRotationError';
    this.statusCode = 500;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Check if an error is a rate limit error (429)
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a rate limit error
 */
function isRateLimitError(error) {
  return (
    error.response?.status === 429 ||
    error.statusCode === 429 ||
    error.name === 'AllAppsExhaustedError' ||
    (error.response?.data?.error?.code === 4 && error.response?.data?.error?.error_subcode === 80004) ||
    (error.response?.data?.error?.message && error.response.data.error.message.toLowerCase().includes('rate limit'))
  );
}

/**
 * Check if an error is an invalid token error (401)
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's an invalid token error
 */
function isInvalidTokenError(error) {
  return (
    error.response?.status === 401 ||
    error.statusCode === 401 ||
    error.name === 'InvalidTokenError' ||
    (error.response?.data?.error?.code === 190) ||
    (error.response?.data?.error?.message && error.response.data.error.message.toLowerCase().includes('token'))
  );
}

/**
 * Check if an error is a Facebook permissions error
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a permissions error
 */
function isPermissionsError(error) {
  return (
    error.response?.data?.error?.code === 200 ||
    error.response?.data?.error?.code === 10 ||
    (error.response?.data?.error?.message && error.response.data.error.message.toLowerCase().includes('permission'))
  );
}

/**
 * Parse Facebook error from response
 * @param {Object} errorResponse - Axios error response
 * @returns {FacebookApiError} Parsed Facebook API error
 */
function parseFacebookError(errorResponse) {
  if (errorResponse?.data?.error) {
    const fbError = errorResponse.data.error;
    return new FacebookApiError(
      fbError.message || 'Facebook API error',
      fbError.code,
      fbError.error_subcode,
      fbError.type
    );
  }

  return new FacebookApiError(
    errorResponse?.statusText || 'Unknown Facebook API error'
  );
}

module.exports = {
  AllAppsExhaustedError,
  FacebookApiError,
  InvalidTokenError,
  RequestQueuedError,
  AppRotationError,
  isRateLimitError,
  isInvalidTokenError,
  isPermissionsError,
  parseFacebookError
};
