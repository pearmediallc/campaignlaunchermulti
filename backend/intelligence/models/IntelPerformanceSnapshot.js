'use strict';

/**
 * IntelPerformanceSnapshot Model
 *
 * Stores hourly performance data for campaigns, ad sets, and ads.
 * Used for trend analysis and ML training.
 *
 * ISOLATION: This model is part of the Intelligence module and
 * does not directly interact with campaign management.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelPerformanceSnapshot = sequelize.define('IntelPerformanceSnapshot', {
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
      type: DataTypes.STRING,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.ENUM('campaign', 'adset', 'ad'),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entity_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    snapshot_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    snapshot_hour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Core metrics
    spend: {
      type: DataTypes.DECIMAL(12, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('spend');
        return value ? parseFloat(value) : 0;
      }
    },
    impressions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reach: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    conversions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    revenue: {
      type: DataTypes.DECIMAL(12, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('revenue');
        return value ? parseFloat(value) : 0;
      }
    },
    // Calculated metrics
    cpm: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('cpm');
        return value ? parseFloat(value) : 0;
      }
    },
    ctr: {
      type: DataTypes.DECIMAL(8, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('ctr');
        return value ? parseFloat(value) : 0;
      }
    },
    cpc: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('cpc');
        return value ? parseFloat(value) : 0;
      }
    },
    cpa: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('cpa');
        return value ? parseFloat(value) : 0;
      }
    },
    roas: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('roas');
        return value ? parseFloat(value) : 0;
      }
    },
    frequency: {
      type: DataTypes.DECIMAL(8, 4),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('frequency');
        return value ? parseFloat(value) : 0;
      }
    },
    // Status tracking
    effective_status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    learning_phase: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // ML-ready features
    hour_of_day: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    days_since_creation: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Raw data backup
    raw_insights: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'intel_performance_snapshots',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelPerformanceSnapshot.associate = function(models) {
    if (models.User) {
      IntelPerformanceSnapshot.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  };

  // Class methods

  /**
   * Get snapshots for an entity within a date range
   */
  IntelPerformanceSnapshot.getEntitySnapshots = async function(entityType, entityId, startDate, endDate) {
    return this.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        snapshot_date: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['snapshot_date', 'ASC'], ['snapshot_hour', 'ASC']]
    });
  };

  /**
   * Get latest snapshot for an entity
   */
  IntelPerformanceSnapshot.getLatestSnapshot = async function(entityType, entityId) {
    return this.findOne({
      where: {
        entity_type: entityType,
        entity_id: entityId
      },
      order: [['snapshot_date', 'DESC'], ['snapshot_hour', 'DESC']]
    });
  };

  /**
   * Get account performance summary for a date
   */
  IntelPerformanceSnapshot.getAccountDailySummary = async function(adAccountId, date) {
    const snapshots = await this.findAll({
      where: {
        ad_account_id: adAccountId,
        snapshot_date: date,
        entity_type: 'adset'
      }
    });

    return {
      total_spend: snapshots.reduce((sum, s) => sum + s.spend, 0),
      total_impressions: snapshots.reduce((sum, s) => sum + s.impressions, 0),
      total_clicks: snapshots.reduce((sum, s) => sum + s.clicks, 0),
      total_conversions: snapshots.reduce((sum, s) => sum + s.conversions, 0),
      total_revenue: snapshots.reduce((sum, s) => sum + s.revenue, 0),
      adset_count: snapshots.length
    };
  };

  return IntelPerformanceSnapshot;
};
