/**
 * Intelligence API Service
 *
 * API client for the Campaign Intelligence Engine.
 * All endpoints require authentication.
 */

import api from './api';

// Types
export interface AccountScore {
  ad_account_id: string;
  overall_score: number;
  grade: string;
  status: string;
  trend: 'improving' | 'stable' | 'declining';
  trend_percentage: number;
  components: {
    performance: number;
    efficiency: number;
    pixel_health: number;
    learning: number;
    consistency: number;
  };
  improvement_priority: {
    component: string;
    score: number;
    recommendation: string;
  };
  recommendations: string[];
}

export interface PendingAction {
  id: number;
  entity_type: 'campaign' | 'adset' | 'ad';
  entity_id: string;
  entity_name: string;
  action_type: string;
  action_params: any;
  description: string;
  trigger_reason: string;
  trigger_metrics: any[];
  model_confidence: number | null;
  expires_at: string;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  description: string;
  rule_type: string;
  entity_type: string;
  conditions: Array<{
    metric: string;
    operator: string;
    value: number | string;
  }>;
  condition_logic: 'AND' | 'OR';
  actions: Array<{
    action: string;
    params?: any;
  }>;
  is_active: boolean;
  requires_approval: boolean;
  cooldown_hours: number;
  evaluation_window_hours: number;
  times_triggered: number;
  last_triggered_at: string | null;
}

export interface Notification {
  id: number;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  action_id?: number;
  is_read: boolean;
  action_buttons?: Array<{
    label: string;
    action: string;
    style?: string;
  }>;
  created_at: string;
}

export interface PixelHealth {
  id: string;
  name: string;
  health_score: number;
  emq: number | null;
  is_active: boolean;
  has_server_events: boolean;
  funnel: {
    view_to_atc: number;
    atc_to_checkout: number;
    checkout_to_purchase: number;
    overall_conversion: number;
  };
}

export interface Pattern {
  type: string;
  name: string;
  description: string;
  confidence: string;
  sample_size: number;
  valid_until: string;
}

export interface DashboardData {
  account_scores: {
    hasData: boolean;
    summary?: {
      total_accounts: number;
      average_score: number;
      best_account: { id: string; score: number; grade: string } | null;
      worst_account: { id: string; score: number; grade: string } | null;
    };
    accounts?: AccountScore[];
    trends?: Record<string, Array<{ date: string; score: number }>>;
  };
  notifications: {
    unread_count: number;
    recent: Notification[];
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
    has_critical: boolean;
  };
  pending_actions: PendingAction[];
  patterns: {
    total_patterns: number;
    by_type: Record<string, number>;
    insights: Pattern[];
  };
}

export interface RuleTemplate {
  name: string;
  description: string;
  rule_type: string;
  entity_type: string;
  conditions: Array<{
    metric: string;
    operator: string;
    value: number | string;
  }>;
  condition_logic: 'AND' | 'OR';
  actions: Array<{
    action: string;
    params?: any;
  }>;
  requires_approval: boolean;
  cooldown_hours: number;
  evaluation_window_hours: number;
}

export interface ExpertRule {
  id: number;
  vertical: string;
  rule_type: 'kill' | 'scale' | 'benchmark' | 'targeting' | 'structure';
  name: string;
  description: string;
  conditions: Array<{ metric: string; operator: string; value: any }> | Record<string, any>;
  actions?: Array<{ action: string; params?: any }>;
  confidence_score: number;
  expert_count: number;
  is_active: boolean;
  created_at: string;
  campaign_structure?: string | Record<string, any>;
  winning_states?: {
    winning?: Array<{ state: string; count: number }>;
    excluded?: Array<{ state: string }>;
  };
  times_validated?: number;
  validation_accuracy?: number | null;
}

export interface BackfillProgress {
  id: number;
  ad_account_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  start_date: string;
  end_date: string;
  current_date: string | null;
  days_completed: number;
  total_days: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  backfill_type?: string;
  progress?: number;
  last_fetch_at?: string | null;
}

export interface BackfillStatus {
  success: boolean;
  accounts: BackfillProgress[];
  summary?: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    paused: number;
    total_accounts?: number;
    overall_progress?: number;
  };
}

export interface TrainingStatus {
  data_points: number;
  patterns_learned?: number;
  pixel_data_points: number;
  expert_rules_loaded: number;
  readiness: {
    data: number;
    patterns: number;
    expert: number;
    overall: number;
  };
  status: 'collecting' | 'learning' | 'ready' | 'error';
  last_learning_run: string | null;
  data_readiness?: number;
  min_required?: number;
  expert_rules?: number;  // Number of expert rules
  average_confidence?: number;
  pattern_breakdown?: Record<string, number>;
  backfill?: {
    status: string;
    progress: number;
    completed?: number;
    total_accounts?: number;
    overall_progress?: number;
  };
}

export interface TrainingHistory {
  data_collection: Array<{ date: string; count: number }>;
  pattern_creation: Array<{ date: string; type: string; count: number }>;
}

export interface ClusterVisualization {
  centroids: number[][];
  feature_names: string[];
  cluster_sizes: number[];
  cluster_descriptions: string[];
  k: number;
  sample_size: number;
  confidence: number;
}

export const intelligenceApi = {
  // Health & Status
  getHealth: async () => {
    const response = await api.get('/intelligence/health');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/intelligence/status');
    return response.data;
  },

  // Dashboard
  getDashboard: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const response = await api.get('/intelligence/dashboard');
    return response.data;
  },

  // Account Scores
  getScores: async () => {
    const response = await api.get('/intelligence/scores');
    return response.data;
  },

  getAccountScore: async (adAccountId: string) => {
    const response = await api.get(`/intelligence/scores/${adAccountId}`);
    return response.data;
  },

  // Automation Rules
  getRules: async (options?: { active_only?: boolean; rule_type?: string }) => {
    const params = new URLSearchParams();
    if (options?.active_only) params.append('active_only', 'true');
    if (options?.rule_type) params.append('rule_type', options.rule_type);
    const response = await api.get(`/intelligence/rules?${params}`);
    return response.data;
  },

  getRuleTemplates: async (): Promise<{ success: boolean; templates: RuleTemplate[] }> => {
    const response = await api.get('/intelligence/rules/templates');
    return response.data;
  },

  createRule: async (rule: Partial<AutomationRule>) => {
    const response = await api.post('/intelligence/rules', rule);
    return response.data;
  },

  updateRule: async (ruleId: number, updates: Partial<AutomationRule>) => {
    const response = await api.put(`/intelligence/rules/${ruleId}`, updates);
    return response.data;
  },

  deleteRule: async (ruleId: number) => {
    const response = await api.delete(`/intelligence/rules/${ruleId}`);
    return response.data;
  },

  getRuleStats: async () => {
    const response = await api.get('/intelligence/rules/stats');
    return response.data;
  },

  // Actions
  getPendingActions: async (): Promise<{ success: boolean; actions: PendingAction[] }> => {
    const response = await api.get('/intelligence/actions/pending');
    return response.data;
  },

  getActionHistory: async (options?: { limit?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.status) params.append('status', options.status);
    const response = await api.get(`/intelligence/actions/history?${params}`);
    return response.data;
  },

  approveAction: async (actionId: number) => {
    const response = await api.post(`/intelligence/actions/${actionId}/approve`);
    return response.data;
  },

  rejectAction: async (actionId: number, reason?: string) => {
    const response = await api.post(`/intelligence/actions/${actionId}/reject`, { reason });
    return response.data;
  },

  getActionStats: async (days?: number) => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get(`/intelligence/actions/stats${params}`);
    return response.data;
  },

  // Notifications
  getNotifications: async (options?: { page?: number; limit?: number; include_read?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.include_read !== undefined) params.append('include_read', options.include_read.toString());
    const response = await api.get(`/intelligence/notifications?${params}`);
    return response.data;
  },

  getUnreadNotifications: async (): Promise<{ success: boolean; notifications: Notification[]; count: number }> => {
    const response = await api.get('/intelligence/notifications/unread');
    return response.data;
  },

  markNotificationRead: async (notificationId: number) => {
    const response = await api.post(`/intelligence/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.post('/intelligence/notifications/read-all');
    return response.data;
  },

  handleNotificationAction: async (notificationId: number, action: string) => {
    const response = await api.post(`/intelligence/notifications/${notificationId}/action`, { action });
    return response.data;
  },

  // Pixel Health
  getPixelHealth: async (): Promise<{ success: boolean; pixels: PixelHealth[]; summary: any }> => {
    const response = await api.get('/intelligence/pixels');
    return response.data;
  },

  getPixelTrends: async (pixelId: string, days?: number) => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get(`/intelligence/pixels/${pixelId}/trends${params}`);
    return response.data;
  },

  // Patterns & Performance
  getPatterns: async () => {
    const response = await api.get('/intelligence/patterns');
    return response.data;
  },

  getEntityPerformance: async (entityType: string, entityId: string, days?: number) => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get(`/intelligence/performance/${entityType}/${entityId}${params}`);
    return response.data;
  },

  // Admin - Manual Jobs
  runJob: async (jobName: string) => {
    const response = await api.post(`/intelligence/jobs/${jobName}/run`);
    return response.data;
  },

  // Expert Rules
  getExpertRules: async (options?: { vertical?: string; rule_type?: string }): Promise<{ success: boolean; rules: ExpertRule[] }> => {
    const params = new URLSearchParams();
    if (options?.vertical) params.append('vertical', options.vertical);
    if (options?.rule_type) params.append('rule_type', options.rule_type);
    const response = await api.get(`/intelligence/expert-rules?${params}`);
    return response.data;
  },

  getExpertRulesSummary: async (): Promise<{ success: boolean; summary: any }> => {
    const response = await api.get('/intelligence/expert-rules/summary');
    return response.data;
  },

  getExpertBenchmarks: async (vertical?: string): Promise<{ success: boolean; benchmarks: any[] }> => {
    const params = vertical ? `?vertical=${vertical}` : '';
    const response = await api.get(`/intelligence/expert-rules/benchmarks${params}`);
    return response.data;
  },

  updateExpertRule: async (ruleId: number, updates: Partial<ExpertRule>) => {
    const response = await api.put(`/intelligence/expert-rules/${ruleId}`, updates);
    return response.data;
  },

  // Backfill
  getBackfillStatus: async (): Promise<{ success: boolean; accounts: BackfillProgress[] }> => {
    const response = await api.get('/intelligence/backfill/status');
    return response.data;
  },

  startBackfill: async (adAccountId: string, days?: number, backfillType?: string): Promise<{ success: boolean; progress: BackfillProgress }> => {
    const response = await api.post('/intelligence/backfill/start', {
      ad_account_id: adAccountId,
      days: days || 90,
      backfill_type: backfillType || 'all'
    });
    return response.data;
  },

  startBatchBackfill: async (adAccountIds: string[], days?: number, type?: string): Promise<{
    success: boolean;
    message: string;
    results: {
      started: string[];
      skipped: Array<{ ad_account_id: string; reason: string }>;
      errors: Array<{ ad_account_id: string; error: string }>;
    };
  }> => {
    const response = await api.post('/intelligence/backfill/batch', {
      adAccountIds,
      days: days || 90,
      type: type || 'all'
    });
    return response.data;
  },

  fetchPixelData: async (pixelId: string, days?: number): Promise<{
    success: boolean;
    message: string;
    pixel: {
      id: string;
      name: string;
      is_active: boolean;
      ad_account_id: string;
    };
  }> => {
    const response = await api.post('/intelligence/pixel/fetch', {
      pixelId,
      days: days || 90
    });
    return response.data;
  },

  fetchBatchPixelData: async (pixelIds: string[], days?: number): Promise<{
    success: boolean;
    message: string;
    results: {
      started: Array<{ pixel_id: string; name: string; ad_account_id: string }>;
      failed: Array<{ pixel_id: string; error: string }>;
    };
  }> => {
    const response = await api.post('/intelligence/pixel/fetch-batch', {
      pixelIds,
      days: days || 90
    });
    return response.data;
  },

  pauseBackfill: async (adAccountId: string) => {
    const response = await api.post('/intelligence/backfill/pause', { ad_account_id: adAccountId });
    return response.data;
  },

  cancelBackfill: async (adAccountId: string) => {
    const response = await api.delete(`/intelligence/backfill/${adAccountId}`);
    return response.data;
  },

  // Training Analytics
  getTrainingStatus: async (): Promise<{ success: boolean; status: TrainingStatus }> => {
    const response = await api.get('/intelligence/training/status');
    return response.data;
  },

  getTrainingHistory: async (days?: number): Promise<{ success: boolean; history: TrainingHistory }> => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get(`/intelligence/training/history${params}`);
    return response.data;
  },

  getClusterVisualization: async (): Promise<{ success: boolean; clusters: ClusterVisualization }> => {
    const response = await api.get('/intelligence/training/clusters');
    return response.data;
  },

  // Alias for cluster visualization
  getClusterData: async (): Promise<{ success: boolean; clusters: ClusterVisualization }> => {
    const response = await api.get('/intelligence/training/clusters');
    return response.data;
  },

  // Manual Training Triggers
  triggerPatternLearning: async (): Promise<{ success: boolean; message: string; data_points?: number }> => {
    const response = await api.post('/intelligence/training/learn');
    return response.data;
  },

  triggerScoreCalculation: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/intelligence/training/calculate-scores');
    return response.data;
  },

  // Resume incomplete backfills
  resumeIncompleteBackfills: async (): Promise<{
    success: boolean;
    message: string;
    resumed: Array<{
      ad_account_id: string;
      days_completed: number;
      total_days: number;
      resuming_from_day: number;
    }>;
    skipped: Array<{ ad_account_id: string; reason: string }>;
    errors: Array<{ ad_account_id: string; error: string }>;
  }> => {
    const response = await api.post('/intelligence/backfill/resume-all');
    return response.data;
  },

  // Top performers
  getTopPerformers: async (options?: {
    metric?: 'roas' | 'ctr' | 'cpc' | 'conversions' | 'spend';
    min_spend?: number;
    limit?: number;
    entity_type?: 'campaign' | 'adset' | 'ad' | 'all';
    days?: number;
  }): Promise<{
    success: boolean;
    metric: string;
    days: number;
    performers: {
      campaigns: Array<{
        entity_id: string;
        entity_name: string;
        ad_account_id: string;
        spend: number;
        revenue: number;
        roas: number;
        clicks: number;
        impressions: number;
        conversions: number;
        ctr: number;
        cpc: number;
        days_active: number;
      }>;
      adsets: Array<{
        entity_id: string;
        entity_name: string;
        campaign_id: string;
        ad_account_id: string;
        spend: number;
        revenue: number;
        roas: number;
        clicks: number;
        impressions: number;
        conversions: number;
        ctr: number;
        cpc: number;
        days_active: number;
      }>;
      ads: Array<{
        entity_id: string;
        entity_name: string;
        adset_id: string;
        campaign_id: string;
        ad_account_id: string;
        spend: number;
        revenue: number;
        roas: number;
        clicks: number;
        impressions: number;
        conversions: number;
        ctr: number;
        cpc: number;
        days_active: number;
      }>;
    };
  }> => {
    const params = new URLSearchParams();
    if (options?.metric) params.append('metric', options.metric);
    if (options?.min_spend !== undefined) params.append('min_spend', options.min_spend.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.entity_type) params.append('entity_type', options.entity_type);
    if (options?.days) params.append('days', options.days.toString());
    const response = await api.get(`/intelligence/top-performers?${params}`);
    return response.data;
  },

  // Campaigns list with ad accounts
  getCampaignsList: async (options?: {
    ad_account_id?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    campaigns: Array<{
      campaign_id: string;
      campaign_name: string;
      ad_account_id: string;
      objective: string;
      status: string;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      ads: Array<{
        ad_id: string;
        ad_name: string;
        adset_id: string;
        creative_id: string;
        status: string;
        spend: number;
      }>;
    }>;
  }> => {
    const params = new URLSearchParams();
    if (options?.ad_account_id) params.append('ad_account_id', options.ad_account_id);
    if (options?.limit) params.append('limit', options.limit.toString());
    const response = await api.get(`/intelligence/campaigns-list?${params}`);
    return response.data;
  },
};

export default intelligenceApi;
