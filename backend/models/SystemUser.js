'use strict';
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const SystemUser = sequelize.define('SystemUser', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    systemUserId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'system_user_id'
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'access_token',
      // Getter to decrypt token
      get() {
        const rawValue = this.getDataValue('accessToken');
        if (!rawValue) return null;
        return this.constructor.decrypt(rawValue);
      },
      // Setter to encrypt token
      set(value) {
        if (value) {
          this.setDataValue('accessToken', this.constructor.encrypt(value));
        }
      }
    },
    businessManagerId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'business_manager_id'
    },
    rateLimitUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'rate_limit_used'
    },
    rateLimitResetAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'rate_limit_reset_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'system_users',
    underscored: true,
    timestamps: true
  });

  // Static methods for encryption/decryption (same as FacebookAuth)
  SystemUser.encrypt = function(text) {
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

  SystemUser.decrypt = function(data) {
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

  return SystemUser;
};
