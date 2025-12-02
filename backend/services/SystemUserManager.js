const db = require('../models');
const { SystemUser, InternalAdAccount } = db;

/**
 * Manages System User tokens for high-capacity API operations
 * System Users provide 10x rate limit capacity for internal ad accounts
 */
class SystemUserManager {
  /**
   * Check if an ad account is internal (belongs to our 14 Business Managers)
   * @param {String} adAccountId - Facebook Ad Account ID
   * @returns {Promise<Boolean>}
   */
  static async isInternalAccount(adAccountId) {
    try {
      const internalAccount = await InternalAdAccount.findOne({
        where: {
          adAccountId,
          isActive: true,
          useSystemUsers: true
        }
      });

      return !!internalAccount;
    } catch (error) {
      console.error('Error checking if account is internal:', error);
      return false;
    }
  }

  /**
   * Get an available System User token with capacity
   * Rotates through available System Users to distribute load
   * @returns {Promise<Object|null>} - { token, systemUserId, rateLimitUsed }
   */
  static async getAvailableSystemUser() {
    try {
      const now = new Date();

      // Find System Users whose rate limit has reset
      await SystemUser.update(
        {
          rateLimitUsed: 0,
          rateLimitResetAt: null
        },
        {
          where: {
            rateLimitResetAt: {
              [db.Sequelize.Op.lte]: now
            }
          }
        }
      );

      // Find System User with lowest usage (load balancing)
      const systemUser = await SystemUser.findOne({
        where: {
          isActive: true,
          [db.Sequelize.Op.or]: [
            { rateLimitUsed: { [db.Sequelize.Op.lt]: 180 } }, // Under 90% capacity
            { rateLimitResetAt: null }
          ]
        },
        order: [
          ['rateLimitUsed', 'ASC'],  // Lowest usage first
          ['id', 'ASC']  // Consistent ordering for same usage
        ]
      });

      if (!systemUser) {
        console.log('No available System Users with capacity');
        return null;
      }

      return {
        token: systemUser.accessToken,  // This calls the decrypt getter
        systemUserId: systemUser.id,
        rateLimitUsed: systemUser.rateLimitUsed
      };
    } catch (error) {
      console.error('Error getting available System User:', error);
      return null;
    }
  }

  /**
   * Increment rate limit usage for a System User
   * @param {Number} systemUserId - System User ID
   * @param {Number} incrementBy - Number of calls to add (default 1)
   */
  static async incrementUsage(systemUserId, incrementBy = 1) {
    try {
      const systemUser = await SystemUser.findByPk(systemUserId);
      if (!systemUser) return;

      const newUsage = systemUser.rateLimitUsed + incrementBy;

      await systemUser.update({
        rateLimitUsed: newUsage,
        rateLimitResetAt: newUsage >= 200 ? new Date(Date.now() + 3600000) : systemUser.rateLimitResetAt
      });

      console.log(`System User ${systemUserId} usage: ${newUsage}/200`);
    } catch (error) {
      console.error('Error incrementing System User usage:', error);
    }
  }

  /**
   * Update System User rate limit from Facebook response headers
   * @param {Number} systemUserId - System User ID
   * @param {Object} headers - Facebook API response headers
   */
  static async updateFromHeaders(systemUserId, headers) {
    try {
      const businessUseCaseUsage = headers['x-business-use-case-usage'];
      const appUsage = headers['x-app-usage'];

      if (!businessUseCaseUsage && !appUsage) return;

      const systemUser = await SystemUser.findByPk(systemUserId);
      if (!systemUser) return;

      // Parse Facebook's rate limit headers
      let callCount = 0;
      let resetTime = null;

      if (businessUseCaseUsage) {
        const usage = JSON.parse(businessUseCaseUsage);
        const accountData = Object.values(usage)[0]; // Get first ad account data
        if (accountData && accountData[0]) {
          callCount = accountData[0].call_count || 0;
          const totalTime = accountData[0].total_time || 3600;
          resetTime = new Date(Date.now() + (totalTime * 1000));
        }
      }

      await systemUser.update({
        rateLimitUsed: callCount,
        rateLimitResetAt: resetTime
      });

      console.log(`Updated System User ${systemUserId} from headers: ${callCount}/200`);
    } catch (error) {
      console.error('Error updating System User from headers:', error);
    }
  }

  /**
   * Add a new System User to the pool
   * @param {Object} data - System User data
   * @returns {Promise<Object>}
   */
  static async addSystemUser(data) {
    const { name, systemUserId, accessToken, businessManagerId } = data;

    try {
      const systemUser = await SystemUser.create({
        name,
        systemUserId,
        accessToken,  // Will be encrypted by setter
        businessManagerId,
        rateLimitUsed: 0,
        isActive: true
      });

      console.log(`Added new System User: ${name} (ID: ${systemUserId})`);
      return systemUser;
    } catch (error) {
      console.error('Error adding System User:', error);
      throw error;
    }
  }

  /**
   * Add an internal ad account to the whitelist
   * @param {Object} data - Ad account data
   * @returns {Promise<Object>}
   */
  static async addInternalAccount(data) {
    const { adAccountId, businessManagerId, businessManagerName } = data;

    try {
      const [account, created] = await InternalAdAccount.findOrCreate({
        where: { adAccountId },
        defaults: {
          businessManagerId,
          businessManagerName,
          useSystemUsers: true,
          isActive: true
        }
      });

      if (!created) {
        await account.update({
          businessManagerId,
          businessManagerName,
          isActive: true
        });
      }

      console.log(`${created ? 'Added' : 'Updated'} internal account: ${adAccountId}`);
      return account;
    } catch (error) {
      console.error('Error adding internal account:', error);
      throw error;
    }
  }

  /**
   * Get all System Users status
   * @returns {Promise<Array>}
   */
  static async getSystemUsersStatus() {
    try {
      const systemUsers = await SystemUser.findAll({
        attributes: ['id', 'name', 'systemUserId', 'businessManagerId', 'rateLimitUsed', 'rateLimitResetAt', 'isActive'],
        order: [['id', 'ASC']]
      });

      return systemUsers.map(su => ({
        id: su.id,
        name: su.name,
        systemUserId: su.systemUserId,
        businessManagerId: su.businessManagerId,
        usage: `${su.rateLimitUsed}/200`,
        usagePercent: ((su.rateLimitUsed / 200) * 100).toFixed(1),
        resetAt: su.rateLimitResetAt,
        isActive: su.isActive,
        available: su.rateLimitUsed < 180 && su.isActive
      }));
    } catch (error) {
      console.error('Error getting System Users status:', error);
      return [];
    }
  }
}

module.exports = SystemUserManager;
