import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CampaignData, AdSetData, AdData } from '../types';

interface UseFacebookDataProps {
  level: 'campaigns' | 'adsets' | 'ads';
  dateRange: string;
  expandedRows: Set<string>;
}

interface UseFacebookDataReturn {
  data: CampaignData[] | AdSetData[] | AdData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch Facebook campaign data
 * Handles campaigns, ad sets, and ads based on level
 */
export const useFacebookData = ({
  level,
  dateRange,
  expandedRows
}: UseFacebookDataProps): UseFacebookDataReturn => {
  const [data, setData] = useState<CampaignData[] | AdSetData[] | AdData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      if (level === 'campaigns') {
        // Fetch campaigns
        const response = await axios.get('/api/campaigns/manage/all', {
          headers: { Authorization: `Bearer ${token}` },
          params: { date_preset: dateRange }
        });

        let campaigns: CampaignData[] = response.data.campaigns || [];

        // Fetch ad sets for expanded campaigns
        if (expandedRows.size > 0) {
          const campaignsWithAdSets = await Promise.all(
            campaigns.map(async (campaign) => {
              if (expandedRows.has(campaign.id)) {
                try {
                  const detailsResponse = await axios.get(
                    `/api/campaigns/manage/details/${campaign.id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  const adsets = detailsResponse.data.campaign?.adsets?.data || [];
                  return { ...campaign, adsets };
                } catch (err) {
                  console.error(`Failed to fetch ad sets for campaign ${campaign.id}`, err);
                  return campaign;
                }
              }
              return campaign;
            })
          );
          campaigns = campaignsWithAdSets;
        }

        setData(campaigns);
      } else if (level === 'adsets') {
        // Fetch all ad sets across campaigns
        const campaignsResponse = await axios.get('/api/campaigns/manage/all', {
          headers: { Authorization: `Bearer ${token}` },
          params: { date_preset: dateRange }
        });

        const campaigns = campaignsResponse.data.campaigns || [];

        // Fetch ad sets for all campaigns
        const allAdSets: AdSetData[] = [];
        for (const campaign of campaigns) {
          try {
            const detailsResponse = await axios.get(
              `/api/campaigns/manage/details/${campaign.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const adsets = detailsResponse.data.campaign?.adsets?.data || [];

            // Add campaign info to each ad set
            const adsetsWithCampaign = adsets.map((adset: AdSetData) => ({
              ...adset,
              campaign_id: campaign.id,
              campaign_name: campaign.name
            }));

            allAdSets.push(...adsetsWithCampaign);
          } catch (err) {
            console.error(`Failed to fetch ad sets for campaign ${campaign.id}`, err);
          }
        }

        setData(allAdSets);
      } else if (level === 'ads') {
        // Fetch all ads across campaigns and ad sets
        // For now, return empty array (will implement when needed)
        setData([]);
      }
    } catch (err: any) {
      console.error('Error fetching Facebook data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [level, dateRange, expandedRows]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
