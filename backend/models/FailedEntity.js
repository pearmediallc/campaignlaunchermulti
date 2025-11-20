module.exports = (sequelize, DataTypes) => {
  const FailedEntity = sequelize.define('FailedEntity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    campaignId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Facebook Campaign ID'
    },
    campaignName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'User-defined campaign name'
    },
    adsetId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Facebook Ad Set ID'
    },
    adsetName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ad Set name'
    },
    adId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Facebook Ad ID'
    },
    adName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ad name'
    },
    entityType: {
      type: DataTypes.ENUM('campaign', 'adset', 'ad'),
      allowNull: false,
      comment: 'Type of entity that failed'
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Technical failure reason (stack trace, raw error)'
    },
    userFriendlyReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'User-friendly error message'
    },
    errorCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Facebook API error code'
    },
    facebookError: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Complete Facebook error response object'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of retry attempts made'
    },
    status: {
      type: DataTypes.ENUM('failed', 'retrying', 'recovered', 'permanent_failure'),
      allowNull: false,
      defaultValue: 'failed',
      comment: 'Current status of the failed entity'
    },
    strategyType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Strategy type: strategyForAds, strategyForAll, strategy150'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata: budget, targeting, etc.'
    },
    recoveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when entity was successfully recovered'
    }
  }, {
    tableName: 'FailedEntities',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['campaignId'] },
      { fields: ['status'] },
      { fields: ['entityType'] },
      { fields: ['userId', 'campaignId'] },
      { fields: ['userId', 'status'] }
    ]
  });

  FailedEntity.associate = function(models) {
    FailedEntity.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Instance methods
  FailedEntity.prototype.markAsRecovered = async function() {
    this.status = 'recovered';
    this.recoveredAt = new Date();
    return await this.save();
  };

  FailedEntity.prototype.markAsRetrying = async function() {
    this.status = 'retrying';
    this.retryCount += 1;
    return await this.save();
  };

  FailedEntity.prototype.markAsPermanentFailure = async function() {
    this.status = 'permanent_failure';
    return await this.save();
  };

  // Class methods
  FailedEntity.getFailuresByCampaign = async function(userId, campaignId) {
    return await FailedEntity.findAll({
      where: { userId, campaignId },
      order: [['createdAt', 'DESC']]
    });
  };

  FailedEntity.getFailuresByUser = async function(userId, options = {}) {
    const where = { userId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.entityType) {
      where.entityType = options.entityType;
    }

    return await FailedEntity.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 100
    });
  };

  FailedEntity.getPendingFailures = async function(userId, campaignId = null) {
    const where = {
      userId,
      status: ['failed', 'retrying']
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    return await FailedEntity.findAll({
      where,
      order: [['createdAt', 'ASC']]
    });
  };

  return FailedEntity;
};
