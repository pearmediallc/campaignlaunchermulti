/**
 * Campaign Verification Service
 *
 * NEW SERVICE - Completely isolated from existing functionality
 * Purpose: Verify that created campaigns match the form data submitted
 *
 * This service fetches campaign data from Facebook and compares it field-by-field
 * with the original form data to ensure accuracy.
 */

const axios = require('axios');

class CampaignVerificationService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = `https://graph.facebook.com/${process.env.FB_API_VERSION || 'v18.0'}`;
  }

  /**
   * Fetch campaign data with full nested structure (campaign -> adsets -> ads -> creative)
   * Uses Facebook's field expansion to minimize API calls
   */
  async fetchCampaignData(campaignId) {
    try {
      console.log(`📊 Fetching campaign data for verification: ${campaignId}`);

      const response = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields: [
              'id',
              'name',
              'objective',
              'status',
              'special_ad_categories',
              'daily_budget',
              'lifetime_budget',
              'budget_remaining',
              'adsets{' +
                'id,name,optimization_goal,billing_event,bid_amount,bid_strategy,' +
                'daily_budget,lifetime_budget,start_time,end_time,status,' +
                'targeting,promoted_object,destination_type,' +
                'ads{' +
                  'id,name,status,effective_status,' +
                  'creative{' +
                    'id,name,title,body,object_story_spec,image_hash,video_id,' +
                    'link_url,call_to_action_type,url_tags,asset_feed_spec' +
                  '}' +
                '}' +
              '}'
            ].join(','),
            access_token: this.accessToken
          }
        }
      );

      console.log(`✅ Successfully fetched campaign data`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching campaign data:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Compare form data with Facebook data and return detailed verification report
   */
  async verifyFields(formData, facebookData) {
    const verification = {
      campaign: {
        fields: [],
        matchRate: 100
      },
      adSets: [],
      ads: [],
      overallMatch: true
    };

    try {
      // Verify Campaign Level Fields
      verification.campaign.fields = this.verifyCampaignFields(formData, facebookData);

      // Verify Ad Sets
      if (facebookData.adsets && facebookData.adsets.data) {
        for (const adSet of facebookData.adsets.data) {
          const adSetVerification = {
            adSetId: adSet.id,
            adSetName: adSet.name,
            fields: this.verifyAdSetFields(formData, adSet),
            matchRate: 100
          };

          // Calculate match rate for this ad set
          const mismatches = adSetVerification.fields.filter(f => !f.match).length;
          const total = adSetVerification.fields.length;
          adSetVerification.matchRate = total > 0 ? Math.round(((total - mismatches) / total) * 100) : 100;

          verification.adSets.push(adSetVerification);

          // Verify Ads in this ad set
          if (adSet.ads && adSet.ads.data) {
            for (const ad of adSet.ads.data) {
              const adVerification = {
                adId: ad.id,
                adName: ad.name,
                adSetId: adSet.id,
                fields: this.verifyAdFields(formData, ad),
                matchRate: 100
              };

              // Calculate match rate for this ad
              const adMismatches = adVerification.fields.filter(f => !f.match).length;
              const adTotal = adVerification.fields.length;
              adVerification.matchRate = adTotal > 0 ? Math.round(((adTotal - adMismatches) / adTotal) * 100) : 100;

              verification.ads.push(adVerification);
            }
          }
        }
      }

      // Calculate overall campaign match rate
      const campaignMismatches = verification.campaign.fields.filter(f => !f.match).length;
      const campaignTotal = verification.campaign.fields.length;
      verification.campaign.matchRate = campaignTotal > 0 ? Math.round(((campaignTotal - campaignMismatches) / campaignTotal) * 100) : 100;

      // Calculate overall match
      const allFields = [
        ...verification.campaign.fields,
        ...verification.adSets.flatMap(as => as.fields),
        ...verification.ads.flatMap(ad => ad.fields)
      ];
      const totalMismatches = allFields.filter(f => !f.match).length;
      verification.overallMatch = totalMismatches === 0;

      return verification;
    } catch (error) {
      console.error('Error in field verification:', error);
      throw error;
    }
  }

  /**
   * Verify campaign-level fields
   */
  verifyCampaignFields(formData, fbData) {
    const fields = [];

    // Campaign Name
    fields.push({
      fieldName: 'Campaign Name',
      expected: formData.campaignName,
      actual: fbData.name,
      match: formData.campaignName === fbData.name,
      importance: 'critical'
    });

    // Campaign Objective
    if (formData.objective) {
      fields.push({
        fieldName: 'Objective',
        expected: formData.objective,
        actual: fbData.objective,
        match: formData.objective === fbData.objective,
        importance: 'critical'
      });
    }

    // Campaign Status
    fields.push({
      fieldName: 'Status',
      expected: formData.status || 'PAUSED',
      actual: fbData.status,
      match: (formData.status || 'PAUSED') === fbData.status,
      importance: 'high'
    });

    // Special Ad Categories
    if (formData.specialAdCategory) {
      const expectedCategories = Array.isArray(formData.specialAdCategory)
        ? formData.specialAdCategory
        : [formData.specialAdCategory];
      const actualCategories = fbData.special_ad_categories || [];

      fields.push({
        fieldName: 'Special Ad Categories',
        expected: expectedCategories,
        actual: actualCategories,
        match: JSON.stringify(expectedCategories.sort()) === JSON.stringify(actualCategories.sort()),
        importance: 'high'
      });
    }

    return fields;
  }

  /**
   * Verify ad set-level fields
   */
  verifyAdSetFields(formData, fbAdSet) {
    const fields = [];

    // Budget
    if (formData.dailyBudget) {
      const expectedBudget = parseFloat(formData.dailyBudget) * 100; // Convert to cents
      const actualBudget = parseFloat(fbAdSet.daily_budget) || 0;
      fields.push({
        fieldName: 'Daily Budget',
        expected: `$${formData.dailyBudget}`,
        actual: `$${(actualBudget / 100).toFixed(2)}`,
        match: Math.abs(expectedBudget - actualBudget) < 10, // Allow 10 cent tolerance
        importance: 'critical'
      });
    }

    // Optimization Goal
    if (formData.optimizationGoal) {
      fields.push({
        fieldName: 'Optimization Goal',
        expected: formData.optimizationGoal,
        actual: fbAdSet.optimization_goal,
        match: formData.optimizationGoal === fbAdSet.optimization_goal,
        importance: 'high'
      });
    }

    // Billing Event
    if (formData.billingEvent) {
      fields.push({
        fieldName: 'Billing Event',
        expected: formData.billingEvent,
        actual: fbAdSet.billing_event,
        match: formData.billingEvent === fbAdSet.billing_event,
        importance: 'medium'
      });
    }

    // Pixel ID (from promoted_object)
    if (formData.pixelId && fbAdSet.promoted_object) {
      fields.push({
        fieldName: 'Pixel ID',
        expected: formData.pixelId,
        actual: fbAdSet.promoted_object.pixel_id,
        match: formData.pixelId === fbAdSet.promoted_object.pixel_id,
        importance: 'high'
      });
    }

    // Targeting - Locations
    if (formData.targeting && formData.targeting.locations && fbAdSet.targeting) {
      const expectedLocations = formData.targeting.locations;
      const actualLocations = fbAdSet.targeting.geo_locations || {};

      fields.push({
        fieldName: 'Target Locations',
        expected: expectedLocations,
        actual: actualLocations,
        match: this.compareLocations(expectedLocations, actualLocations),
        importance: 'high'
      });
    }

    // Targeting - Age
    if (formData.targeting && fbAdSet.targeting) {
      if (formData.targeting.ageMin) {
        fields.push({
          fieldName: 'Minimum Age',
          expected: formData.targeting.ageMin,
          actual: fbAdSet.targeting.age_min,
          match: parseInt(formData.targeting.ageMin) === parseInt(fbAdSet.targeting.age_min || 18),
          importance: 'medium'
        });
      }

      if (formData.targeting.ageMax) {
        fields.push({
          fieldName: 'Maximum Age',
          expected: formData.targeting.ageMax,
          actual: fbAdSet.targeting.age_max,
          match: parseInt(formData.targeting.ageMax) === parseInt(fbAdSet.targeting.age_max || 65),
          importance: 'medium'
        });
      }
    }

    return fields;
  }

  /**
   * Verify ad-level fields
   */
  verifyAdFields(formData, fbAd) {
    const fields = [];

    if (!fbAd.creative) {
      return fields;
    }

    const creative = fbAd.creative;

    // Primary Text (body)
    if (formData.primaryText) {
      const actualBody = creative.body || creative.object_story_spec?.link_data?.message || '';
      fields.push({
        fieldName: 'Primary Text',
        expected: formData.primaryText,
        actual: actualBody,
        match: formData.primaryText === actualBody,
        importance: 'high'
      });
    }

    // Headline
    if (formData.headline) {
      const actualHeadline = creative.title || creative.object_story_spec?.link_data?.name || '';
      fields.push({
        fieldName: 'Headline',
        expected: formData.headline,
        actual: actualHeadline,
        match: formData.headline === actualHeadline,
        importance: 'high'
      });
    }

    // Description
    if (formData.description) {
      const actualDescription = creative.object_story_spec?.link_data?.description || '';
      fields.push({
        fieldName: 'Description',
        expected: formData.description,
        actual: actualDescription,
        match: formData.description === actualDescription,
        importance: 'medium'
      });
    }

    // Website URL
    if (formData.url) {
      const actualUrl = creative.link_url || creative.object_story_spec?.link_data?.link || '';
      // Remove trailing slashes for comparison
      const expectedUrl = formData.url.replace(/\/$/, '');
      const actualUrlClean = actualUrl.replace(/\/$/, '');

      fields.push({
        fieldName: 'Website URL',
        expected: expectedUrl,
        actual: actualUrlClean,
        match: expectedUrl === actualUrlClean,
        importance: 'critical'
      });
    }

    // Call to Action
    if (formData.callToAction) {
      const actualCTA = creative.call_to_action_type || creative.object_story_spec?.link_data?.call_to_action?.type || '';
      fields.push({
        fieldName: 'Call to Action',
        expected: formData.callToAction,
        actual: actualCTA,
        match: formData.callToAction === actualCTA,
        importance: 'medium'
      });
    }

    // Media Type
    if (formData.mediaType) {
      let actualMediaType = 'unknown';
      if (creative.image_hash) {
        actualMediaType = 'single_image';
      } else if (creative.video_id) {
        actualMediaType = 'single_video';
      } else if (creative.asset_feed_spec) {
        actualMediaType = 'carousel';
      }

      fields.push({
        fieldName: 'Media Type',
        expected: formData.mediaType,
        actual: actualMediaType,
        match: formData.mediaType === actualMediaType,
        importance: 'high'
      });
    }

    return fields;
  }

  /**
   * Compare targeting locations
   */
  compareLocations(expected, actual) {
    try {
      // Simple comparison - can be enhanced based on needs
      const expectedStr = JSON.stringify(expected);
      const actualStr = JSON.stringify(actual);
      return expectedStr === actualStr;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate complete verification report
   */
  async generateVerificationReport(campaignId, formData) {
    try {
      console.log(`🔍 Generating verification report for campaign: ${campaignId}`);

      // Fetch campaign data from Facebook
      const fetchResult = await this.fetchCampaignData(campaignId);

      if (!fetchResult.success) {
        return {
          success: false,
          error: fetchResult.error
        };
      }

      // Compare with form data
      const verification = await this.verifyFields(formData, fetchResult.data);

      // Calculate overall statistics
      const allFields = [
        ...verification.campaign.fields,
        ...verification.adSets.flatMap(as => as.fields),
        ...verification.ads.flatMap(ad => ad.fields)
      ];

      const totalFields = allFields.length;
      const matchedFields = allFields.filter(f => f.match).length;
      const overallMatchRate = totalFields > 0 ? Math.round((matchedFields / totalFields) * 100) : 100;

      return {
        success: true,
        campaignId,
        verifiedAt: new Date().toISOString(),
        overallMatchRate,
        totalFields,
        matchedFields,
        mismatchedFields: totalFields - matchedFields,
        verification
      };
    } catch (error) {
      console.error('Error generating verification report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CampaignVerificationService;
