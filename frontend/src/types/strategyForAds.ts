export interface StrategyForAdsFormData {
  // Base campaign fields
  campaignName: string;
  budgetType?: 'daily' | 'lifetime';
  conversionLocation?: 'website' | 'calls';

  // Campaign Level Extensions
  buyingType: 'AUCTION' | 'RESERVED';
  objective: 'OUTCOME_LEADS' | 'PHONE_CALL' | 'OUTCOME_SALES';
  budgetLevel: 'campaign' | 'adset';
  specialAdCategories: string[];
  campaignBudgetOptimization?: boolean;
  bidStrategy?: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP' | 'LOWEST_COST_WITH_MIN_ROAS';

  // Campaign Budget Options
  campaignBudget?: {
    dailyBudget?: number;
    lifetimeBudget?: number;
  };

  // Ad Set Level Extensions
  performanceGoal: 'maximize_conversions' | 'cost_per_result' | 'lowest_cost';
  pixel?: string; // Renamed from dataset
  conversionEvent: 'Lead' | 'Contact' | 'Purchase';
  attributionSetting: 'standard' | '1_day_click' | '7_day_click' | '1_day_click_1_day_view' | '7_day_click_1_day_view' | '28_day_click_1_day_view' | '1_day_click_1_day_engaged_view_1_day_view';
  attributionWindow: '1_day' | '7_day' | '28_day';

  // Ad Set Budget & Schedule
  adSetBudget?: {
    dailyBudget?: number;
    lifetimeBudget?: number;
    startDate?: string;
    endDate?: string;
    scheduleType?: 'run_continuously' | 'scheduled';
    dayparting?: Array<{
      days: number[]; // 0=Sunday, 6=Saturday
      startTime: number; // Minutes since midnight (0-1439)
      endTime: number; // Minutes since midnight (0-1439)
    }>;
    spendingLimits?: {
      // Legacy fields (backward compatibility)
      daily?: number;
      lifetime?: number;
      // New enhanced fields
      enabled?: boolean;
      valueType?: 'percentage' | 'dollar';
      dailyMin?: number;
      dailyMax?: number;
      lifetimeMin?: number;
      lifetimeMax?: number;
    };
  };

  // Enhanced Targeting
  targeting?: {
    locations?: {
      countries?: string[];
      regions?: string[];
      cities?: string[];
      zips?: string[];
      addressRadius?: {
        address: string;
        radius: number;
        distanceUnit: 'mile' | 'kilometer';
      }[];
    };
    ageMin?: number;
    ageMax?: number;
    ageRange?: number[];
    genders?: string[];
    languages?: string[];
    detailedTargeting?: {
      interests?: string[];
      behaviors?: string[];
      demographics?: string[];
    };
    customAudiences?: string[];
    lookalikeAudiences?: string[];
    connections?: {
      include?: string[];
      exclude?: string[];
    };
  };

  // Enhanced Placements
  placementType?: 'automatic' | 'manual';
  placements?: {
    facebook?: string[];
    instagram?: string[];
    messenger?: string[];
    audienceNetwork?: string[];
    devices?: string[];
    platforms?: string[];
    publisherPlatforms?: string[];
  };

  // Ad Level Extensions
  facebookPage?: string;
  instagramAccount?: string;
  urlType?: 'website' | 'app_deeplink' | 'facebook_event' | 'messenger' | 'whatsapp' | 'lead_gen' | 'call' | 'none';
  url?: string;
  primaryText: string;
  headline: string;
  description?: string;
  callToAction?: string;
  displayLink?: string;

  // Dynamic Text Variations (Facebook's Multiple Text Options)
  dynamicTextEnabled?: boolean;
  primaryTextVariations?: string[];
  headlineVariations?: string[];

  // Dynamic Creative (Multiple Media)
  dynamicCreativeEnabled?: boolean;
  dynamicMediaFiles?: File[];

  // Media fields
  mediaType?: 'single_image' | 'single_video' | 'carousel';
  mediaFiles?: File[];
  image?: File;
  video?: File;
  images?: File[];

  // Video Thumbnail & Aspect Ratio
  videoThumbnail?: File; // Custom thumbnail for video
  videoThumbnailFrameIndex?: number; // If using video frame as thumbnail
  aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16' | '2:3'; // Selected aspect ratio

  // Dynamic Creative aspect ratios (for multiple media)
  dynamicMediaAspectRatios?: Array<'1:1' | '4:5' | '16:9' | '9:16' | '2:3'>;

  // Creative Library integration
  editorName?: string; // Editor name when files selected from Creative Library
  fromLibrary?: boolean; // Flag to indicate files came from Creative Library
  dynamicEditorName?: string; // Editor name for Dynamic Creative from Creative Library
  dynamicFromLibrary?: boolean; // Flag to indicate Dynamic Creative files came from Creative Library

  // Media Specifications
  mediaSpecs?: {
    imageSpecs?: {
      aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16' | '2:3';
      minWidth?: number;
      minHeight?: number;
      maxFileSize?: number;
    };
    videoSpecs?: {
      aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16' | '2:3';
      minDuration?: number;
      maxDuration?: number;
      maxFileSize?: number;
    };
    carouselSpecs?: {
      cardCount?: number;
      mixedMedia?: boolean;
    };
  };

  // Duplication Settings for 1-49 Ad Sets
  duplicationSettings?: {
    adSetCount?: number;        // Number of ad sets to duplicate (1-49)
    totalBudget?: number;       // Optional - for backward compatibility only (not used in ABO)
    budgetPerAdSet?: number;    // Calculated: totalBudget / adSetCount (legacy field)
    // Legacy fields (backward compatibility)
    defaultBudgetPerAdSet?: number;
    customBudgets?: Array<{
      adSetIndex: number;
      budget: number;
    }>;
    budgetDistributionType?: 'equal' | 'custom' | 'weighted';
  };

  // Process Control
  publishDirectly: boolean;
  postId?: string;
  manualPostId?: string;
  useExistingPost?: boolean;

  // Ad Variation Configuration (NEW for Strategy for Ads)
  adVariationConfig?: {
    selectedAdSetIndices: number[];  // Which ad sets get variations (0-indexed)
    adsPerAdSet: number;              // Number of ads per selected ad set (1-7)
    variationMode?: 'single_creative' | 'per_ad_creative';  // NEW: How creatives are assigned
    variations: Array<{
      variationNumber: number;
      adSetIndex?: number;  // Which ad set this variation is for (0-indexed)
      adNumber?: number;    // NEW: Which ad within the ad set (1-indexed, for per_ad_creative mode)
      useOriginal?: boolean;
      primaryText?: string;
      headline?: string;
      description?: string;
      websiteUrl?: string;
      displayLink?: string;
      callToAction?: string;
      imageUrl?: string;
      videoId?: string;
      imageHash?: string;
      videoHash?: string;  // NEW: Track video hash
      useOriginalMedia?: boolean;
      mediaFile?: File;
      editorName?: string;  // From Creative Library
      primaryTextVariations?: string[];  // Dynamic text variations
      headlineVariations?: string[];     // Dynamic headline variations
      dynamicTextEnabled?: boolean;      // Per-variation dynamic text flag
      applyToRemaining?: boolean;        // Apply media to remaining variations
    }>;
  };

  // Additional fields for type compatibility
  costCap?: number;
  minRoas?: number;
  bidAmount?: number;  // For LOWEST_COST_WITH_BID_CAP strategy
  campaignSpendingLimit?: number;
  manualPixelId?: string;
}

export interface StrategyForAdsResponse {
  success: boolean;
  message: string;
  data?: {
    phase: 'initial' | 'waiting' | 'duplicating' | 'completed';
    campaign: { id: string; name: string };
    // For Strategy for Ads, we have multiple ad sets
    adSets?: Array<{ id: string; name: string }>;
    // Keep adSet for backward compatibility with single ad set responses
    adSet?: {
      id: string;
      name: string;
      _skippedFields?: any; // Fields that were skipped in safe mode
    };
    ads: Array<{ id: string; name: string }>;
    postId?: string;
    duplicatedAdSets?: Array<{ id: string; name: string }>;
    progress?: number;
    facebookPayload?: {
      campaign: {
        name: string;
        objective: string;
        buyingType: string;
        specialAdCategories: string[];
        status: string;
        budgetLevel: string;
        dailyBudget?: string;
      };
      adSet: {
        name: string;
        targeting: {
          geoLocations?: {
            countries?: string[];
            regions?: Array<{ key: string; name?: string }>;
          };
          ageMin: number;
          ageMax: number;
          genders: (string | number)[];
        };
        dailyBudget?: string;
        optimizationGoal: string;
        bidStrategy: string;
        conversionEvent?: string;
        attributionSetting: string;
        placementType: string;
        placements?: string[];
      };
      ad: {
        name: string;
        format: string;
        primaryText: string;
        headline: string;
        description: string;
        callToAction: string;
        websiteUrl: string;
        displayLink: string;
      };
    };
  };
  error?: string;
}

export interface PostIdResponse {
  success: boolean;
  postId?: string;
  error?: string;
  requiresManualInput?: boolean;
}

export interface DuplicationProgress {
  completed: number;
  total: number;
  currentOperation: string;
  adSets: Array<{ id: string; name: string }>;
  errors: Array<{ adSetIndex: number; error: string }>;
}

export type StrategyForAdsPhase = 'setup' | 'creating' | 'waiting' | 'manual' | 'duplicating' | 'completed' | 'error';

// Meta API Options - Complete Set
export const BUYING_TYPE_OPTIONS = [
  { value: 'AUCTION', label: 'Auction' },
  { value: 'RESERVED', label: 'Reach and Frequency' }
];

export const OBJECTIVE_OPTIONS = [
  // Lead Generation
  { value: 'OUTCOME_LEADS', label: 'Leads', category: 'Lead Generation' },
  { value: 'PHONE_CALL', label: 'Calls', category: 'Lead Generation' },
  // Sales
  { value: 'OUTCOME_SALES', label: 'Sales', category: 'Sales' }
];

export const BUDGET_LEVEL_OPTIONS = [
  { value: 'campaign', label: 'Campaign Budget Optimization (CBO)' },
  { value: 'adset', label: 'Ad Set Budget' }
];

export const BID_STRATEGY_OPTIONS = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest cost (no cap)' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Lowest cost with bid cap' },
  { value: 'COST_CAP', label: 'Cost cap' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'Minimum ROAS' }
];

export const SPECIAL_AD_CATEGORIES = [
  { value: 'NONE', label: 'None' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'FINANCIAL_PRODUCTS_SERVICES', label: 'Financial products and services' },
  { value: 'SOCIAL_ISSUES', label: 'Social issues, elections or politics' },
  { value: 'ONLINE_GAMBLING_AND_GAMING', label: 'Online gambling and gaming' }
];

export const PERFORMANCE_GOAL_OPTIONS = [
  { value: 'maximize_conversions', label: 'Maximize number of conversions' },
  { value: 'maximize_value', label: 'Maximize value of conversions' },
  { value: 'cost_per_result', label: 'Cost per result goal' },
  { value: 'lowest_cost', label: 'Lowest cost' },
  { value: 'roas', label: 'Return on ad spend (ROAS)' }
];

export const CONVERSION_EVENT_OPTIONS = [
  // Only Lead, Contact, and Purchase
  { value: 'Lead', label: 'Lead' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Purchase', label: 'Purchase' }
];

export const ATTRIBUTION_SETTING_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: '1_day_click', label: '1-day click' },
  { value: '7_day_click', label: '7-day click' },
  { value: '1_day_click_1_day_view', label: '1-day click or 1-day view' },
  { value: '7_day_click_1_day_view', label: '7-day click or 1-day view' },
  { value: '28_day_click_1_day_view', label: '28-day click or 1-day view' },
  { value: '1_day_click_1_day_engaged_view_1_day_view', label: '1-day click, 1-day engaged-view, 1-day view' }
];

export const ATTRIBUTION_WINDOW_OPTIONS = [
  { value: '1_day', label: '1 day' },
  { value: '7_day', label: '7 days' },
  { value: '28_day', label: '28 days' }
];

// Placement Options
export const PLACEMENT_OPTIONS = {
  facebook: [
    { value: 'feed', label: 'Feed' },
    { value: 'instant_article', label: 'Instant Articles' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'video_feeds', label: 'Video Feeds' },
    { value: 'story', label: 'Stories' },
    { value: 'search', label: 'Search Results' },
    { value: 'facebook_reels', label: 'Reels' },
    { value: 'profile_feed', label: 'Groups Feed' }
  ],
  instagram: [
    { value: 'stream', label: 'Feed' },
    { value: 'story', label: 'Stories' },
    { value: 'reels', label: 'Reels' },
    { value: 'profile_feed', label: 'Profile Feed' },
    { value: 'explore', label: 'Explore' },
    { value: 'explore_home', label: 'Explore Home' },
    { value: 'ig_search', label: 'Search Results' },
    { value: 'profile_reels', label: 'Profile Reels' }
  ],
  messenger: [
    { value: 'story', label: 'Stories' },
    { value: 'sponsored_messages', label: 'Sponsored Messages' }
  ],
  audience_network: [
    { value: 'classic', label: 'Native, Banner and Interstitial' },
    { value: 'rewarded_video', label: 'Rewarded Video' },
    { value: 'instream_video', label: 'In-Stream Video' }
  ]
};

// Facebook's default manual placement selections (2025)
// Based on Facebook Ads Manager UI behavior
export const DEFAULT_MANUAL_PLACEMENTS = {
  facebook: ['feed', 'marketplace', 'video_feeds', 'story', 'facebook_reels'],
  instagram: ['stream', 'story', 'reels', 'explore'],
  messenger: [] as string[], // Not pre-selected by default
  audience_network: [] as string[] // Not pre-selected by default
};

export const DEVICE_OPTIONS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'connected_tv', label: 'Connected TV' }
];

export const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' }
];

export const URL_TYPE_OPTIONS = [
  { value: 'website', label: 'Website URL' },
  { value: 'app_deeplink', label: 'App Deep Link' },
  { value: 'facebook_event', label: 'Facebook Event' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'lead_gen', label: 'Lead Form' },
  { value: 'call', label: 'Call' },
  { value: 'none', label: 'None' }
];
