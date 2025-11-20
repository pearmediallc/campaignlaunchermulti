import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

interface FailedEntity {
  id: number;
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  entityType: 'campaign' | 'adset' | 'ad';
  failureReason: string;
  userFriendlyReason: string;
  errorCode?: string;
  retryCount: number;
  status: 'failed' | 'retrying' | 'recovered' | 'permanent_failure';
  strategyType?: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignFailures {
  campaignId: string;
  campaignName: string;
  failures: FailedEntity[];
  totalFailures: number;
  unresolvedCount: number;
}

interface FailureTrackingContextType {
  allFailures: FailedEntity[];
  campaignGroups: CampaignFailures[];
  unresolvedCount: number;
  isMinimized: boolean;
  isVisible: boolean;
  loading: boolean;
  toggleMinimized: () => void;
  hide: () => void;
  show: () => void;
  refreshFailures: () => Promise<void>;
  clearFailure: (id: number) => Promise<void>;
  clearAllFailures: () => void;
  dismissCampaign: (campaignId: string) => void;
}

const FailureTrackingContext = createContext<FailureTrackingContextType | undefined>(undefined);

export function useFailureTracking() {
  const context = useContext(FailureTrackingContext);
  if (!context) {
    throw new Error('useFailureTracking must be used within FailureTrackingProvider');
  }
  return context;
}

interface FailureTrackingProviderProps {
  children: ReactNode;
}

export function FailureTrackingProvider({ children }: FailureTrackingProviderProps) {
  const [allFailures, setAllFailures] = useState<FailedEntity[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isVisible, setIsVisible] = useState(true); // Always visible by default
  const [loading, setLoading] = useState(false);
  const [dismissedCampaigns, setDismissedCampaigns] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedFailureCampaigns');
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch all user failures
  const fetchFailures = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/failures/user', {
        params: {
          status: 'failed,retrying,permanent_failure' // Only unresolved
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        const failures = response.data.failures;
        setAllFailures(failures);
        // Badge is always visible, no conditional logic needed
      }
    } catch (error) {
      console.error('Error fetching failures:', error);
    } finally {
      setLoading(false);
    }
  }, [dismissedCampaigns]);

  // Poll for failures every 30 seconds
  useEffect(() => {
    fetchFailures(); // Initial fetch

    const interval = setInterval(() => {
      fetchFailures();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchFailures]);

  // Group failures by campaign
  const campaignGroups = React.useMemo((): CampaignFailures[] => {
    const groups = new Map<string, CampaignFailures>();

    allFailures.forEach((failure) => {
      if (!groups.has(failure.campaignId)) {
        groups.set(failure.campaignId, {
          campaignId: failure.campaignId,
          campaignName: failure.campaignName,
          failures: [],
          totalFailures: 0,
          unresolvedCount: 0
        });
      }

      const group = groups.get(failure.campaignId)!;
      group.failures.push(failure);
      group.totalFailures++;

      if (failure.status === 'failed' || failure.status === 'retrying') {
        group.unresolvedCount++;
      }
    });

    return Array.from(groups.values())
      .filter(group => !dismissedCampaigns.includes(group.campaignId))
      .sort((a, b) => b.unresolvedCount - a.unresolvedCount); // Most failures first
  }, [allFailures, dismissedCampaigns]);

  // Calculate total unresolved count
  const unresolvedCount = React.useMemo(() => {
    return allFailures.filter(
      f => (f.status === 'failed' || f.status === 'retrying') &&
           !dismissedCampaigns.includes(f.campaignId)
    ).length;
  }, [allFailures, dismissedCampaigns]);

  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  const refreshFailures = useCallback(async () => {
    await fetchFailures();
  }, [fetchFailures]);

  const clearFailure = useCallback(async (id: number) => {
    try {
      await axios.delete(`/api/failures/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Remove from local state
      setAllFailures(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error clearing failure:', error);
      throw error;
    }
  }, []);

  const clearAllFailures = useCallback(() => {
    // Clear all failures for visible campaigns
    const campaignIds = campaignGroups.map(g => g.campaignId);
    setDismissedCampaigns(prev => {
      const updated = [...prev, ...campaignIds];
      localStorage.setItem('dismissedFailureCampaigns', JSON.stringify(updated));
      return updated;
    });
    // Badge remains visible even after clearing all failures
  }, [campaignGroups]);

  const dismissCampaign = useCallback((campaignId: string) => {
    setDismissedCampaigns(prev => {
      const updated = [...prev, campaignId];
      localStorage.setItem('dismissedFailureCampaigns', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: FailureTrackingContextType = {
    allFailures,
    campaignGroups,
    unresolvedCount,
    isMinimized,
    isVisible,
    loading,
    toggleMinimized,
    hide,
    show,
    refreshFailures,
    clearFailure,
    clearAllFailures,
    dismissCampaign
  };

  return (
    <FailureTrackingContext.Provider value={value}>
      {children}
    </FailureTrackingContext.Provider>
  );
}
