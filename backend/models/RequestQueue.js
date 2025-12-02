'use strict';
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const RequestQueue = sequelize.define('RequestQueue', {
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
    actionType: {
      type: DataTypes.ENUM(
        'create_campaign',
        'create_adset',
        'create_ad',
        'update_campaign',
        'update_adset',
        'update_ad',
        'duplicate_campaign',
        'batch_operation'
      ),
      allowNull: false,
      field: 'action_type'
    },
    requestData: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'request_data'
    },
    accessTokenEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'access_token_encrypted',
      // Getter to decrypt token
      get() {
        const rawValue = this.getDataValue('accessTokenEncrypted');
        if (!rawValue) return null;
        return this.constructor.decrypt(rawValue);
      },
      // Setter to encrypt token
      set(value) {
        if (value) {
          this.setDataValue('accessTokenEncrypted', this.constructor.encrypt(value));
        }
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'queued'
    },
    processAfter: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'process_after'
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'max_attempts'
    },
    result: {
      type: DataTypes.JSON,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at'
    }
  }, {
    tableName: 'request_queue',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['status', 'process_after']
      },
      {
        fields: ['user_id']
      }
    ]
  });

  // Static methods for encryption/decryption (same as FacebookAuth)
  RequestQueue.encrypt = function(text) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex')
    });
  };

  RequestQueue.decrypt = function(data) {
    try {
      const { encrypted, authTag, iv } = JSON.parse(data);
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

  RequestQueue.associate = function(models) {
    RequestQueue.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return RequestQueue;
};
