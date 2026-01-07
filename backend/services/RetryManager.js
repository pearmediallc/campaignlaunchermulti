const RateLimitService = require('./RateLimitService');

/**
 * Retry Manager - Week 3 Enhancement
 *
 * Wraps Facebook API calls with intelligent retry logic:
 * - Exponential backoff for temporary errors
 * - Rate limit queue integration
 * - Error classification (temporary vs permanent)
 * - Retry budget enforcement
 *
 * Philosophy: "Never give up - retry until success or truly impossible"
 */
class RetryManager {
  constructor() {
    this.defaultRetryBudget = 5;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 60000; // 60 seconds
    this.backoffMultiplier = 2;
  }

  /**
   * Execute a function with retry logic
   *
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Retry options
   * @param {Number} options.retryBudget - Max retry attempts (default: 5)
   * @param {Number} options.userId - User ID (for rate limit tracking)
   * @param {String} options.adAccountId - Ad Account ID (for rate limit tracking)
   * @param {String} options.operationName - Human-readable operation name for logging
   * @param {Function} options.onRetry - Callback on each retry (optional)
   * @returns {Promise<any>} Result from function execution
   */
  async executeWithRetry(fn, options = {}) {
    const {
      retryBudget = this.defaultRetryBudget,
      userId,
      adAccountId,
      operationName = 'operation',
      onRetry = null
    } = options;

    let lastError = null;
    let attempt = 0;

    while (attempt <= retryBudget) {
      try {
        console.log(`🔄 [RetryManager] ${operationName} - Attempt ${attempt + 1}/${retryBudget + 1}`);

        // Execute the function
        const result = await fn();

        if (attempt > 0) {
          console.log(`✅ [RetryManager] ${operationName} succeeded after ${attempt} retries`);
        }

        return result;

      } catch (error) {
        lastError = error;
        attempt++;

        // Classify error
        const errorClass = this.classifyError(error);
        console.log(`❌ [RetryManager] ${operationName} failed (attempt ${attempt}/${retryBudget + 1})`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Classification: ${errorClass.type}`);

        // Handle permanent errors - don't retry
        if (errorClass.type === 'PERMANENT') {
          console.log(`🛑 [RetryManager] Permanent error detected - NOT retrying`);
          console.log(`   Reason: ${errorClass.reason}`);

          throw new Error(`PERMANENT_ERROR: ${errorClass.reason}. Original: ${error.message}`);
        }

        // Handle rate limit errors - queue for later
        if (errorClass.type === 'RATE_LIMIT') {
          console.log(`⏳ [RetryManager] Rate limit detected - checking queue integration`);

          if (userId && adAccountId) {
            // Get rate limit status to determine wait time
            const rateLimitStatus = await RateLimitService.checkRateLimit(userId, adAccountId);

            if (rateLimitStatus.resetAt) {
              const waitTime = new Date(rateLimitStatus.resetAt) - new Date();

              console.log(`   Rate limit resets in ${Math.ceil(waitTime / 1000)}s`);

              // If wait time is reasonable (< 5 minutes), wait and retry
              if (waitTime > 0 && waitTime < 300000) {
                console.log(`   Waiting ${Math.ceil(waitTime / 1000)}s for rate limit reset...`);
                await this.sleep(waitTime);

                // Notify retry callback if provided
                if (onRetry) {
                  await onRetry({
                    attempt,
                    error,
                    errorClass,
                    waitTime,
                    willRetry: true
                  });
                }

                continue; // Retry immediately after wait
              }
            }
          }

          // If we can't determine wait time or it's too long, throw to queue
          throw new Error(`RATE_LIMIT_EXCEEDED: Will retry via queue. Original: ${error.message}`);
        }

        // Check if we've exhausted retry budget
        if (attempt > retryBudget) {
          console.log(`🚫 [RetryManager] Retry budget exhausted (${retryBudget} attempts)`);
          throw new Error(`RETRY_EXHAUSTED: Failed after ${retryBudget} attempts. Last error: ${error.message}`);
        }

        // Calculate backoff delay for temporary errors
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`   Retrying in ${delay / 1000}s (exponential backoff)...`);

        // Notify retry callback if provided
        if (onRetry) {
          await onRetry({
            attempt,
            error,
            errorClass,
            delay,
            willRetry: true
          });
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Should never reach here, but just in case
    throw new Error(`RETRY_EXHAUSTED: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Classify error as temporary or permanent
   *
   * @param {Error} error - Error object
   * @returns {Object} Classification with type and reason
   */
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';
    const fbErrorCode = error.error?.code || error.error_code;

    // ===== PERMANENT ERRORS (Don't retry) =====

    // Ad account suspended/disabled
    if (
      message.includes('account') && (
        message.includes('disabled') ||
        message.includes('suspended') ||
        message.includes('closed')
      )
    ) {
      return {
        type: 'PERMANENT',
        reason: 'Ad account is disabled or suspended'
      };
    }

    // Invalid authentication
    if (
      message.includes('invalid token') ||
      message.includes('token is invalid') ||
      message.includes('access token has expired') ||
      message.includes('error validating access token') ||
      fbErrorCode === 190 // Invalid OAuth access token
    ) {
      return {
        type: 'PERMANENT',
        reason: 'Access token is invalid or expired'
      };
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('not authorized') ||
      fbErrorCode === 10 // Permission denied
    ) {
      return {
        type: 'PERMANENT',
        reason: 'Insufficient permissions'
      };
    }

    // Invalid parameters (user error)
    if (
      message.includes('invalid parameter') ||
      message.includes('invalid value') ||
      fbErrorCode === 100 // Invalid parameter
    ) {
      return {
        type: 'PERMANENT',
        reason: 'Invalid request parameters'
      };
    }

    // Entity not found
    if (
      message.includes('not found') ||
      message.includes('does not exist') ||
      fbErrorCode === 803 // Object does not exist
    ) {
      return {
        type: 'PERMANENT',
        reason: 'Requested entity does not exist'
      };
    }

    // ===== RATE LIMIT ERRORS (Special handling) =====

    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('throttle') ||
      fbErrorCode === 4 || // Application request limit reached
      fbErrorCode === 17 || // User request limit reached
      fbErrorCode === 32 || // Page request limit reached
      fbErrorCode === 613 // Calls to this API have exceeded the rate limit
    ) {
      return {
        type: 'RATE_LIMIT',
        reason: 'API rate limit exceeded'
      };
    }

    // ===== TEMPORARY ERRORS (Retry with backoff) =====

    // Network errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND'
    ) {
      return {
        type: 'TEMPORARY',
        reason: 'Network connectivity issue'
      };
    }

    // Server errors (5xx)
    if (
      message.includes('internal server error') ||
      message.includes('service unavailable') ||
      message.includes('bad gateway') ||
      message.includes('gateway timeout') ||
      fbErrorCode === 1 || // API Unknown error
      fbErrorCode === 2 || // API Service error
      fbErrorCode === 368 // Temporary error
    ) {
      return {
        type: 'TEMPORARY',
        reason: 'Facebook server error'
      };
    }

    // Unknown errors - treat as temporary (retry cautiously)
    return {
      type: 'TEMPORARY',
      reason: 'Unknown error - retrying cautiously'
    };
  }

  /**
   * Calculate exponential backoff delay
   *
   * @param {Number} attempt - Attempt number (1-indexed)
   * @returns {Number} Delay in milliseconds
   */
  calculateBackoffDelay(attempt) {
    // Exponential: 1s, 2s, 4s, 8s, 16s, capped at maxDelay
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1),
      this.maxDelay
    );

    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);

    return Math.floor(delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param {Number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrap a function to automatically retry on failure
   * Returns a new function with retry logic baked in
   *
   * @param {Function} fn - Function to wrap
   * @param {Object} defaultOptions - Default retry options
   * @returns {Function} Wrapped function with retry logic
   */
  wrapWithRetry(fn, defaultOptions = {}) {
    return async (...args) => {
      return this.executeWithRetry(() => fn(...args), defaultOptions);
    };
  }
}

// Export singleton instance
module.exports = new RetryManager();
