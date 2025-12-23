'use strict';

/**
 * IntelBackfillProgress Model
 *
 * Tracks historical data backfill progress for each ad account.
 * Used to show users how much data has been collected and
 * to resume interrupted backfills.
 */

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class IntelBackfillProgress extends Model {
    /**
     * Get or create backfill progress for an account
     */
    static async getOrCreate(userId, adAccountId, options = {}) {
      const [record, created] = await this.findOrCreate({
        where: {
          user_id: userId,
          ad_account_id: adAccountId
        },
        defaults: {
          backfill_type: options.type || 'insights',
          status: 'pending',
          start_date: options.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end_date: options.endDate || new Date(),
          total_days: options.totalDays || 90,
          days_completed: 0
        }
      });

      return { record, created };
    }

    /**
     * Update progress
     */
    async updateProgress(daysCompleted, currentDate = null) {
      await this.update({
        days_completed: daysCompleted,
        current_date: currentDate,
        last_fetch_at: new Date(),
        status: daysCompleted >= this.total_days ? 'completed' : 'in_progress'
      });
    }

    /**
     * Mark as failed
     */
    async markFailed(errorMessage) {
      await this.update({
        status: 'failed',
        error_message: errorMessage,
        last_fetch_at: new Date()
      });
    }

    /**
     * Get completion percentage
     */
    getCompletionPercentage() {
      if (this.total_days === 0) return 100;
      return Math.round((this.days_completed / this.total_days) * 100);
    }

    /**
     * Get all pending or in-progress backfills
     */
    static async getPending() {
      return this.findAll({
        where: {
          status: ['pending', 'in_progress']
        },
        order: [['created_at', 'ASC']]
      });
    }

    /**
     * Get backfill status for a user
     */
    static async getUserStatus(userId) {
      const records = await this.findAll({
        where: { user_id: userId },
        order: [['updated_at', 'DESC']]
      });

      const summary = {
        total_accounts: records.length,
        completed: records.filter(r => r.status === 'completed').length,
        in_progress: records.filter(r => r.status === 'in_progress').length,
        pending: records.filter(r => r.status === 'pending').length,
        failed: records.filter(r => r.status === 'failed').length,
        overall_progress: 0
      };

      if (records.length > 0) {
        const totalDays = records.reduce((sum, r) => sum + r.total_days, 0);
        const completedDays = records.reduce((sum, r) => sum + r.days_completed, 0);
        summary.overall_progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
      }

      return {
        accounts: records.map(r => ({
          ad_account_id: r.ad_account_id,
          backfill_type: r.backfill_type,
          status: r.status,
          progress: r.getCompletionPercentage(),
          days_completed: r.days_completed,
          total_days: r.total_days,
          start_date: r.start_date,
          end_date: r.end_date,
          current_date: r.current_date,
          error_message: r.error_message,
          last_fetch_at: r.last_fetch_at
        })),
        summary
      };
    }
  }

  IntelBackfillProgress.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ad_account_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // Type of backfill
    backfill_type: {
      type: DataTypes.ENUM('insights', 'pixel', 'all'),
      allowNull: false,
      defaultValue: 'insights'
    },
    // Status
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed', 'paused'),
      allowNull: false,
      defaultValue: 'pending'
    },
    // Date range
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Start date for backfill (oldest date)'
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'End date for backfill (most recent date)'
    },
    current_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Current date being processed'
    },
    // Progress tracking
    total_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 90
    },
    days_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Detailed stats
    campaigns_fetched: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    adsets_fetched: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ads_fetched: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    snapshots_created: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Error handling
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Timing
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_fetch_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Estimated time remaining (in seconds)
    estimated_remaining_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'IntelBackfillProgress',
    tableName: 'intel_backfill_progress',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['ad_account_id'] },
      { fields: ['status'] },
      { fields: ['user_id', 'ad_account_id'], unique: true }
    ]
  });

  return IntelBackfillProgress;
};
