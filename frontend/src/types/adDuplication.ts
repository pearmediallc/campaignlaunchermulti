// Ad Duplication Types for A/B Testing Feature

export interface AdSetSelection {
  adSetId: string;
  adSetName: string;
  numberOfCopies: number; // 1-6 new ads (plus 1 original = 7 total)
}

export interface AdVariation {
  variationNumber: number;

  // Creative
  mediaType?: 'image' | 'video' | 'carousel';
  imageUrl?: string;
  videoId?: string;
  imageHash?: string;
  carouselCards?: any[];

  // Text fields (7 customizable fields)
  primaryText?: string;
  headline?: string;
  description?: string;
  displayLink?: string;
  websiteUrl?: string;
  callToAction?: string;

  // Dynamic Text Variations (Facebook's Multiple Text Options) - per variation
  dynamicTextEnabled?: boolean;
  primaryTextVariations?: string[]; // Up to 5 primary text variations
  headlineVariations?: string[]; // Up to 5 headline variations

  // Creative Library integration
  editorName?: string; // Editor name from Creative Library (for ad naming)

  // Special flags
  useOriginal?: boolean; // If true, use original ad's value for this variation
  useOriginalMedia?: boolean; // If true, use original ad's media
  applyToRemaining?: boolean; // If true, apply this media to all remaining variations
}

export interface AdDuplicationRequest {
  campaignId: string;
  originalAdId: string;
  duplicationType: 'quick' | 'custom';
  adSets: Array<{
    adSetId: string;
    numberOfCopies: number;
  }>;
  variations?: AdVariation[];
}

export interface AdDuplicationJob {
  jobId: string;
  campaignId: string;
  userId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  duplicationType: 'quick' | 'custom';
  totalAdsToCreate: number;
  adsCreated: number;
  currentOperation: string;
  results: Array<{
    adId: string;
    adName: string;
    adSetId: string;
    success: boolean;
  }>;
  errors: Array<{
    adSetId: string;
    copyNumber: number;
    error: string;
  }>;
  startedAt: number;
  completedAt: number | null;
}

export interface OriginalAdData {
  id: string;
  name: string;
  creative: {
    id: string;
    object_story_spec?: {
      page_id: string;
      link_data?: {
        message?: string;
        name?: string;
        description?: string;
        link?: string;
        call_to_action?: {
          type: string;
          value?: {
            link?: string;
          };
        };
        picture?: string;
      };
      video_data?: {
        message?: string;
        title?: string;
        description?: string;
        call_to_action?: {
          type: string;
          value?: {
            link?: string;
          };
        };
        video_id?: string;
        image_url?: string;
      };
    };
    object_story_id?: string;
    effective_object_story_id?: string;
  };
  tracking_specs?: any[];
}
