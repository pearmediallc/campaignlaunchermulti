/**
 * StatusEnhancer Service
 *
 * Fetches and parses enhanced status information from Facebook API
 * including learning phase, effective status, and issues/errors.
 */

const axios = require('axios');

class StatusEnhancer {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Get fields to fetch based on object type
   */
  getFieldsForType(objectType) {
    const commonFields = [
      'id',
      'name',
      'status',
      'effective_status',
      'configured_status',
      'issues_info',
      'recommendations'
    ];

    switch (objectType) {
      case 'campaign':
        return [
          ...commonFields,
          'objective',
          'budget_remaining',
          'daily_budget',
          'lifetime_budget',
          'learning_stage_info'
        ];

      case 'adset':
        return [
          ...commonFields,
          'learning_stage_info',
          'is_dynamic_creative',
          'optimization_goal',
          'bid_strategy',
          'daily_budget',
          'lifetime_budget'
        ];

      case 'ad':
        return [
          ...commonFields,
          'preview_shareable_link',
          'creative'
        ];

      default:
        return commonFields;
    }
  }

  /**
   * Get comprehensive status for a single object (campaign/adset/ad)
   */
  async getEnhancedStatus(objectId, objectType) {
    try {
      const fields = this.getFieldsForType(objectType);

      const response = await axios.get(`${this.baseUrl}/${objectId}`, {
        params: {
          fields: fields.join(','),
          access_token: this.accessToken
        }
      });

      return this.parseStatusResponse(response.data, objectType);
    } catch (error) {
      console.error(`⚠️ Failed to fetch enhanced status for ${objectType} ${objectId}:`, error.message);

      // Return safe fallback
      return {
        id: objectId,
        status: 'unknown',
        effectiveStatus: 'unknown',
        configuredStatus: 'unknown',
        learningStage: null,
        issues: [],
        recommendations: []
      };
    }
  }

  /**
   * Parse status response from Facebook API
   */
  parseStatusResponse(data, objectType) {
    return {
      id: data.id,
      name: data.name,
      status: data.status,
      effectiveStatus: data.effective_status,
      configuredStatus: data.configured_status,
      learningStage: this.parseLearningStage(data.learning_stage_info),
      issues: this.parseIssues(data.issues_info),
      recommendations: data.recommendations || [],
      // Type-specific data
      ...(objectType === 'adset' && {
        optimizationGoal: data.optimization_goal,
        bidStrategy: data.bid_strategy,
        isDynamicCreative: data.is_dynamic_creative
      })
    };
  }

  /**
   * Parse learning stage information
   */
  parseLearningStage(learningInfo) {
    if (!learningInfo) {
      return {
        status: 'not_applicable',
        phase: null,
        details: null
      };
    }

    return {
      status: learningInfo.status || 'unknown', // 'learning', 'graduated', 'not_learning'
      phase: learningInfo.learning_stage_name || null,
      details: {
        attributionWindows: learningInfo.attribution_windows,
        minRequiredEvents: learningInfo.min_required_events,
        currentEvents: learningInfo.current_events,
        lastSigEditTs: learningInfo.last_sig_edit_ts
      }
    };
  }

  /**
   * Parse issues and errors
   */
  parseIssues(issuesInfo) {
    if (!issuesInfo || !issuesInfo.issues || issuesInfo.issues.length === 0) {
      return [];
    }

    return issuesInfo.issues.map(issue => ({
      level: issue.level || 'INFO', // 'WARNING', 'ERROR', 'INFO'
      type: issue.error_code,
      errorCode: issue.error_code,
      message: issue.error_summary || issue.error_message,
      description: issue.error_message,
      errorUserTitle: issue.error_user_title,
      errorUserMsg: issue.error_user_msg
    }));
  }

  /**
   * Batch get enhanced status for multiple objects
   */
  async getBatchEnhancedStatus(objects) {
    try {
      const promises = objects.map(obj =>
        this.getEnhancedStatus(obj.id, obj.type)
          .catch(error => {
            console.error(`Error fetching status for ${obj.type} ${obj.id}:`, error.message);
            return null;
          })
      );

      const results = await Promise.all(promises);

      // Filter out null results (failed requests)
      return results.filter(result => result !== null);
    } catch (error) {
      console.error('⚠️ Batch status fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Get status color/severity for UI display
   */
  static getStatusSeverity(status, issues = []) {
    // Check for errors first
    const hasErrors = issues.some(issue => issue.level === 'ERROR');
    if (hasErrors) return 'error';

    // Check for warnings
    const hasWarnings = issues.some(issue => issue.level === 'WARNING');
    if (hasWarnings) return 'warning';

    // Check effective status
    const effectiveStatus = (status || '').toUpperCase();

    switch (effectiveStatus) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
      case 'ARCHIVED':
        return 'default';
      case 'DELETED':
        return 'error';
      case 'IN_PROCESS':
      case 'PENDING_REVIEW':
        return 'info';
      default:
        return 'default';
    }
  }

  /**
   * Get learning phase display info
   */
  static getLearningPhaseDisplay(learningStage) {
    if (!learningStage || learningStage.status === 'not_applicable') {
      return null;
    }

    const { status, phase } = learningStage;

    return {
      label: phase || status,
      color: status === 'learning' ? 'warning' : status === 'graduated' ? 'success' : 'default',
      icon: status === 'learning' ? 'school' : 'check_circle'
    };
  }
}

module.exports = StatusEnhancer;
