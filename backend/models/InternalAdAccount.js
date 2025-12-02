'use strict';

module.exports = (sequelize, DataTypes) => {
  const InternalAdAccount = sequelize.define('InternalAdAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    adAccountId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'ad_account_id'
    },
    businessManagerId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'business_manager_id'
    },
    businessManagerName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'business_manager_name'
    },
    useSystemUsers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'use_system_users'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'internal_ad_accounts',
    underscored: true,
    timestamps: true
  });

  return InternalAdAccount;
};
