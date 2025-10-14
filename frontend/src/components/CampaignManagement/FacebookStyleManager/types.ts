/**
 * Type definitions for Facebook-Style Campaign Manager
 */

export interface CampaignData {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
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
  campaign_id?: string;
  campaign_name?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  learning_status?: 'LEARNING' | 'SUCCESS' | 'FAIL' | 'WAIVING';
  learning_message?: string;
  metrics?: AdSetMetrics;
  ads?: AdData[];
}

export interface AdData {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
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
