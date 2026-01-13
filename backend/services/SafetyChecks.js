const db = require('../models');
const axios = require('axios');

/**
 * Safety Checks Service - Week 1 Enhancement
 *
 * Provides pre-creation verification to ensure environment is safe
 * BEFORE starting any Facebook API entity creation calls.
 *
 * This is a READ-ONLY service that does NOT modify any data.
 * It only checks conditions and returns verification results.
 */
class SafetyChecks {
  /**
   * Verify pre-creation state before starting campaign creation
   *
   * @param {Number} userId - User ID making the request
   * @param {Object} facebookApi - Initialized FacebookAPI instance
   * @param {String} campaignName - Requested campaign name
   * @param {String} adAccountId - Ad account ID (with or without 'act_' prefix)
   * @returns {Promise<Object>} Verification result
   */
  static async verifyPreCreationState(userId, facebookApi, campaignName, adAccountId) {
    const startTime = Date.now();

    const verification = {
      canProceed: true,
      reasons: [],
      warnings: [],
      details: {},
      checks: {},
      currentState: {}
    };

    try {
      console.log('🔍 [SafetyChecks] Starting pre-creation verification...');
      console.log(`  User: ${userId}`);
      console.log(`  Ad Account: ${adAccountId}`);
      console.log(`  Campaign Name: ${campaignName}`);

      // ============================================
      // Check 1: Ad Account Accessibility
      // ============================================
      try {
        console.log('  ✓ Check 1: Verifying ad account accessibility...');

        const accountId = adAccountId.replace('act_', '');
        const accessToken = facebookApi.accessToken;

        const response = await axios.get(
          `https://graph.facebook.com/v18.0/act_${accountId}`,
          {
            params: {
              fields: 'id,name,account_status,disable_reason,capabilities',
              access_token: accessToken
            }
          }
        );

        const accountInfo = response.data;

        verification.checks.accountAccessible = true;
        verification.details.accountInfo = {
          id: accountInfo.id,
          name: accountInfo.name,
          status: accountInfo.account_status
        };

        // Check if account is suspended or disabled
        const accountStatus = parseInt(accountInfo.account_status);
        if (accountStatus === 2) {
          // Account disabled
          verification.canProceed = false;
          verification.checks.accountSuspended = true;
          verification.reasons.push('Ad account is disabled');
          verification.details.disableReason = accountInfo.disable_reason || 'Unknown';

          console.log('    ❌ Account is DISABLED');
        } else if (accountStatus === 3) {
          // Account unsettled
          verification.canProceed = false;
          verification.checks.accountSuspended = true;
          verification.reasons.push('Ad account has unsettled issues');

          console.log('    ❌ Account is UNSETTLED');
        } else if (accountStatus === 7) {
          // Pending risk review
          verification.warnings.push('Ad account is pending risk review - creation may be restricted');
          verification.checks.accountSuspended = false;

          console.log('    ⚠️  Account is PENDING RISK REVIEW');
        } else if (accountStatus === 1) {
          // Active
          verification.checks.accountSuspended = false;
          console.log('    ✅ Account is ACTIVE');
        } else {
          // Unknown status - proceed with warning
          verification.warnings.push(`Ad account has unknown status: ${accountStatus}`);
          verification.checks.accountSuspended = false;

          console.log(`    ⚠️  Account has UNKNOWN status: ${accountStatus}`);
        }

      } catch (accountError) {
        console.log('    ❌ Failed to access ad account');
        verification.canProceed = false;
        verification.checks.accountAccessible = false;
        verification.reasons.push(`Cannot access ad account: ${accountError.message}`);
        verification.details.accountError = accountError.message;
      }

      // ============================================
      // Check 2: Duplicate Campaign Name Detection
      // ============================================
      if (verification.canProceed) {
        try {
          console.log('  ✓ Check 2: Checking for duplicate campaign names...');

          const accountId = adAccountId.replace('act_', '');
          const accessToken = facebookApi.accessToken;

          const response = await axios.get(
            `https://graph.facebook.com/v18.0/act_${accountId}/campaigns`,
            {
              params: {
                fields: 'id,name,status',
                limit: 100, // Check last 100 campaigns
                filtering: JSON.stringify([
                  { field: 'name', operator: 'EQUAL', value: campaignName }
                ]),
                access_token: accessToken
              }
            }
          );

          const existingCampaigns = response.data;

          const duplicates = existingCampaigns.data || [];

          if (duplicates.length > 0) {
            // Found duplicate campaign name
            verification.checks.duplicateCampaignExists = true;
            verification.warnings.push(`Campaign name "${campaignName}" already exists (${duplicates.length} found)`);
            verification.details.duplicateCampaigns = duplicates.map(c => ({
              id: c.id,
              name: c.name,
              status: c.status
            }));

            console.log(`    ⚠️  Found ${duplicates.length} existing campaigns with this name`);

            // Note: We don't block creation, just warn
            // Facebook allows duplicate names, but it's confusing for users
          } else {
            verification.checks.duplicateCampaignExists = false;
            console.log('    ✅ No duplicate campaign names found');
          }

        } catch (duplicateError) {
          // Non-critical error - log but don't block
          console.log('    ⚠️  Could not check for duplicates:', duplicateError.message);
          verification.warnings.push('Could not verify duplicate campaign names');
          verification.checks.duplicateCampaignExists = null;
        }
      }

      // ============================================
      // Check 3: Facebook Account Limits
      // ============================================
      if (verification.canProceed) {
        try {
          console.log('  ✓ Check 3: Checking account limits...');

          const accountId = adAccountId.replace('act_', '');
          const accessToken = facebookApi.accessToken;

          // Get current campaign count
          const response = await axios.get(
            `https://graph.facebook.com/v18.0/act_${accountId}/campaigns`,
            {
              params: {
                fields: 'id',
                summary: true,
                access_token: accessToken
              }
            }
          );

          const campaignCount = response.data;
          const currentCount = campaignCount.summary?.total_count || campaignCount.data?.length || 0;
          verification.currentState.currentCampaignCount = currentCount;

          // Facebook typical limits (these are approximate - actual limits vary by account)
          // Standard accounts: ~5000 campaigns
          // New accounts: ~250 campaigns
          // Spending history affects limits
          const ESTIMATED_CAMPAIGN_LIMIT = 5000;
          const WARNING_THRESHOLD = 0.9; // Warn at 90% of limit

          verification.currentState.accountLimit = ESTIMATED_CAMPAIGN_LIMIT;

          if (currentCount >= ESTIMATED_CAMPAIGN_LIMIT) {
            verification.canProceed = false;
            verification.checks.atAccountLimit = true;
            verification.reasons.push(`Campaign limit reached (${currentCount}/${ESTIMATED_CAMPAIGN_LIMIT})`);

            console.log(`    ❌ At campaign limit: ${currentCount}/${ESTIMATED_CAMPAIGN_LIMIT}`);
          } else if (currentCount >= ESTIMATED_CAMPAIGN_LIMIT * WARNING_THRESHOLD) {
            verification.checks.atAccountLimit = false;
            verification.warnings.push(`Approaching campaign limit (${currentCount}/${ESTIMATED_CAMPAIGN_LIMIT})`);

            console.log(`    ⚠️  Approaching limit: ${currentCount}/${ESTIMATED_CAMPAIGN_LIMIT}`);
          } else {
            verification.checks.atAccountLimit = false;
            console.log(`    ✅ Within limits: ${currentCount}/${ESTIMATED_CAMPAIGN_LIMIT}`);
          }

        } catch (limitError) {
          // Non-critical error - log but don't block
          console.log('    ⚠️  Could not check account limits:', limitError.message);
          verification.warnings.push('Could not verify account limits');
          verification.checks.atAccountLimit = null;
        }
      }

      // ============================================
      // Check 4: Token Validity
      // ============================================
      if (verification.canProceed) {
        try {
          console.log('  ✓ Check 4: Verifying access token validity...');

          const accessToken = facebookApi.accessToken;

          // Test token with a simple /me call
          const response = await axios.get(
            'https://graph.facebook.com/v18.0/me',
            {
              params: {
                fields: 'id,name',
                access_token: accessToken
              }
            }
          );

          const meInfo = response.data;

          verification.checks.tokenValid = true;
          verification.details.tokenInfo = {
            userId: meInfo.id,
            userName: meInfo.name
          };

          console.log('    ✅ Access token is valid');

        } catch (tokenError) {
          console.log('    ❌ Access token is invalid or expired');
          verification.canProceed = false;
          verification.checks.tokenValid = false;
          verification.reasons.push('Access token is invalid or expired - please re-authenticate');
          verification.details.tokenError = tokenError.message;
        }
      }

      // ============================================
      // Final Result
      // ============================================
      const verificationTime = Date.now() - startTime;
      verification.verificationTimeMs = verificationTime;

      if (verification.canProceed) {
        console.log(`✅ [SafetyChecks] Pre-creation verification PASSED (${verificationTime}ms)`);
        if (verification.warnings.length > 0) {
          console.log(`⚠️  ${verification.warnings.length} warning(s):`);
          verification.warnings.forEach(w => console.log(`   - ${w}`));
        }
      } else {
        console.log(`❌ [SafetyChecks] Pre-creation verification FAILED (${verificationTime}ms)`);
        console.log(`   Reasons (${verification.reasons.length}):`);
        verification.reasons.forEach(r => console.log(`   - ${r}`));
      }

      return verification;

    } catch (error) {
      console.error('❌ [SafetyChecks] Unexpected error during verification:', error);

      // On unexpected error, fail safely - don't proceed
      return {
        canProceed: false,
        reasons: ['Unexpected error during pre-creation verification'],
        warnings: [],
        details: {
          unexpectedError: error.message,
          stack: error.stack
        },
        checks: {
          accountAccessible: null,
          accountSuspended: null,
          duplicateCampaignExists: null,
          atAccountLimit: null,
          tokenValid: null
        },
        currentState: {},
        verificationTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Log verification result to database for audit trail
   *
   * @param {Number} userId - User ID
   * @param {String} adAccountId - Ad Account ID
   * @param {String} campaignName - Campaign name
   * @param {Object} verification - Verification result from verifyPreCreationState
   * @param {Number|null} jobId - Optional campaign creation job ID
   * @returns {Promise<Object>} Created verification record
   */
  static async logVerification(userId, adAccountId, campaignName, verification, jobId = null) {
    try {
      const { PreCreationVerification } = db;

      const record = await PreCreationVerification.create({
        userId,
        jobId,
        adAccountId: adAccountId.replace('act_', ''),
        campaignName,

        // Results
        canProceed: verification.canProceed,
        verificationTimeMs: verification.verificationTimeMs,

        // Individual checks
        accountAccessible: verification.checks.accountAccessible,
        accountSuspended: verification.checks.accountSuspended,
        duplicateCampaignExists: verification.checks.duplicateCampaignExists,
        atAccountLimit: verification.checks.atAccountLimit,
        tokenValid: verification.checks.tokenValid,

        // Warnings and errors
        warnings: verification.warnings.length > 0 ? verification.warnings : null,
        errors: verification.reasons.length > 0 ? verification.reasons : null,

        // Current state snapshot
        currentCampaignCount: verification.currentState.currentCampaignCount,
        accountLimit: verification.currentState.accountLimit
      });

      console.log(`📝 [SafetyChecks] Verification logged: ID ${record.id}`);
      return record;

    } catch (error) {
      console.error('❌ [SafetyChecks] Failed to log verification:', error);
      // Don't throw - logging failure shouldn't block the main flow
      return null;
    }
  }
}

module.exports = SafetyChecks;
