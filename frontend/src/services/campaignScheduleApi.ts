import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - token may be expired');
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Type definitions
export interface CampaignScheduleData {
  campaignName: string;
  timezone: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: string[]; // ['monday', 'tuesday', etc.]
  isEnabled?: boolean;
}

export interface CampaignSchedule {
  id: number;
  campaignId: string;
  campaignName: string;
  timezone: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  isEnabled: boolean;
  nextScheduledStart: string | null;
  nextScheduledPause: string | null;
  lastStartedAt: string | null;
  lastPausedAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleLog {
  id: number;
  action: 'start' | 'pause';
  status: 'success' | 'failed' | 'skipped';
  executedAt: string;
  errorMessage: string | null;
  fbResponse: any;
}

export interface UpcomingAction {
  campaignId: string;
  campaignName: string;
  action: 'start' | 'pause';
  scheduledAt: string;
  timezone: string;
}

// API functions
export const campaignScheduleApi = {
  /**
   * Create or update campaign schedule
   */
  createOrUpdateSchedule: async (
    campaignId: string,
    scheduleData: CampaignScheduleData
  ): Promise<{ success: boolean; schedule: CampaignSchedule }> => {
    const response = await api.post(`/campaigns/${campaignId}/schedule`, scheduleData);
    return response.data;
  },

  /**
   * Get schedule for a specific campaign
   */
  getSchedule: async (
    campaignId: string
  ): Promise<{ success: boolean; hasSchedule: boolean; schedule: CampaignSchedule | null }> => {
    const response = await api.get(`/campaigns/${campaignId}/schedule`);
    return response.data;
  },

  /**
   * Toggle schedule enabled/disabled
   */
  toggleSchedule: async (
    campaignId: string,
    isEnabled: boolean
  ): Promise<{ success: boolean; schedule: Partial<CampaignSchedule> }> => {
    const response = await api.patch(`/campaigns/${campaignId}/schedule/toggle`, { isEnabled });
    return response.data;
  },

  /**
   * Delete schedule permanently
   */
  deleteSchedule: async (
    campaignId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/campaigns/${campaignId}/schedule`);
    return response.data;
  },

  /**
   * Get all upcoming scheduled actions for user
   */
  getUpcomingActions: async (): Promise<{ success: boolean; upcomingActions: UpcomingAction[] }> => {
    const response = await api.get('/campaigns/schedule/upcoming');
    return response.data;
  },

  /**
   * Get execution logs for a campaign schedule
   */
  getScheduleLogs: async (
    campaignId: string,
    limit?: number
  ): Promise<{ success: boolean; logs: ScheduleLog[] }> => {
    const response = await api.get(`/campaigns/${campaignId}/schedule/logs`, {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get all schedules for user
   */
  getAllSchedules: async (): Promise<{ success: boolean; schedules: CampaignSchedule[] }> => {
    const response = await api.get('/campaigns/schedule/all');
    return response.data;
  }
};

export default campaignScheduleApi;
