import { useState, useEffect } from 'react';
import { facebookAuthApi } from '../services/api';

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  status: number;
}

interface Page {
  id: string;
  name: string;
  category: string;
  picture?: string | { data?: { url?: string } };
}

interface Pixel {
  id: string;
  name: string;
}

interface FacebookResources {
  adAccounts: AdAccount[];
  pages: Page[];
  pixels: Pixel[];
  selectedAdAccount?: AdAccount;
  selectedPage?: Page;
  selectedPixel?: Pixel;
}

export const useFacebookResources = () => {
  const [resources, setResources] = useState<FacebookResources>({
    adAccounts: [],
    pages: [],
    pixels: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch main resources (ad accounts, pages)
      const response = await facebookAuthApi.getResources();

      if (response.success) {
        // Also fetch pixels separately (they need to be loaded from ad account)
        try {
          const pixelsResponse = await facebookAuthApi.getPixels(false);
          setResources({
            ...response.data,
            pixels: pixelsResponse.pixels || []
          });
          console.log('✅ Loaded pixels:', pixelsResponse.pixels?.length || 0);
        } catch (pixelErr) {
          console.warn('Could not fetch pixels:', pixelErr);
          // Still set resources even if pixels fail
          setResources(response.data);
        }
      } else {
        setError('Failed to fetch Facebook resources');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch Facebook resources';
      setError(errorMsg);
      console.error('Error fetching Facebook resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return {
    resources,
    loading,
    error,
    refetch: fetchResources
  };
};
