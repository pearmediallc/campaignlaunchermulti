const SystemUserManager = require('../services/SystemUserManager');
const RateLimitService = require('../services/RateLimitService');

/**
 * Middleware to handle Facebook API rate limiting
 * Decides whether to use System User tokens or user OAuth tokens
 * Queues requests if rate limit is exceeded
 */
async function rateLimitHandler(req, res, next) {
  try {
    const userId = req.user?.id || req.userId;
    const adAccountId = req.body.adAccountId || req.params.adAccountId || req.query.adAccountId;

    if (!userId || !adAccountId) {
      // Can't determine rate limit without user/account info
      return next();
    }

    // Check if this is an internal account (from our 14 BMs)
    const isInternal = await SystemUserManager.isInternalAccount(adAccountId);

    if (isInternal) {
      // Use System User token for internal accounts
      const systemUser = await SystemUserManager.getAvailableSystemUser();

      if (systemUser) {
        // Attach System User info to request
        req.useSystemUser = true;
        req.systemUserToken = systemUser.token;
        req.systemUserId = systemUser.systemUserId;

        console.log(`Using System User ${systemUser.systemUserId} for internal account ${adAccountId}`);
        return next();
      } else {
        console.log(`No available System Users, falling back to OAuth for ${adAccountId}`);
        // Fall through to OAuth handling
      }
    }

    // For external accounts or when System Users unavailable, use OAuth
    // Check user's current rate limit status
    const rateLimitStatus = await RateLimitService.checkRateLimit(userId, adAccountId);

    if (rateLimitStatus.canProceed) {
      // User has capacity, proceed normally
      req.rateLimitStatus = rateLimitStatus;
      return next();
    }

    // Rate limit exceeded - queue the request
    console.log(`Rate limit exceeded for user ${userId} on account ${adAccountId} (${rateLimitStatus.usagePercentage}%), queueing request`);

    // Extract request data for queueing
    const actionType = determineActionType(req);
    const accessToken = req.user?.facebookAccessToken || req.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        error: 'No access token available for queued request'
      });
    }

    const queueResult = await RateLimitService.queueRequest({
      userId,
      adAccountId,
      actionType,
      requestData: {
        body: req.body,
        params: req.params,
        query: req.query,
        method: req.method,
        path: req.path
      },
      accessToken,
      processAfter: rateLimitStatus.resetAt,
      priority: 5
    });

    // Return queued response instead of processing immediately
    return res.status(202).json({
      status: 'queued',
      message: 'Request queued due to rate limit',
      queue: queueResult,
      rateLimitStatus: {
        usagePercentage: rateLimitStatus.usagePercentage,
        callsUsed: rateLimitStatus.callsUsed,
        callsLimit: rateLimitStatus.callsLimit,
        resetAt: rateLimitStatus.resetAt
      }
    });

  } catch (error) {
    console.error('Rate limit handler error:', error);
    // On error, allow request to proceed normally
    next();
  }
}

/**
 * Determine action type from request
 * @param {Object} req - Express request object
 * @returns {String}
 */
function determineActionType(req) {
  const path = req.path.toLowerCase();
  const method = req.method.toLowerCase();

  if (path.includes('/duplicate') || path.includes('/strategy-150')) {
    return 'duplicate_campaign';
  }

  if (path.includes('/campaign')) {
    return method === 'post' ? 'create_campaign' : 'update_campaign';
  }

  if (path.includes('/adset')) {
    return method === 'post' ? 'create_adset' : 'update_adset';
  }

  if (path.includes('/ad')) {
    return method === 'post' ? 'create_ad' : 'update_ad';
  }

  if (path.includes('/batch')) {
    return 'batch_operation';
  }

  return 'create_campaign'; // Default
}

/**
 * Middleware to update rate limit tracking from Facebook response
 * Should be used after making Facebook API calls
 */
async function updateRateLimitFromResponse(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    // Capture response before sending
    const userId = req.user?.id || req.userId;
    const adAccountId = req.body?.adAccountId || req.params?.adAccountId || req.query?.adAccountId;

    // Extract Facebook headers from original response if available
    const facebookHeaders = res.locals.facebookHeaders || {};

    if (userId && adAccountId && (facebookHeaders['x-business-use-case-usage'] || facebookHeaders['x-app-usage'])) {
      // Update rate limit tracking asynchronously (don't block response)
      if (req.systemUserId) {
        // Update System User tracking
        SystemUserManager.updateFromHeaders(req.systemUserId, facebookHeaders)
          .catch(err => console.error('Error updating System User rate limit:', err));
      } else {
        // Update user OAuth tracking
        RateLimitService.updateFromHeaders(userId, adAccountId, facebookHeaders)
          .catch(err => console.error('Error updating user rate limit:', err));
      }
    }

    return originalJson(data);
  };

  next();
}

module.exports = {
  rateLimitHandler,
  updateRateLimitFromResponse
};
