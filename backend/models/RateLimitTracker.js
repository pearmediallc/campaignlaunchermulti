'use strict';

module.exports = (sequelize, DataTypes) => {
  const RateLimitTracker = sequelize.define('RateLimitTracker', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    adAccountId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'ad_account_id'
    },
    callsUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'calls_used'
    },
    callsLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 200,
      field: 'calls_limit'
    },
    usagePercentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'usage_percentage'
    },
    windowResetAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'window_reset_at'
    },
    lastResponseHeaders: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'last_response_headers'
    }
  }, {
    tableName: 'rate_limit_tracker',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'ad_account_id']
      }
    ]
  });

  RateLimitTracker.associate = function(models) {
    RateLimitTracker.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return RateLimitTracker;
};
