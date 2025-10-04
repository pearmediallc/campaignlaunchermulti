# Strategy 150 Multiply - Complete Project Context

## Project Architecture Overview

### Directory Structure
```
campaign/
├── fb-campaign-launcher/           # Main application directory
│   ├── backend/                   # Node.js/Express backend
│   │   ├── routes/
│   │   │   └── strategy150.js    # Strategy 150 API endpoints
│   │   ├── services/
│   │   │   └── facebookApi.js    # Facebook API integration
│   │   ├── models/               # Sequelize database models
│   │   └── server.js             # Main server configuration
│   └── frontend/                  # React TypeScript frontend
│       └── src/
│           ├── components/Strategy150/
│           │   ├── Strategy150Container.tsx
│           │   ├── Phase1Setup/         # Campaign creation phase
│           │   ├── Phase2PostCapture/   # Post ID capture phase
│           │   ├── Phase3Duplication/   # 49 ad sets duplication
│           │   └── MultiplySection/     # Campaign multiplication
│           │       ├── MultiplyContainer.tsx
│           │       ├── MultiplyProgress.tsx
│           │       ├── MultiplyResults.tsx
│           │       └── CampaignIdInput.tsx
│           ├── services/
│           │   ├── api.ts              # API client configuration
│           │   └── resourceApi.ts      # Resource management API
│           └── types/
│               ├── strategy150.ts      # Type definitions
│               └── strategy150Enhanced.ts
└── website/                     # Documentation/marketing site

```

## Strategy 150 (1-50-1) Campaign Structure

### Campaign Creation Workflow
1. **Phase 1 - Initial Setup (1-1-1)**
   - Create 1 campaign
   - Create 1 ad set
   - Create 1 ad
   - Status: PAUSED by default

2. **Phase 2 - Post ID Capture**
   - Automatic capture from created ad
   - Manual fallback if auto-capture fails
   - Post ID format: `{page_id}_{post_id}`

3. **Phase 3 - Duplication (1-49-1)**
   - Duplicate the initial ad set 49 times
   - Each with $1 daily budget
   - All use the same captured post ID

4. **Multiplication Phase**
   - Clone entire 1-50-1 campaign structure
   - Create multiple complete copies
   - Each copy has 50 ad sets and ads

## Core Components & Files

### Backend Components

#### `/backend/routes/strategy150.js`
Main API router for Strategy 150 functionality:
- **Endpoints:**
  - `GET /api/campaigns/strategy-150/resources` - Get OAuth resources
  - `POST /api/campaigns/strategy-150/create` - Create initial 1-1-1 campaign
  - `GET /api/campaigns/strategy-150/post-id/:adId` - Get post ID from ad
  - `GET /api/campaigns/strategy-150/verify/:campaignId` - Verify campaign for multiplication
  - `POST /api/campaigns/strategy-150/duplicate` - Duplicate ad sets (Phase 3)
  - `POST /api/campaigns/strategy-150/multiply` - Multiply entire campaign
  - `GET /api/campaigns/strategy-150/multiply/status/:jobId` - Get multiplication progress

#### `/backend/services/facebookApi.js`
Facebook API integration service:
- **Key Methods:**
  - `createStrategy150Campaign()` - Creates initial 1-1-1 structure
  - `duplicateAdSetsWithExistingPost()` - Creates 49 additional ad sets
  - `batchMultiplyCampaigns()` - New optimized batch multiplication using deep_copy
  - `multiplyStrategy150Campaign()` - Original sequential multiplication method

### Frontend Components

#### `/frontend/src/components/Strategy150/Strategy150Container.tsx`
Main container managing the workflow:
- Manages phases: setup, creating, waiting, manual, duplicating, completed
- Handles tab switching between create and manage modes
- Orchestrates data flow between phases

#### `/frontend/src/components/Strategy150/MultiplySection/MultiplyContainer.tsx`
Campaign multiplication interface:
- **Features:**
  - Campaign ID input with validation
  - Post ID capture (automatic/manual)
  - Multiply count selection (1-9 copies)
  - Real-time progress tracking
  - Results display with error handling

#### `/frontend/src/types/strategy150.ts`
TypeScript definitions:
- `Strategy150FormData` - Complete form data structure
- `Strategy150Response` - API response structure
- `Strategy150Phase` - Workflow phases
- Constants for all Facebook API options

## Multiplication Logic Deep Dive

### Two Multiplication Methods

#### 1. Batch Multiplication (Optimized - Primary)
```javascript
// Uses Facebook's native deep_copy parameter
async batchMultiplyCampaigns(sourceCampaignId, multiplyCount, updateProgress) {
  // Creates complete campaign copies in single API calls
  // Automatically copies all 50 ad sets and ads
  // Much faster and more reliable
}
```

#### 2. Sequential Multiplication (Fallback)
```javascript
// Original method - kept for compatibility
async multiplyStrategy150Campaign(multiplyData) {
  // Manually copies campaign, then ad sets, then ads
  // More API calls but more control
  // Used as fallback if batch fails
}
```

### Multiplication Process Flow
1. **User Input**
   - Enter source campaign ID
   - Select number of copies (1-9)
   - Optionally provide post ID

2. **Verification**
   - Verify campaign exists
   - Check if it's a Strategy 150 campaign (45-55 ad sets)
   - Auto-fetch post ID if not provided

3. **Job Creation**
   - Generate unique job ID
   - Calculate estimated time (~2.2 minutes per campaign)
   - Return immediately with job ID

4. **Async Processing**
   - Try batch method first (deep_copy)
   - Fall back to sequential if batch fails
   - Update progress in real-time

5. **Progress Tracking**
   - Poll `/multiply/status/:jobId` endpoint
   - Show current operation, progress percentage
   - Display elapsed and remaining time

6. **Results**
   - Show successful campaigns created
   - Display any errors encountered
   - Provide campaign IDs for reference

## API Integration Points

### Resource Management
- `/api/resources/current` - Get active resource configuration
- `/api/resources/switch` - Switch between ad accounts/pages
- Supports multiple ad account management
- UserResourceConfig model for switched resources

### Facebook Authentication
- OAuth 2.0 flow for initial authentication
- SDK authentication as alternative
- Token encryption/decryption for security
- Automatic token refresh middleware

### Rate Limiting & Error Handling
```javascript
getMultiplicationRateLimits() {
  return {
    initialDelay: 5000,        // 5 seconds before first operation
    betweenCampaigns: 40000,   // 40 seconds between campaign copies
    betweenAdSets: 1000,       // 1 second between ad sets
    betweenBatches: 3000,      // 3 seconds between batches
    batchSize: 10,             // Process 10 items per batch
    rateLimitDelay: 65000      // 65 seconds if rate limited
  };
}
```

## Key Data Structures

### Campaign Creation Data
```typescript
interface Strategy150FormData {
  // Campaign Level
  campaignName: string;
  objective: 'OUTCOME_LEADS' | 'PHONE_CALL' | 'OUTCOME_SALES';
  buyingType: 'AUCTION' | 'RESERVED';
  specialAdCategories: string[];
  bidStrategy: string;

  // Ad Set Level
  performanceGoal: string;
  pixel?: string;
  conversionEvent: 'Lead' | 'Contact' | 'Purchase';
  targeting: {
    locations: { countries: string[] };
    ageMin: number;
    ageMax: number;
    genders: string[];
  };

  // Ad Level
  primaryText: string;
  headline: string;
  description?: string;
  url?: string;
  mediaType: 'single_image' | 'single_video' | 'carousel';

  // Budget Settings
  dailyBudget?: number;
  lifetimeBudget?: number;

  // Process Control
  publishDirectly: boolean;
  postId?: string;
}
```

### Multiplication Request
```typescript
interface MultiplicationRequest {
  sourceCampaignId: string;
  multiplyCount: number;      // 1-9
  sourceAdSetIds?: string[];  // Optional for deep_copy
  sourcePostId?: string;      // Optional, auto-fetched if not provided
  manualInput: boolean;       // Whether user manually entered IDs
}
```

### Job Status Response
```typescript
interface JobStatus {
  id: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  currentOperation: string;
  campaigns: any[];           // Created campaigns
  errors: any[];             // Errors encountered
  elapsedSeconds: number;
  remainingSeconds: number;
  percentComplete: number;
}
```

## Known Issues & Solutions

### Issues (from STRATEGY_150_ISSUES.md)
1. **Campaign Parameters Ignored** - Some parameters hardcoded instead of using form data
2. **Special Ad Categories** - Not properly passed to Facebook API
3. **Targeting Structure** - Field name mismatches (locations vs geo_locations)
4. **Case Sensitivity** - 'LEAD' should be 'Lead' in custom_event_type
5. **Performance Goals** - Not being passed to ad set creation

### Solutions Implemented
- Batch multiplication with deep_copy reduces API calls
- Rate limiting prevents Facebook API throttling
- Automatic fallback from batch to sequential method
- Progress tracking with job queue system
- Error recovery and retry logic

## Critical Files Summary

### Configuration Files
- `.env` - Environment variables and API keys
- `package.json` - Dependencies and scripts
- `STRATEGY_150_FACEBOOK_FIELDS.md` - Complete API field documentation

### Route Files
- `/backend/routes/strategy150.js` - Main Strategy 150 endpoints
- `/backend/routes/resourceManager.js` - Resource switching endpoints
- `/backend/routes/facebookAuth.js` - Authentication endpoints

### Service Files
- `/backend/services/facebookApi.js` - Facebook API integration
- `/backend/services/PermissionService.js` - RBAC permissions
- `/backend/services/AuditService.js` - Activity logging

### Frontend Components
- All files in `/frontend/src/components/Strategy150/`
- Especially `MultiplySection/` for multiplication features

### Type Definitions
- `/frontend/src/types/strategy150.ts` - Main types
- `/frontend/src/types/strategy150Enhanced.ts` - Extended types

## Multiplication Performance Metrics

### Timing Estimates
- Initial 1-1-1 creation: ~10-15 seconds
- Post ID capture: ~2-5 seconds
- 49 ad sets duplication: ~2-3 minutes
- Per campaign multiplication: ~2.2 minutes
- Batch multiplication: Significantly faster with deep_copy

### API Call Optimization
- Original method: ~150+ API calls per campaign copy
- Batch method: 1-2 API calls per campaign copy
- Rate limiting: Automatic delays to prevent throttling

## Security & Authentication

### Token Management
- Encrypted token storage in database
- Automatic refresh on expiration
- Secure decryption for API calls

### Permission System
- Role-based access control (RBAC)
- Campaign creation requires specific permissions
- Audit logging for all operations

## Error Handling Patterns

### API Errors
- Facebook API error codes mapped to user-friendly messages
- Automatic retry for rate limit errors
- Fallback methods for critical operations

### Frontend Error Display
- Alert components for user feedback
- Progress indicators with error states
- Retry mechanisms for failed operations

## Testing & Validation

### Campaign Validation
- Form validation on frontend
- Backend validation middleware
- Facebook API validation before submission

### Multiplication Verification
- Campaign existence check
- Ad set count verification (45-55 for Strategy 150)
- Post ID validation

## Deployment Considerations

### Environment Variables Required
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
JWT_SECRET=...
ENCRYPTION_KEY=...
CORS_ORIGIN=https://yourdomain.com
```

### Database Requirements
- PostgreSQL for production
- Sequelize ORM for database operations
- Migrations for schema management

### Performance Optimization
- In-memory job queue (Redis recommended for production)
- Connection pooling for database
- CDN for static assets

## Summary

The Strategy 150 Multiply system is a comprehensive Facebook campaign management solution that:
1. Creates initial 1-50-1 campaign structures
2. Captures and reuses post IDs efficiently
3. Multiplies entire campaigns at scale (up to 9 copies)
4. Handles rate limiting and error recovery
5. Provides real-time progress tracking
6. Supports multiple ad accounts and resource switching

The system uses modern React/TypeScript on the frontend and Node.js/Express on the backend, with robust error handling, authentication, and performance optimization throughout.