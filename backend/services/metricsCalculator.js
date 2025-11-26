/**
 * MetricsCalculator Service
 *
 * Provides accurate Facebook advertising metrics calculations
 * with proper formulas matching Facebook Ads Manager standards.
 */

class MetricsCalculator {
  /**
   * Calculate CPM (Cost Per Mille / Cost Per 1000 Impressions)
   * Formula: (spend / impressions) * 1000
   */
  static calculateCPM(spend, impressions) {
    if (!impressions || impressions === 0 || !spend) return 0;
    return (spend / impressions) * 1000;
  }

  /**
   * Calculate CTR (Click-Through Rate)
   * Formula: (clicks / impressions) * 100
   */
  static calculateCTR(clicks, impressions) {
    if (!impressions || impressions === 0 || !clicks) return 0;
    return (clicks / impressions) * 100;
  }

  /**
   * Calculate CPC (Cost Per Click)
   * Formula: spend / clicks
   */
  static calculateCPC(spend, clicks) {
    if (!clicks || clicks === 0 || !spend) return 0;
    return spend / clicks;
  }

  /**
   * Calculate CPR (Cost Per Result/Conversion)
   * Formula: spend / results
   */
  static calculateCPR(spend, results) {
    if (!results || results === 0 || !spend) return 0;
    return spend / results;
  }

  /**
   * Calculate ROAS (Return On Ad Spend)
   * Formula: (revenue / spend) * 100
   */
  static calculateROAS(revenue, spend) {
    if (!spend || spend === 0 || !revenue) return 0;
    return (revenue / spend) * 100;
  }

  /**
   * Calculate Frequency (Average times ad shown per person)
   * Formula: impressions / reach
   */
  static calculateFrequency(impressions, reach) {
    if (!reach || reach === 0 || !impressions) return 0;
    return impressions / reach;
  }

  /**
   * Format metric value based on type with proper decimal places
   */
  static formatMetric(value, type) {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }

    switch (type) {
      case 'currency':
        // Format as currency with 2 decimal places
        return `$${value.toFixed(2)}`;

      case 'percentage':
        // Format as percentage with 2 decimal places
        return `${value.toFixed(2)}%`;

      case 'number':
        // Format as whole number with thousands separators
        return Math.round(value).toLocaleString();

      case 'rate':
        // Format rates (like CTR) with 4 decimal places for precision
        return value.toFixed(4);

      case 'frequency':
        // Format frequency with 2 decimal places
        return value.toFixed(2);

      default:
        return value.toString();
    }
  }

  /**
   * Calculate all metrics for a campaign/adset/ad
   * Returns object with all calculated metrics
   */
  static calculateAllMetrics(data) {
    const {
      spend = 0,
      impressions = 0,
      clicks = 0,
      reach = 0,
      results = 0,
      revenue = 0
    } = data || {};

    return {
      // Calculated metrics
      cpm: this.calculateCPM(spend, impressions),
      ctr: this.calculateCTR(clicks, impressions),
      cpc: this.calculateCPC(spend, clicks),
      cost_per_result: this.calculateCPR(spend, results),
      roas: this.calculateROAS(revenue, spend),
      frequency: this.calculateFrequency(impressions, reach),

      // Original raw values
      spend: spend || 0,
      impressions: impressions || 0,
      clicks: clicks || 0,
      reach: reach || 0,
      results: results || 0,
      revenue: revenue || 0
    };
  }

  /**
   * Safe metric calculation that handles errors gracefully
   */
  static safeCalculateMetrics(data) {
    try {
      return this.calculateAllMetrics(data);
    } catch (error) {
      console.error('⚠️ Error calculating metrics:', error.message);
      // Return safe default values
      return {
        cpm: 0,
        ctr: 0,
        cpc: 0,
        cost_per_result: 0,
        roas: 0,
        frequency: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        results: 0,
        revenue: 0
      };
    }
  }
}

module.exports = MetricsCalculator;
