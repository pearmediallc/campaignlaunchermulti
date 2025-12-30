'use strict';

/**
 * IntelPixelHealth Model
 *
 * Tracks pixel health metrics including Event Match Quality (EMQ),
 * event counts, and server-side tracking status.
 *
 * ISOLATION: Read-only access to pixel data, never modifies pixels.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelPixelHealth = sequelize.define('IntelPixelHealth', {
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
    pixel_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pixel_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Health metrics
    event_match_quality: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('event_match_quality');
        return value ? parseFloat(value) : null;
      }
    },
    last_fired_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Event counts (24 hour window)
    page_view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    view_content_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    add_to_cart_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    initiate_checkout_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    purchase_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lead_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    complete_registration_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Server-side tracking
    has_server_events: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    server_event_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('server_event_percentage');
        return value ? parseFloat(value) : 0;
      }
    },
    // Domain verification
    domain_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    domain_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Raw data
    raw_pixel_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    snapshot_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'intel_pixel_health',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelPixelHealth.associate = function(models) {
    if (models.User) {
      IntelPixelHealth.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  };

  // Instance methods

  /**
   * Calculate overall pixel health score (0-100)
   */
  IntelPixelHealth.prototype.calculateHealthScore = function() {
    let score = 0;

    // EMQ contributes up to 40 points (EMQ is 0-10 scale)
    if (this.event_match_quality) {
      score += (this.event_match_quality / 10) * 40;
    }

    // Activity contributes up to 20 points
    if (this.is_active) {
      score += 20;
    }

    // Server events contribute up to 20 points
    if (this.has_server_events) {
      score += Math.min(20, (this.server_event_percentage / 100) * 20);
    }

    // Domain verification contributes 10 points
    if (this.domain_verified) {
      score += 10;
    }

    // Event diversity contributes up to 10 points
    const eventTypes = [
      this.page_view_count,
      this.view_content_count,
      this.add_to_cart_count,
      this.initiate_checkout_count,
      this.purchase_count,
      this.lead_count,
      this.complete_registration_count
    ].filter(count => count > 0).length;
    score += Math.min(10, eventTypes * 1.5);

    return Math.round(score);
  };

  /**
   * Get funnel conversion rates
   */
  IntelPixelHealth.prototype.getFunnelRates = function() {
    const pageViews = this.page_view_count || 1;
    const viewContent = this.view_content_count || 0;
    const addToCart = this.add_to_cart_count || 0;
    const initiateCheckout = this.initiate_checkout_count || 0;
    const purchase = this.purchase_count || 0;

    return {
      view_to_atc: viewContent > 0 ? (addToCart / viewContent * 100).toFixed(2) : 0,
      atc_to_checkout: addToCart > 0 ? (initiateCheckout / addToCart * 100).toFixed(2) : 0,
      checkout_to_purchase: initiateCheckout > 0 ? (purchase / initiateCheckout * 100).toFixed(2) : 0,
      overall_conversion: pageViews > 0 ? (purchase / pageViews * 100).toFixed(4) : 0
    };
  };

  // Class methods

  /**
   * Get latest pixel health for a user (one record per unique pixel)
   * Uses DISTINCT ON to get the most recent snapshot for each pixel
   */
  IntelPixelHealth.getLatestForUser = async function(userId) {
    // Use raw SQL with DISTINCT ON to get latest snapshot per pixel
    // Note: With type: QueryTypes.SELECT, sequelize returns results directly (not [results, metadata])
    const results = await sequelize.query(`
      SELECT DISTINCT ON (pixel_id)
        id, user_id, ad_account_id, pixel_id, pixel_name, snapshot_date,
        event_match_quality, last_fired_time, is_active,
        page_view_count, view_content_count, add_to_cart_count,
        initiate_checkout_count, purchase_count, lead_count,
        complete_registration_count, has_server_events, server_event_percentage,
        domain_verified, domain_name, created_at, updated_at
      FROM intel_pixel_health
      WHERE user_id = :userId
      ORDER BY pixel_id, snapshot_date DESC
    `, {
      replacements: { userId },
      type: sequelize.Sequelize.QueryTypes.SELECT
    });

    if (!results || !Array.isArray(results) || results.length === 0) return [];

    // Convert to model instances for instance methods like calculateHealthScore
    return results.map(r => this.build(r, { isNewRecord: false }));
  };

  /**
   * Get pixel health history
   */
  IntelPixelHealth.getPixelHistory = async function(pixelId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.findAll({
      where: {
        pixel_id: pixelId,
        snapshot_date: {
          [sequelize.Sequelize.Op.gte]: startDate.toISOString().split('T')[0]
        }
      },
      order: [['snapshot_date', 'ASC']]
    });
  };

  return IntelPixelHealth;
};
