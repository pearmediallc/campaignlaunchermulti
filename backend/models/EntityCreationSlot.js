'use strict';

/**
 * Entity Creation Slot Model
 *
 * Tracks individual entity (campaign, ad set, ad) creation within a job.
 * Uses slot-based tracking to prevent exceeding requested counts.
 *
 * Example: User requests 50 ad sets
 * - Slots 1-50 created with status='pending'
 * - As each ad set is created, slot status updates to 'created'
 * - Retry logic checks filled slots to calculate remaining needed
 * - Idempotency: Never create more than 50 total slots
 *
 * Status flow:
 * pending → creating → created
 *                   ↓
 *                 failed (then retry or rollback)
 *                   ↓
 *               rolled_back
 */

module.exports = (sequelize, DataTypes) => {
  const EntityCreationSlot = sequelize.define('EntityCreationSlot', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'job_id',
      references: {
        model: 'campaign_creation_jobs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },

    // Slot identification
    slotNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'slot_number',
      comment: 'Slot position (1 to N). Example: slots 1-50 for 50 ad sets'
    },
    entityType: {
      type: DataTypes.ENUM('campaign', 'ad_set', 'ad'),
      allowNull: false,
      field: 'entity_type'
    },

    // Entity details (filled once created)
    facebookId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'facebook_id',
      comment: 'Facebook entity ID once created'
    },
    entityName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'entity_name',
      comment: 'Entity name as it appears in Facebook'
    },

    // Status tracking
    status: {
      type: DataTypes.ENUM('pending', 'creating', 'created', 'failed', 'rolled_back'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'status'
    },

    // Timing
    creationStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'creation_started_at'
    },
    creationCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'creation_completed_at'
    },

    // Error tracking
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'retry_count'
    }
  }, {
    tableName: 'entity_creation_slots',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['job_id', 'slot_number', 'entity_type'],
        name: 'unique_slot_per_job'
      },
      {
        fields: ['job_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['facebook_id']
      },
      {
        fields: ['entity_type']
      }
    ]
  });

  EntityCreationSlot.associate = function(models) {
    EntityCreationSlot.belongsTo(models.CampaignCreationJob, {
      foreignKey: 'jobId',
      as: 'job'
    });
  };

  return EntityCreationSlot;
};
