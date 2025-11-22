/**
 * LocationMapper Service
 * Maps US state names to Facebook Marketing API region keys
 * Provides validation and bulk processing for location targeting
 */

// Complete mapping of US states to Facebook region keys
const US_STATES_MAP = {
  // Full state names
  "Alabama": "3843",
  "Alaska": "3844",
  "Arizona": "3845",
  "Arkansas": "3846",
  "California": "3847",
  "Colorado": "3848",
  "Connecticut": "3849",
  "Delaware": "3850",
  "Florida": "3851",
  "Georgia": "3852",
  "Hawaii": "3853",
  "Idaho": "3854",
  "Illinois": "3855",
  "Indiana": "3856",
  "Iowa": "3857",
  "Kansas": "3858",
  "Kentucky": "3859",
  "Louisiana": "3860",
  "Maine": "3861",
  "Maryland": "3862",
  "Massachusetts": "3863",
  "Michigan": "3864",
  "Minnesota": "3865",
  "Mississippi": "3866",
  "Missouri": "3867",
  "Montana": "3868",
  "Nebraska": "3869",
  "Nevada": "3870",
  "New Hampshire": "3871",
  "New Jersey": "3872",
  "New Mexico": "3873",
  "New York": "3874",
  "North Carolina": "3875",
  "North Dakota": "3876",
  "Ohio": "3877",
  "Oklahoma": "3878",
  "Oregon": "3879",
  "Pennsylvania": "3880",
  "Rhode Island": "3881",
  "South Carolina": "3882",
  "South Dakota": "3883",
  "Tennessee": "3884",
  "Texas": "3885",
  "Utah": "3886",
  "Vermont": "3887",
  "Virginia": "3888",
  "Washington": "3889",
  "West Virginia": "3890",
  "Wisconsin": "3891",
  "Wyoming": "3892",
  "District of Columbia": "3362",

  // State abbreviations
  "AL": "3843",
  "AK": "3844",
  "AZ": "3845",
  "AR": "3846",
  "CA": "3847",
  "CO": "3848",
  "CT": "3849",
  "DE": "3850",
  "FL": "3851",
  "GA": "3852",
  "HI": "3853",
  "ID": "3854",
  "IL": "3855",
  "IN": "3856",
  "IA": "3857",
  "KS": "3858",
  "KY": "3859",
  "LA": "3860",
  "ME": "3861",
  "MD": "3862",
  "MA": "3863",
  "MI": "3864",
  "MN": "3865",
  "MS": "3866",
  "MO": "3867",
  "MT": "3868",
  "NE": "3869",
  "NV": "3870",
  "NH": "3871",
  "NJ": "3872",
  "NM": "3873",
  "NY": "3874",
  "NC": "3875",
  "ND": "3876",
  "OH": "3877",
  "OK": "3878",
  "OR": "3879",
  "PA": "3880",
  "RI": "3881",
  "SC": "3882",
  "SD": "3883",
  "TN": "3884",
  "TX": "3885",
  "UT": "3886",
  "VT": "3887",
  "VA": "3888",
  "WA": "3889",
  "WV": "3890",
  "WI": "3891",
  "WY": "3892",
  "DC": "3362"
};

// Reverse mapping for key to name lookup
const FACEBOOK_KEY_TO_STATE = Object.entries(US_STATES_MAP).reduce((acc, [name, key]) => {
  if (!acc[key]) {
    acc[key] = name;
  }
  return acc;
}, {});

class LocationMapper {
  /**
   * Normalize state name for lookup
   * Handles case-insensitive matching and whitespace
   */
  normalizeStateName(stateName) {
    if (!stateName || typeof stateName !== 'string') {
      return null;
    }

    // Trim and convert to title case
    const normalized = stateName.trim();

    // Try exact match first (case-insensitive)
    const exactMatch = Object.keys(US_STATES_MAP).find(
      key => key.toLowerCase() === normalized.toLowerCase()
    );

    return exactMatch || normalized;
  }

  /**
   * Map a single state name to Facebook region key
   * @param {string} stateName - State name or abbreviation
   * @returns {object|null} - {key, name} or null if not found
   */
  mapStateToFacebookKey(stateName) {
    const normalized = this.normalizeStateName(stateName);

    if (!normalized) {
      return null;
    }

    const key = US_STATES_MAP[normalized];

    if (!key) {
      return null;
    }

    return {
      key: key,
      name: normalized
    };
  }

  /**
   * Map multiple state names to Facebook region keys
   * @param {string[]} stateNames - Array of state names
   * @returns {object[]} - Array of {key, name} objects
   */
  mapStatesToFacebookKeys(stateNames) {
    if (!Array.isArray(stateNames)) {
      throw new Error('stateNames must be an array');
    }

    return stateNames
      .map(stateName => this.mapStateToFacebookKey(stateName))
      .filter(result => result !== null);
  }

  /**
   * Validate state names
   * @param {string[]} stateNames - Array of state names to validate
   * @returns {object} - {valid: boolean, validStates: [], invalidStates: []}
   */
  validateStates(stateNames) {
    if (!Array.isArray(stateNames)) {
      return {
        valid: false,
        validStates: [],
        invalidStates: ['Input must be an array']
      };
    }

    const validStates = [];
    const invalidStates = [];

    stateNames.forEach(stateName => {
      const trimmed = stateName?.trim();
      if (!trimmed) {
        invalidStates.push('(empty)');
        return;
      }

      const result = this.mapStateToFacebookKey(trimmed);
      if (result) {
        validStates.push(result);
      } else {
        invalidStates.push(trimmed);
      }
    });

    return {
      valid: invalidStates.length === 0,
      validStates,
      invalidStates
    };
  }

  /**
   * Get state name from Facebook region key
   * @param {string} key - Facebook region key
   * @returns {string|null} - State name or null
   */
  getStateNameFromKey(key) {
    return FACEBOOK_KEY_TO_STATE[key] || null;
  }

  /**
   * Get all supported states
   * @returns {string[]} - Array of state names
   */
  getAllStates() {
    return Object.keys(US_STATES_MAP).filter(key => key.length > 2); // Filter out abbreviations
  }

  /**
   * Search states by partial name
   * @param {string} query - Search query
   * @returns {object[]} - Array of matching states
   */
  searchStates(query) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return Object.entries(US_STATES_MAP)
      .filter(([name]) => name.length > 2) // Exclude abbreviations
      .filter(([name]) => name.toLowerCase().includes(lowerQuery))
      .map(([name, key]) => ({ key, name }));
  }
}

module.exports = new LocationMapper();
