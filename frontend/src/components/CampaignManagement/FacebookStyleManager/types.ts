/**
 * Type definitions for Facebook-Style Campaign Manager
 */

export interface IssueInfo {
  error_code?: number;
  error_message?: string;
  error_summary?: string;
  level?: 'ERROR' | 'WARNING';
}

export interface CampaignData {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  effective_status?: string;
  configured_status?: string;
  issues_info?: IssueInfo[];
  objective: string;
  budget?: number;
  daily_budget?: number;
  lifetime_budget?: number;
  metrics?: CampaignMetrics;
  adsets?: AdSetData[];
}

export interface AdSetData {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  effective_status?: string;
  configured_status?: string;
  issues_info?: IssueInfo[];
  campaign_id?: string;
  campaign_name?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  learning_status?: 'LEARNING' | 'SUCCESS' | 'FAIL' | 'WAIVING';
  learning_message?: string;
  learning_stage_info?: {
    status: string;
    attribution_windows?: string[];
  };
  metrics?: AdSetMetrics;
  ads?: AdData[];
}

export interface AdData {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  effective_status?: string;
  configured_status?: string;
  issues_info?: IssueInfo[];
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  creative?: {
    id: string;
    title?: string;
    body?: string;
    image_url?: string;
    video_id?: string;
    thumbnail_url?: string;
  };
  metrics?: AdMetrics;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  spend?: number;
  reach?: number;
  frequency?: number;
  results?: number;
  cost_per_result?: number;
  ctr?: number;
  cpm?: number;
}

export interface AdSetMetrics {
  impressions?: number;
  clicks?: number;
  spend?: number;
  reach?: number;
  frequency?: number;
  results?: number;
  cost_per_result?: number;
  ctr?: number;
  cpm?: number;
}

export interface AdMetrics {
  impressions?: number;
  clicks?: number;
  spend?: number;
  reach?: number;
  frequency?: number;
  results?: number;
  cost_per_result?: number;
  ctr?: number;
  cpm?: number;
}

export interface BulkAction {
  type: 'activate' | 'pause' | 'delete' | 'duplicate' | 'edit_budget';
  label: string;
  icon?: React.ReactNode;
}

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
}
