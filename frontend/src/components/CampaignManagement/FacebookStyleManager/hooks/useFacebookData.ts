import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CampaignData, AdSetData, AdData } from '../types';
import { useDebounce } from './useDebounce';

interface UseFacebookDataProps {
  level: 'campaigns' | 'adsets' | 'ads';
  dateRange: string;
  expandedRows: Set<string>;
  searchQuery?: string;
}

interface UseFacebookDataReturn {
  data: CampaignData[] | AdSetData[] | AdData[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => void;
  loadMore: () => void;
}

/**
 * Custom hook to fetch Facebook campaign data
 * Handles campaigns, ad sets, and ads based on level
 * Supports search, pagination, and nested data loading
 */
export const useFacebookData = ({
  level,
  dateRange,
  expandedRows,
  searchQuery = ''
}: UseFacebookDataProps): UseFacebookDataReturn => {
  const [data, setData] = useState<CampaignData[] | AdSetData[] | AdData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchData = useCallback(async (loadMore = false) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      if (level === 'campaigns') {
        // Fetch campaigns with pagination and search
        const response = await axios.get('/api/campaigns/manage/all', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            date_preset: dateRange,
            limit: 50,
            after: loadMore ? cursor : undefined,
            search: debouncedSearch || undefined
          }
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
                  let adsets = detailsResponse.data.campaign?.adsets?.data || [];

                  // Fetch ads for expanded ad sets
                  adsets = await Promise.all(
                    adsets.map(async (adset: AdSetData) => {
                      if (expandedRows.has(adset.id)) {
                        try {
                          const adsResponse = await axios.get(
                            `/api/campaigns/manage/adset/${adset.id}/ads`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          const ads = adsResponse.data.ads || [];
                          return { ...adset, ads };
                        } catch (err) {
                          console.error(`Failed to fetch ads for ad set ${adset.id}`, err);
                          return adset;
                        }
                      }
                      return adset;
                    })
                  );

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

        // Update data - append if loading more, replace if new search/filter
        if (loadMore) {
          setData(prev => [...prev, ...campaigns]);
        } else {
          setData(campaigns);
        }

        // Update pagination state
        setCursor(response.data.paging?.cursors?.after || null);
        setHasMore(!!response.data.paging?.next);

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
        setHasMore(false); // No pagination for ad sets view yet
      } else if (level === 'ads') {
        // Fetch all ads across campaigns and ad sets
        // For now, return empty array (will implement when needed)
        setData([]);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error fetching Facebook data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [level, dateRange, expandedRows, cursor, debouncedSearch]);

  // Reset and refetch when search or filters change
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    fetchData(false);
  }, [level, dateRange, debouncedSearch]);

  // Refetch when expandedRows changes (for nested data)
  useEffect(() => {
    if (expandedRows.size > 0) {
      fetchData(false);
    }
  }, [expandedRows]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && cursor) {
      fetchData(true);
    }
  }, [hasMore, loading, cursor, fetchData]);

  return {
    data,
    loading,
    error,
    hasMore,
    refetch: () => {
      setCursor(null);
      setHasMore(true);
      fetchData(false);
    },
    loadMore
  };
};
