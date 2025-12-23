# Campaign Intelligence Engine - Complete Implementation Plan

## Executive Summary

A comprehensive, AI-powered campaign optimization system that learns from your account's performance patterns, automatically manages campaigns based on rules, and maximizes ROAS while minimizing losses.

**Key Features:**
- Pixel Health Dashboard with Event Match Quality tracking
- Account Intelligence Score with learning phase monitoring
- Automation Rules Engine with approval workflow
- Predictive Fatigue Detection
- Smart Budget Reallocation
- In-app Notifications (Slack/Email later)

---

## Table of Contents

1. [Critical: Isolation Architecture](#1-critical-isolation-architecture)
2. [Existing Infrastructure Analysis](#2-existing-infrastructure-analysis)
3. [System Architecture](#3-system-architecture)
4. [Database Schema Design](#4-database-schema-design)
5. [Backend Services](#5-backend-services)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Components](#7-frontend-components)
8. [Data Collection Strategy](#8-data-collection-strategy)
9. [Rules Engine Design](#9-rules-engine-design)
10. [Machine Learning Integration](#10-machine-learning-integration)
11. [ML Evolution Roadmap](#11-ml-evolution-roadmap)
12. [Implementation Phases](#12-implementation-phases)
13. [File Structure](#13-file-structure)
14. [Environment Controls](#14-environment-controls)
15. [Testing Strategy](#15-testing-strategy)

---

## 1. Critical: Isolation Architecture

### ⚠️ GOLDEN RULE: Intelligence Code NEVER Touches Campaign Creation Code

The Intelligence Engine is a **completely separate module** that cannot affect your existing campaign creation, duplication, or management functionality.

### Isolation Principles

| Principle | Implementation |
|-----------|----------------|
| **Separate Folder** | All intelligence code lives in `/backend/intelligence/` - completely isolated from `/backend/services/` |
| **Read-Only Access** | Intelligence READS from Facebook API but NEVER creates/modifies campaigns directly |
| **No Import Dependencies** | Existing services NEVER import from intelligence folder. One-way dependency only. |
| **Separate Database Tables** | All new tables prefixed with `intel_` - no modifications to existing tables |
| **Separate API Routes** | `/api/intelligence/*` - completely separate from `/api/campaigns/*` |
| **Action Via Proxy** | When ML wants to pause/scale, it creates a pending action record. A separate, disableable executor applies it. |
| **Master Kill Switch** | `ENABLE_INTELLIGENCE=false` disables entire module instantly |

### One-Way Data Flow (Critical)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     YOUR EXISTING SYSTEM (PROTECTED)                         │
│                                                                              │
│  /backend/services/           /backend/routes/          /backend/models/    │
│  ├── facebookApi.js          ├── campaigns.js          ├── Campaign.js     │
│  ├── batchDuplication.js     ├── strategy150.js        ├── AdSet.js        │
│  ├── strategy150Duplication  ├── strategyForAll.js     └── ...             │
│  └── ...                     └── campaignManagement.js                      │
│                                                                              │
│  🛡️ THESE FILES ARE NEVER MODIFIED BY INTELLIGENCE CODE                    │
│                                                                              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ READ ONLY (one-way data flow)
                                   │ Intelligence can READ campaigns via Facebook API
                                   │ Intelligence can READ from metricsCalculator
                                   │ Intelligence CANNOT write to these services
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE SYSTEM (ISOLATED)                             │
│                                                                              │
│  /backend/intelligence/       (All new code goes here)                      │
│  ├── services/                                                              │
│  │   ├── InsightsCollectorService.js                                        │
│  │   ├── AutomationRulesEngine.js                                           │
│  │   ├── PatternLearningService.js                                          │
│  │   └── ActionExecutor.js          ← Separate, can be disabled            │
│  ├── models/                                                                 │
│  │   ├── IntelPerformanceSnapshot.js                                        │
│  │   ├── IntelAutomationRule.js                                             │
│  │   └── IntelAutomationAction.js   ← Actions queue here first              │
│  ├── ml/                                                                     │
│  │   ├── FeatureExtractor.js                                                │
│  │   ├── KMeansClustering.js                                                │
│  │   └── ReinforcementLearner.js                                            │
│  └── routes/                                                                 │
│      └── intelligence.js                                                    │
│                                                                              │
│  Output: IntelAutomationAction records (pending_approval status)            │
│                                                                              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ OPTIONAL (can be completely disabled)
                                   │ Only executes if ENABLE_ACTION_EXECUTOR=true
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ACTION EXECUTOR (Separate Process)                         │
│                                                                              │
│  - Reads pending actions from IntelAutomationAction table                   │
│  - Applies changes via Facebook API (pause, budget change, etc.)            │
│  - Logs results back to the action record                                   │
│  - Can be disabled with ENABLE_ACTION_EXECUTOR=false                        │
│  - Has rate limits: MAX_AUTO_ACTIONS_PER_HOUR=10                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How Actions Stay Safe

```javascript
// ❌ INTELLIGENCE CODE NEVER DOES THIS DIRECTLY:
await facebookApi.updateAdSet(adSetId, { status: 'PAUSED' });
await facebookApi.updateCampaign(campaignId, { daily_budget: newBudget });

// ✅ INSTEAD, IT CREATES A PENDING ACTION RECORD:
await IntelAutomationAction.create({
  entity_type: 'adset',
  entity_id: adSetId,
  action_type: 'pause',
  status: 'pending_approval',  // Human must approve first
  reason: 'CPA exceeded 2x target for 24 hours',
  triggered_metrics: { cpa: 68.50, target_cpa: 30.00 },
  model_confidence: 0.87,      // ML confidence score
  model_version: 'v1.2.0',     // Which model version made this decision
  features_used: JSON.stringify(['cpa', 'spend', 'conversions', 'frequency'])
});

// ✅ A SEPARATE EXECUTOR (that can be disabled) READS AND APPLIES:
// /backend/intelligence/services/ActionExecutor.js
// Only runs if ENABLE_ACTION_EXECUTOR=true
```

### What Happens If Intelligence Breaks

| Scenario | Impact on Campaign Creation |
|----------|----------------------------|
| Intelligence service crashes | **ZERO** - Campaign creation works normally |
| ML model returns bad predictions | **ZERO** - Actions sit in pending_approval, campaigns unaffected |
| Database migration fails for intel tables | **ZERO** - Separate tables, main tables untouched |
| Rate limit hit by insights collector | **ZERO** - Uses separate API quota tracking |
| Pattern learning has bugs | **ZERO** - Only writes to intel tables, never touches campaigns |

---

## 2. Existing Infrastructure Analysis

### What We Already Have (Reusable Components)

| Component | File Location | What It Does | How We'll Use It |
|-----------|---------------|--------------|------------------|
| **MetricsCalculator** | `backend/services/metricsCalculator.js` | CPM, CTR, CPC, CPR, ROAS, Frequency calculations | Direct reuse for all metric calculations |
| **QueueProcessor** | `backend/services/QueueProcessor.js` | Background job processing every 60 seconds | Extend for hourly data collection |
| **CampaignTracking Model** | `backend/models/CampaignTracking.js` | Stores campaign_id, user_id, learning_phase_summary | Extend for performance history |
| **FailedEntity Model** | `backend/models/FailedEntity.js` | Tracks failures with retry logic | Reuse for automation failure tracking |
| **AuditLog Model** | `backend/models/AuditLog.js` | Action logging with status tracking | Extend for automation action logs |
| **FacebookAPI** | `backend/services/facebookApi.js` | getCampaignStructure, effective_status fields | Add getInsights, getPixelStats methods |
| **RateLimitService** | `backend/services/RateLimitService.js` | API rate limiting management | Reuse for insights fetching |
| **PerformanceMetrics** | `frontend/src/components/.../PerformanceMetrics.tsx` | Metric display cards | Reuse patterns for dashboards |

### What We Need to Build

| Component | Purpose | Priority |
|-----------|---------|----------|
| InsightsCollectorService | Hourly data fetching from Facebook | P0 |
| AutomationRulesEngine | Rule evaluation and action execution | P0 |
| PixelHealthService | Pixel event stats and EMQ tracking | P0 |
| PatternLearningService | Learn account-specific patterns | P1 |
| NotificationService | In-app + future Slack/Email | P1 |
| Campaign Intelligence Dashboard | Unified UI for all features | P0 |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CAMPAIGN INTELLIGENCE ENGINE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         DATA COLLECTION LAYER                            │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ Insights     │  │ Pixel Stats  │  │ Learning     │  │ Ad Account   │ │    │
│  │  │ Collector    │  │ Fetcher      │  │ Phase Monitor│  │ Health Check │ │    │
│  │  │ (Hourly)     │  │ (Hourly)     │  │ (Hourly)     │  │ (Daily)      │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │         │                │                │                 │            │    │
│  │         └────────────────┴────────────────┴─────────────────┘            │    │
│  │                                   │                                       │    │
│  │                                   ▼                                       │    │
│  │                    ┌──────────────────────────┐                          │    │
│  │                    │   Performance History    │                          │    │
│  │                    │   Database (PostgreSQL)  │                          │    │
│  │                    └──────────────────────────┘                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         ANALYSIS LAYER                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ Metrics      │  │ Pattern      │  │ Trend        │  │ Anomaly      │ │    │
│  │  │ Calculator   │  │ Detector     │  │ Analyzer     │  │ Detector     │ │    │
│  │  │ (Existing)   │  │ (ML-based)   │  │              │  │              │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │         │                │                │                 │            │    │
│  │         └────────────────┴────────────────┴─────────────────┘            │    │
│  │                                   │                                       │    │
│  │                                   ▼                                       │    │
│  │                    ┌──────────────────────────┐                          │    │
│  │                    │   Account Intelligence   │                          │    │
│  │                    │        Score             │                          │    │
│  │                    └──────────────────────────┘                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         AUTOMATION LAYER                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    RULES ENGINE                                   │   │    │
│  │  │                                                                   │   │    │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │    │
│  │  │  │ User Rules │  │ Learned    │  │ System     │  │ Threshold  │  │   │    │
│  │  │  │ (Custom)   │  │ Patterns   │  │ Defaults   │  │ Alerts     │  │   │    │
│  │  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │    │
│  │  │         │                │                │                │      │   │    │
│  │  │         └────────────────┴────────────────┴────────────────┘      │   │    │
│  │  │                                   │                                │   │    │
│  │  │                                   ▼                                │   │    │
│  │  │                    ┌──────────────────────────┐                   │   │    │
│  │  │                    │   Action Evaluator       │                   │   │    │
│  │  │                    └──────────────────────────┘                   │   │    │
│  │  │                                   │                                │   │    │
│  │  │                    ┌──────────────┴──────────────┐                │   │    │
│  │  │                    │                             │                │   │    │
│  │  │                    ▼                             ▼                │   │    │
│  │  │         ┌──────────────────┐         ┌──────────────────┐        │   │    │
│  │  │         │ Approval Mode    │         │ Automatic Mode   │        │   │    │
│  │  │         │ (Initial Phase)  │         │ (After Learning) │        │   │    │
│  │  │         └──────────────────┘         └──────────────────┘        │   │    │
│  │  └──────────────────────────────────────────────────────────────────┘   │    │
│  │                                                                          │    │
│  │                                   │                                       │    │
│  │                                   ▼                                       │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    ACTION EXECUTOR                                │   │    │
│  │  │                                                                   │   │    │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │    │
│  │  │  │ Pause/     │  │ Budget     │  │ Bid        │  │ Duplicate  │  │   │    │
│  │  │  │ Activate   │  │ Adjust     │  │ Adjust     │  │ Winner     │  │   │    │
│  │  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │    │
│  │  └──────────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         NOTIFICATION LAYER                               │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ In-App       │  │ Email        │  │ Slack        │  │ Webhook      │ │    │
│  │  │ (Phase 1)    │  │ (Phase 2)    │  │ (Phase 2)    │  │ (Phase 3)    │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Design

### New Models Required

#### 3.1 PerformanceSnapshot (Hourly data storage)

```javascript
// backend/models/PerformanceSnapshot.js
{
  id: INTEGER PRIMARY KEY,

  // Identity
  user_id: INTEGER NOT NULL (FK -> Users),
  ad_account_id: STRING NOT NULL,
  entity_type: ENUM('campaign', 'adset', 'ad'),
  entity_id: STRING NOT NULL,
  entity_name: STRING,

  // Snapshot timing
  snapshot_time: DATETIME NOT NULL,
  date_preset: STRING, // 'last_1d', 'last_7d', 'last_30d'

  // Raw metrics from Facebook
  impressions: BIGINT DEFAULT 0,
  reach: BIGINT DEFAULT 0,
  clicks: BIGINT DEFAULT 0,
  spend: DECIMAL(12,4) DEFAULT 0,

  // Conversion data (JSON for flexibility)
  actions: JSON, // { purchase: 5, lead: 10, link_click: 100 }
  action_values: JSON, // { purchase: 500.00 }

  // Calculated metrics
  cpm: DECIMAL(10,4),
  ctr: DECIMAL(10,6),
  cpc: DECIMAL(10,4),
  frequency: DECIMAL(10,4),

  // Status data
  effective_status: STRING,
  learning_phase: ENUM('LEARNING', 'LEARNING_LIMITED', 'ACTIVE', 'INACTIVE'),
  delivery_status: STRING,

  // Indexes
  INDEX: [user_id, snapshot_time],
  INDEX: [entity_type, entity_id, snapshot_time],
  INDEX: [ad_account_id, snapshot_time]
}
```

#### 3.2 PixelHealth (Pixel tracking data)

```javascript
// backend/models/PixelHealth.js
{
  id: INTEGER PRIMARY KEY,

  // Identity
  user_id: INTEGER NOT NULL (FK -> Users),
  pixel_id: STRING NOT NULL,
  pixel_name: STRING,
  ad_account_id: STRING NOT NULL,

  // Snapshot timing
  snapshot_time: DATETIME NOT NULL,

  // Event data
  events_received_today: INTEGER DEFAULT 0,
  events_received_7d: INTEGER DEFAULT 0,
  events_received_30d: INTEGER DEFAULT 0,

  // Event breakdown
  event_breakdown: JSON, // { PageView: 1000, AddToCart: 100, Purchase: 20 }

  // Quality metrics
  event_match_quality: DECIMAL(3,1), // 0.0 - 10.0
  last_fired_time: DATETIME,

  // Funnel metrics
  funnel_conversion_rates: JSON, // { pageview_to_atc: 10%, atc_to_purchase: 20% }

  // Indexes
  INDEX: [user_id, pixel_id, snapshot_time],
  INDEX: [ad_account_id, snapshot_time]
}
```

#### 3.3 AutomationRule (User-defined rules)

```javascript
// backend/models/AutomationRule.js
{
  id: INTEGER PRIMARY KEY,

  // Ownership
  user_id: INTEGER NOT NULL (FK -> Users),
  ad_account_id: STRING, // NULL = applies to all accounts

  // Rule definition
  name: STRING NOT NULL,
  description: TEXT,
  category: ENUM('loss_prevention', 'scaling', 'learning_protection',
                 'time_based', 'budget_reallocation', 'fatigue_detection'),

  // Rule logic (JSON structure)
  conditions: JSON NOT NULL,
  /* Example:
  {
    "operator": "AND",
    "rules": [
      { "field": "spend", "operator": ">", "value": 50 },
      { "field": "conversions", "operator": "=", "value": 0 },
      { "field": "impressions", "operator": ">", "value": 1000 }
    ]
  }
  */

  // Action to take
  action_type: ENUM('pause', 'activate', 'increase_budget', 'decrease_budget',
                    'adjust_bid', 'duplicate', 'notify_only'),
  action_params: JSON, // { percentage: 20 } or { amount: 10 }

  // Execution settings
  execution_mode: ENUM('approval_required', 'automatic', 'suggestion_only'),
  applies_to: ENUM('campaign', 'adset', 'ad'),

  // Status
  is_active: BOOLEAN DEFAULT true,
  priority: INTEGER DEFAULT 0,

  // Stats
  times_triggered: INTEGER DEFAULT 0,
  times_executed: INTEGER DEFAULT 0,
  last_triggered_at: DATETIME,

  // Timestamps
  created_at: DATETIME,
  updated_at: DATETIME,

  // Indexes
  INDEX: [user_id, is_active],
  INDEX: [category, is_active]
}
```

#### 3.4 AutomationAction (Action log with approval workflow)

```javascript
// backend/models/AutomationAction.js
{
  id: INTEGER PRIMARY KEY,

  // Relationships
  user_id: INTEGER NOT NULL (FK -> Users),
  rule_id: INTEGER (FK -> AutomationRule), // NULL if system-generated

  // Target
  entity_type: ENUM('campaign', 'adset', 'ad'),
  entity_id: STRING NOT NULL,
  entity_name: STRING,
  ad_account_id: STRING NOT NULL,

  // Action details
  action_type: ENUM('pause', 'activate', 'increase_budget', 'decrease_budget',
                    'adjust_bid', 'duplicate', 'notify_only'),
  action_params: JSON,

  // Values before/after
  value_before: JSON, // { budget: 100, status: 'ACTIVE' }
  value_after: JSON, // { budget: 80, status: 'PAUSED' }

  // Status
  status: ENUM('pending_approval', 'approved', 'rejected', 'executed',
               'failed', 'expired'),

  // Reason/explanation
  reason: TEXT, // "CPA exceeded 2x target for 24 hours"
  triggered_metrics: JSON, // { cpa: 48.50, target_cpa: 20.00, duration: '24h' }

  // Approval workflow
  requires_approval: BOOLEAN DEFAULT true,
  approved_by: INTEGER (FK -> Users),
  approved_at: DATETIME,
  rejection_reason: TEXT,

  // Execution
  executed_at: DATETIME,
  execution_result: JSON,
  error_message: TEXT,

  // Expiry (for pending approvals)
  expires_at: DATETIME,

  // Timestamps
  created_at: DATETIME,

  // Indexes
  INDEX: [user_id, status, created_at],
  INDEX: [entity_id, created_at],
  INDEX: [status, expires_at]
}
```

#### 3.5 AccountScore (Intelligence score tracking)

```javascript
// backend/models/AccountScore.js
{
  id: INTEGER PRIMARY KEY,

  // Identity
  user_id: INTEGER NOT NULL (FK -> Users),
  ad_account_id: STRING NOT NULL,

  // Score components (0-100 each)
  overall_score: INTEGER,

  learning_health_score: INTEGER, // Based on learning phase status
  performance_score: INTEGER, // Based on ROAS, CPA trends
  budget_efficiency_score: INTEGER, // Based on spend distribution
  creative_health_score: INTEGER, // Based on frequency, CTR trends

  // Score breakdown
  score_breakdown: JSON,
  /* {
    learning_health: { score: 85, issues: [...], in_learning: 3, learning_limited: 1 },
    performance: { score: 78, roas_trend: 'up', cpa_trend: 'down' },
    budget_efficiency: { score: 82, underperforming_spend: 15% },
    creative_health: { score: 70, fatigue_risk: ['ad_123', 'ad_456'] }
  } */

  // Recommendations
  recommendations: JSON, // [{ priority: 'high', action: 'pause', entity: 'adset_123', reason: '...' }]

  // Snapshot timing
  calculated_at: DATETIME NOT NULL,

  // Indexes
  INDEX: [user_id, ad_account_id, calculated_at]
}
```

#### 3.6 LearnedPattern (ML-detected patterns)

```javascript
// backend/models/LearnedPattern.js
{
  id: INTEGER PRIMARY KEY,

  // Scope
  user_id: INTEGER NOT NULL (FK -> Users),
  ad_account_id: STRING, // NULL = account-wide pattern

  // Pattern definition
  pattern_type: ENUM('time_performance', 'audience_decay', 'creative_fatigue',
                     'budget_sweet_spot', 'conversion_lag', 'seasonal'),

  pattern_data: JSON,
  /* Examples:

  Time Performance:
  {
    type: 'time_performance',
    best_hours: [10, 11, 14, 15, 20, 21],
    worst_hours: [2, 3, 4, 5],
    best_days: ['Tuesday', 'Wednesday', 'Thursday'],
    weekend_performance: 0.85 // 85% of weekday average
  }

  Creative Fatigue:
  {
    type: 'creative_fatigue',
    avg_frequency_before_decline: 3.2,
    ctr_decline_rate: 0.15, // 15% per frequency point
    typical_lifespan_days: 14
  }

  Budget Sweet Spot:
  {
    type: 'budget_sweet_spot',
    optimal_daily_budget_range: { min: 50, max: 200 },
    cpa_increases_above: 250,
    diminishing_returns_at: 180
  }
  */

  // Confidence
  confidence_score: DECIMAL(3,2), // 0.00 - 1.00
  sample_size: INTEGER, // Number of data points used

  // Validity
  valid_from: DATETIME,
  valid_until: DATETIME, // Re-learn after this

  // Status
  is_active: BOOLEAN DEFAULT true,

  // Timestamps
  created_at: DATETIME,
  updated_at: DATETIME,

  // Indexes
  INDEX: [user_id, pattern_type, is_active],
  INDEX: [ad_account_id, pattern_type]
}
```

#### 3.7 Notification (In-app notifications)

```javascript
// backend/models/Notification.js
{
  id: INTEGER PRIMARY KEY,

  // Recipient
  user_id: INTEGER NOT NULL (FK -> Users),

  // Content
  type: ENUM('action_pending', 'action_executed', 'alert', 'insight',
             'system', 'recommendation'),
  severity: ENUM('info', 'warning', 'error', 'success'),
  title: STRING NOT NULL,
  message: TEXT NOT NULL,

  // Related data
  related_entity_type: STRING, // 'campaign', 'adset', 'automation_action'
  related_entity_id: STRING,
  action_url: STRING, // Deep link to relevant page

  // Additional data
  data: JSON,

  // Status
  is_read: BOOLEAN DEFAULT false,
  read_at: DATETIME,

  // Expiry
  expires_at: DATETIME,

  // Timestamps
  created_at: DATETIME,

  // Indexes
  INDEX: [user_id, is_read, created_at],
  INDEX: [user_id, type, created_at]
}
```

---

## 4. Backend Services

### 4.1 InsightsCollectorService

```javascript
// backend/services/intelligence/InsightsCollectorService.js

/**
 * Fetches campaign/adset/ad insights from Facebook API hourly
 * Stores snapshots in PerformanceSnapshot table
 *
 * Reuses:
 * - FacebookAPI service for API calls
 * - MetricsCalculator for metric calculations
 * - RateLimitService for rate limiting
 */

class InsightsCollectorService {
  // Fetch all insights for a user's active campaigns
  async collectUserInsights(userId, adAccountId);

  // Fetch insights for specific entities
  async collectCampaignInsights(campaignId, datePresets);
  async collectAdSetInsights(adSetId, datePresets);

  // Store snapshot
  async storeSnapshot(entityType, entityId, insightsData);

  // Get historical data
  async getPerformanceTrend(entityId, days);
  async comparePerformance(entityId, period1, period2);
}
```

### 4.2 PixelHealthService

```javascript
// backend/services/intelligence/PixelHealthService.js

/**
 * Monitors pixel health and event quality
 * Calculates funnel conversion rates
 */

class PixelHealthService {
  // Fetch pixel stats from Facebook
  async fetchPixelStats(pixelId);

  // Calculate event match quality
  async calculateEMQ(pixelId);

  // Get event breakdown
  async getEventBreakdown(pixelId, days);

  // Calculate funnel rates
  async calculateFunnelRates(pixelId);

  // Store health snapshot
  async storeHealthSnapshot(pixelId, healthData);

  // Get health history
  async getHealthHistory(pixelId, days);
}
```

### 4.3 AutomationRulesEngine

```javascript
// backend/services/intelligence/AutomationRulesEngine.js

/**
 * Core rules evaluation engine
 * Supports both user-defined rules and learned patterns
 */

class AutomationRulesEngine {
  // Evaluate all rules for a user
  async evaluateRulesForUser(userId);

  // Evaluate single rule against entity
  async evaluateRule(rule, entityData);

  // Check conditions
  evaluateConditions(conditions, entityData);

  // Create pending action
  async createPendingAction(rule, entity, triggeredMetrics);

  // Execute action (after approval or automatic)
  async executeAction(actionId);

  // Built-in rule templates
  getDefaultRules();

  // Rule validation
  validateRuleDefinition(rule);
}
```

### 4.4 PatternLearningService

```javascript
// backend/services/intelligence/PatternLearningService.js

/**
 * Learns patterns from historical data
 * Uses statistical analysis (no heavy ML libraries needed initially)
 */

class PatternLearningService {
  // Analyze time-based patterns
  async learnTimePatterns(userId, adAccountId);

  // Detect creative fatigue signals
  async detectFatiguePatterns(userId, adAccountId);

  // Find budget sweet spots
  async findBudgetOptimums(userId, adAccountId);

  // Store learned pattern
  async storePattern(pattern);

  // Get active patterns for account
  async getActivePatterns(userId, adAccountId);

  // Refresh patterns (called weekly)
  async refreshPatterns(userId);
}
```

### 4.5 AccountScoreService

```javascript
// backend/services/intelligence/AccountScoreService.js

/**
 * Calculates overall account health score
 * Generates recommendations
 */

class AccountScoreService {
  // Calculate all score components
  async calculateAccountScore(userId, adAccountId);

  // Individual score calculations
  async calculateLearningHealthScore(snapshots);
  async calculatePerformanceScore(snapshots);
  async calculateBudgetEfficiencyScore(snapshots);
  async calculateCreativeHealthScore(snapshots);

  // Generate recommendations
  async generateRecommendations(scoreBreakdown);

  // Store score
  async storeAccountScore(userId, adAccountId, scoreData);

  // Get score history
  async getScoreHistory(userId, adAccountId, days);
}
```

### 4.6 NotificationService

```javascript
// backend/services/intelligence/NotificationService.js

/**
 * Handles all notification delivery
 * In-app initially, Slack/Email later
 */

class NotificationService {
  // Create notification
  async createNotification(userId, notificationData);

  // Get user notifications
  async getUserNotifications(userId, options);

  // Mark as read
  async markAsRead(notificationId);
  async markAllAsRead(userId);

  // Delete old notifications
  async cleanupExpired();

  // Future: External notifications
  async sendSlackNotification(userId, message);
  async sendEmailNotification(userId, subject, body);
}
```

### 4.7 IntelligenceScheduler (Extends QueueProcessor)

```javascript
// backend/services/intelligence/IntelligenceScheduler.js

/**
 * Extends existing QueueProcessor for intelligence tasks
 * Runs hourly data collection and rule evaluation
 */

class IntelligenceScheduler {
  constructor() {
    this.collectors = [];
    this.evaluators = [];
  }

  // Start hourly collection for all users
  startHourlyCollection();

  // Start rule evaluation cycle
  startRuleEvaluation();

  // Start daily tasks (score calculation, pattern learning)
  startDailyTasks();

  // Individual user processing
  async processUserInsights(userId);
  async processUserRules(userId);
  async processUserPatterns(userId);
}
```

---

## 5. API Endpoints

### 5.1 Intelligence Dashboard APIs

```
GET  /api/intelligence/dashboard
     Returns: Overall dashboard data (scores, alerts, recent actions)

GET  /api/intelligence/pixel/:pixelId/health
     Returns: Pixel health data with EMQ, events, funnel rates

GET  /api/intelligence/account/:adAccountId/score
     Returns: Account score breakdown with recommendations

GET  /api/intelligence/performance/:entityType/:entityId/trend
     Query: { days: 7|14|30 }
     Returns: Performance trend data for charts
```

### 5.2 Automation Rules APIs

```
GET    /api/intelligence/rules
       Returns: All user's automation rules

POST   /api/intelligence/rules
       Body: Rule definition
       Returns: Created rule

PUT    /api/intelligence/rules/:ruleId
       Body: Updated rule definition
       Returns: Updated rule

DELETE /api/intelligence/rules/:ruleId
       Returns: Success status

POST   /api/intelligence/rules/:ruleId/toggle
       Body: { active: boolean }
       Returns: Updated rule

GET    /api/intelligence/rules/templates
       Returns: Built-in rule templates
```

### 5.3 Automation Actions APIs

```
GET  /api/intelligence/actions
     Query: { status: 'pending_approval'|'executed'|'all', days: 7 }
     Returns: Action history

POST /api/intelligence/actions/:actionId/approve
     Returns: Approved action (triggers execution)

POST /api/intelligence/actions/:actionId/reject
     Body: { reason: string }
     Returns: Rejected action

GET  /api/intelligence/actions/stats
     Returns: Action statistics (triggered, executed, savings)
```

### 5.4 Notifications APIs

```
GET  /api/notifications
     Query: { unread: boolean, limit: 50 }
     Returns: User notifications

POST /api/notifications/:notificationId/read
     Returns: Updated notification

POST /api/notifications/read-all
     Returns: Success status

GET  /api/notifications/count
     Returns: { unread: number }
```

### 5.5 Pattern Learning APIs

```
GET  /api/intelligence/patterns
     Returns: Learned patterns for user's accounts

GET  /api/intelligence/patterns/:patternType
     Returns: Specific pattern type data

POST /api/intelligence/patterns/refresh
     Triggers pattern re-learning
     Returns: Job status
```

---

## 6. Frontend Components

### 6.1 Page Structure

```
/intelligence                    - Main Intelligence Dashboard
/intelligence/pixel              - Pixel Health Dashboard
/intelligence/account            - Account Score Dashboard
/intelligence/rules              - Automation Rules Management
/intelligence/rules/create       - Create New Rule
/intelligence/actions            - Action History & Approvals
/intelligence/patterns           - Learned Patterns Viewer
```

### 6.2 Component Hierarchy

```
src/pages/
├── IntelligenceDashboard.tsx          # Main dashboard page
│
├── intelligence/
│   ├── PixelHealthDashboard.tsx       # Pixel health details
│   ├── AccountScoreDashboard.tsx      # Account score details
│   ├── AutomationRules.tsx            # Rules list & management
│   ├── RuleBuilder.tsx                # Create/edit rule wizard
│   ├── ActionHistory.tsx              # Actions with approval workflow
│   └── LearnedPatterns.tsx            # Pattern visualization

src/components/intelligence/
├── ScoreCard.tsx                      # Reusable score display card
├── MetricTrendChart.tsx               # Line chart for trends
├── PixelEventFunnel.tsx               # Funnel visualization
├── RuleConditionBuilder.tsx           # Condition builder UI
├── ActionApprovalCard.tsx             # Single action approval UI
├── NotificationBell.tsx               # Notification indicator
├── NotificationDropdown.tsx           # Notification list dropdown
├── PatternCard.tsx                    # Pattern display card
├── RecommendationsList.tsx            # Recommendations display
└── PerformanceComparison.tsx          # Before/after comparison
```

### 6.3 Key UI Components

#### Intelligence Dashboard Overview
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Campaign Intelligence Engine                              [Notifications 🔔] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │ Account Score  │  │ Pending Actions│  │ Active Rules   │  │ Savings    │ │
│  │     78/100     │  │      3         │  │     12         │  │  $1,247    │ │
│  │   ↑ +5 pts     │  │   ⚠️ Review    │  │   ✅ Running   │  │  This Month│ │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │ Pending Approvals                     │  │ Recent Actions               │ │
│  │                                       │  │                              │ │
│  │ ⚠️ Pause AdSet "Summer Sale" ?       │  │ ✅ Scaled "Winner" +20%      │ │
│  │    CPA $68 > $40 target for 24h      │  │    2 hours ago               │ │
│  │    [Approve] [Reject] [Details]      │  │                              │ │
│  │                                       │  │ ✅ Paused "Test" (no conv)   │ │
│  │ ⚠️ Reduce Budget "Testing" -30% ?    │  │    5 hours ago               │ │
│  │    Frequency 4.2, CTR declining      │  │                              │ │
│  │    [Approve] [Reject] [Details]      │  │ 📊 Pattern detected: Best    │ │
│  │                                       │  │    hours 10am-2pm            │ │
│  └──────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ Performance Trend (7 Days)                                               ││
│  │                                                                          ││
│  │  ROAS ────  CPA ----  Spend ····                                        ││
│  │  ▁▂▃▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃                                        ││
│  │  Mon   Tue   Wed   Thu   Fri   Sat   Sun                                ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────────────┐│
│  │ Top Recommendations           │  │ Learned Patterns                      ││
│  │                               │  │                                       ││
│  │ 1. 🔴 Pause "Cold Audience"   │  │ ⏰ Best Hours: 10am-2pm, 7pm-9pm     ││
│  │    $120 spent, 0 conversions  │  │    Confidence: 87%                   ││
│  │                               │  │                                       ││
│  │ 2. 🟢 Scale "Retargeting"     │  │ 📈 Weekend ROAS: 15% higher          ││
│  │    ROAS 4.2x, room to grow    │  │    Confidence: 92%                   ││
│  │                               │  │                                       ││
│  │ 3. 🟡 Refresh creative        │  │ 💰 Optimal budget: $80-$150/day      ││
│  │    Frequency 3.8, CTR ↓12%    │  │    Confidence: 78%                   ││
│  └───────────────────────────────┘  └───────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Collection Strategy

### 7.1 Hourly Collection Schedule

```
Every Hour:
├── For each active user:
│   ├── Fetch campaign-level insights (last_1d)
│   ├── Fetch ad set-level insights (last_1d)
│   ├── Fetch ad-level insights (last_1d)
│   ├── Fetch pixel health stats
│   └── Store all snapshots
│
├── Rate Limit Management:
│   ├── Max 200 API calls per hour per ad account
│   ├── Use batch requests where possible
│   └── Prioritize active campaigns
│
└── Error Handling:
    ├── Retry transient errors (5xx)
    ├── Skip rate-limited accounts (retry next hour)
    └── Log all failures for monitoring
```

### 7.2 Facebook API Fields to Fetch

#### Campaign Level
```javascript
const CAMPAIGN_FIELDS = [
  'id', 'name', 'status', 'effective_status',
  'daily_budget', 'lifetime_budget', 'budget_remaining',
  'objective', 'bid_strategy', 'buying_type',
  'created_time', 'updated_time', 'start_time', 'stop_time'
];

const CAMPAIGN_INSIGHTS_FIELDS = [
  'impressions', 'reach', 'clicks', 'spend',
  'cpm', 'ctr', 'cpc', 'frequency',
  'actions', 'action_values', 'cost_per_action_type',
  'conversions', 'conversion_values', 'cost_per_conversion'
];
```

#### Ad Set Level
```javascript
const ADSET_FIELDS = [
  'id', 'name', 'status', 'effective_status',
  'daily_budget', 'lifetime_budget', 'budget_remaining',
  'optimization_goal', 'billing_event', 'bid_strategy', 'bid_amount',
  'targeting', 'promoted_object',
  'learning_phase_info', // CRITICAL: Learning phase status
  'issues_info', // Delivery issues
  'created_time', 'updated_time', 'start_time', 'end_time'
];
```

#### Ad Level
```javascript
const AD_FIELDS = [
  'id', 'name', 'status', 'effective_status',
  'creative', 'tracking_specs',
  'created_time', 'updated_time'
];
```

#### Pixel Stats
```javascript
const PIXEL_FIELDS = [
  'id', 'name', 'creation_time', 'last_fired_time',
  'is_unavailable', 'owner_ad_account'
];

// Endpoint: GET /{pixel_id}/stats
const PIXEL_STATS_PARAMS = {
  aggregation: 'event', // Group by event type
  start_time: 'last 30 days',
  end_time: 'now'
};
```

### 7.3 Data Retention Policy

| Data Type | Retention Period | Aggregation |
|-----------|------------------|-------------|
| Hourly snapshots | 7 days | Raw hourly data |
| Daily aggregates | 90 days | Aggregated from hourly |
| Weekly aggregates | 1 year | Aggregated from daily |
| Account scores | 90 days | Daily snapshots |
| Learned patterns | Until invalidated | Re-learned weekly |
| Action history | Forever | Audit trail |

---

## 8. Rules Engine Design

### 8.1 Rule Condition Operators

```javascript
const OPERATORS = {
  // Numeric comparisons
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '=': (a, b) => a === b,
  '!=': (a, b) => a !== b,

  // Range
  'between': (a, [min, max]) => a >= min && a <= max,

  // Time-based
  'for_hours': (current, threshold) => current >= threshold,
  'for_days': (current, threshold) => current >= threshold,

  // Trend
  'increasing': (trend) => trend > 0,
  'decreasing': (trend) => trend < 0,
  'stable': (trend) => Math.abs(trend) < 0.05,

  // Status
  'is': (a, b) => a === b,
  'is_not': (a, b) => a !== b,
  'in': (a, list) => list.includes(a),
  'not_in': (a, list) => !list.includes(a)
};
```

### 8.2 Available Fields for Rules

```javascript
const RULE_FIELDS = {
  // Spend
  'spend': { type: 'currency', source: 'insights' },
  'spend_today': { type: 'currency', source: 'insights' },
  'spend_7d': { type: 'currency', source: 'insights' },

  // Conversions
  'conversions': { type: 'number', source: 'insights' },
  'conversions_today': { type: 'number', source: 'insights' },
  'conversion_value': { type: 'currency', source: 'insights' },

  // Cost metrics
  'cpa': { type: 'currency', source: 'calculated' },
  'cpc': { type: 'currency', source: 'calculated' },
  'cpm': { type: 'currency', source: 'calculated' },

  // Performance
  'roas': { type: 'number', source: 'calculated' },
  'ctr': { type: 'percentage', source: 'calculated' },
  'frequency': { type: 'number', source: 'calculated' },

  // Engagement
  'impressions': { type: 'number', source: 'insights' },
  'reach': { type: 'number', source: 'insights' },
  'clicks': { type: 'number', source: 'insights' },

  // Status
  'effective_status': { type: 'enum', source: 'entity' },
  'learning_phase': { type: 'enum', source: 'entity' },

  // Time
  'days_active': { type: 'number', source: 'calculated' },
  'hours_since_conversion': { type: 'number', source: 'calculated' },

  // Trends
  'ctr_trend_7d': { type: 'percentage', source: 'calculated' },
  'cpa_trend_7d': { type: 'percentage', source: 'calculated' },
  'roas_trend_7d': { type: 'percentage', source: 'calculated' }
};
```

### 8.3 Default Rule Templates

```javascript
const DEFAULT_RULES = [
  // Loss Prevention
  {
    name: 'Zero Conversions Stop Loss',
    category: 'loss_prevention',
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'spend', operator: '>', value: 50 },
        { field: 'conversions', operator: '=', value: 0 },
        { field: 'impressions', operator: '>', value: 1000 }
      ]
    },
    action_type: 'pause',
    execution_mode: 'approval_required',
    applies_to: 'adset'
  },

  {
    name: 'CPA Exceeds 2x Target',
    category: 'loss_prevention',
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'cpa', operator: '>', value: '{target_cpa * 2}' },
        { field: 'conversions', operator: '>=', value: 3 },
        { field: 'spend', operator: '>', value: 100 }
      ]
    },
    action_type: 'decrease_budget',
    action_params: { percentage: 50 },
    execution_mode: 'approval_required',
    applies_to: 'adset'
  },

  // Scaling
  {
    name: 'Scale High ROAS Winners',
    category: 'scaling',
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'roas', operator: '>', value: 2.5 },
        { field: 'spend_7d', operator: '>', value: 100 },
        { field: 'conversions', operator: '>=', value: 10 }
      ]
    },
    action_type: 'increase_budget',
    action_params: { percentage: 20 },
    execution_mode: 'approval_required',
    applies_to: 'adset'
  },

  // Learning Phase Protection
  {
    name: 'Protect Learning Phase',
    category: 'learning_protection',
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'learning_phase', operator: 'is', value: 'LEARNING' },
        { field: 'days_active', operator: '<', value: 7 }
      ]
    },
    action_type: 'notify_only',
    action_params: { message: 'Ad set in learning phase - avoid edits' },
    execution_mode: 'automatic',
    applies_to: 'adset'
  },

  // Creative Fatigue
  {
    name: 'Creative Fatigue Alert',
    category: 'fatigue_detection',
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'frequency', operator: '>', value: 3.5 },
        { field: 'ctr_trend_7d', operator: '<', value: -15 }
      ]
    },
    action_type: 'notify_only',
    action_params: { message: 'Creative fatigue detected - consider refresh' },
    execution_mode: 'automatic',
    applies_to: 'ad'
  }
];
```

---

## 9. Machine Learning Integration

### 9.1 Pattern Detection Algorithms

**Initial Phase (No ML Libraries Required):**

```javascript
// Statistical pattern detection
class PatternDetector {
  // Time-based performance analysis
  analyzeTimePatterns(hourlyData) {
    // Group by hour of day
    const byHour = groupBy(hourlyData, h => h.hour);

    // Calculate average conversion rate per hour
    const hourlyRates = Object.entries(byHour).map(([hour, data]) => ({
      hour: parseInt(hour),
      avgConvRate: mean(data.map(d => d.conversions / d.impressions)),
      avgROAS: mean(data.map(d => d.roas)),
      sampleSize: data.length
    }));

    // Find significant patterns (>20% deviation from mean)
    const overallMean = mean(hourlyRates.map(h => h.avgConvRate));
    const bestHours = hourlyRates
      .filter(h => h.avgConvRate > overallMean * 1.2 && h.sampleSize >= 50)
      .map(h => h.hour);
    const worstHours = hourlyRates
      .filter(h => h.avgConvRate < overallMean * 0.8 && h.sampleSize >= 50)
      .map(h => h.hour);

    return { bestHours, worstHours, confidence: calculateConfidence(sampleSize) };
  }

  // Creative fatigue detection
  detectFatigue(performanceHistory) {
    // Analyze CTR decline vs frequency increase
    const correlation = calculateCorrelation(
      performanceHistory.map(p => p.frequency),
      performanceHistory.map(p => p.ctr)
    );

    // If strong negative correlation, fatigue is occurring
    if (correlation < -0.6) {
      const avgFrequencyAtDecline = findDeclinePoint(performanceHistory);
      return { fatigueDetected: true, avgFrequencyAtDecline };
    }

    return { fatigueDetected: false };
  }

  // Budget optimization
  findOptimalBudget(budgetPerformanceData) {
    // Group by budget ranges
    const byBudget = groupByRange(budgetPerformanceData, 'daily_budget', 10);

    // Find range with best CPA
    const optimalRange = findBestRange(byBudget, 'cpa', 'min');

    // Detect diminishing returns
    const diminishingPoint = findDiminishingReturns(byBudget);

    return { optimalRange, diminishingPoint };
  }
}
```

**Future Phase (With ML Libraries):**

```javascript
// For future ML enhancement
// Could use TensorFlow.js or Brain.js for Node.js

class MLPatternDetector {
  // LSTM for time series prediction
  async predictPerformance(historicalData, horizon);

  // Clustering for audience analysis
  async clusterAudiences(performanceData);

  // Anomaly detection
  async detectAnomalies(recentData);

  // Recommendation engine
  async generateRecommendations(accountData);
}
```

### 9.2 Confidence Scoring

```javascript
function calculateConfidence(sampleSize, stdDev, timeSpan) {
  // Base confidence from sample size
  let confidence = Math.min(sampleSize / 100, 1.0) * 0.4;

  // Add confidence from consistency (low std dev)
  confidence += (1 - Math.min(stdDev / 0.5, 1.0)) * 0.3;

  // Add confidence from time span (more days = more confident)
  confidence += Math.min(timeSpan / 30, 1.0) * 0.3;

  return Math.round(confidence * 100);
}
```

---

## 10. ML Evolution Roadmap

### The Journey to Human-Like Intelligence

This system is designed to evolve from simple rules to genuine machine intelligence that thinks like an experienced media buyer.

### Evolution Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ML EVOLUTION ROADMAP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STAGE 1: Rules + Data Collection (Current Plan - Months 1-3)              │
│  ─────────────────────────────────────────────────────────────              │
│  • Collect hourly performance snapshots                                     │
│  • User-defined automation rules                                            │
│  • Approval-required workflow                                               │
│  • Every approval/rejection = training data                                 │
│                                                                              │
│                              ↓                                               │
│                                                                              │
│  STAGE 2: Pattern Recognition with K-Means (Months 4-6)                    │
│  ─────────────────────────────────────────────────────────                  │
│  • Cluster campaigns by performance signature                               │
│  • Identify audience decay patterns                                         │
│  • Detect creative fatigue thresholds                                       │
│  • Find optimal budget ranges per cluster                                   │
│                                                                              │
│                              ↓                                               │
│                                                                              │
│  STAGE 3: Reinforcement Learning (Months 7-12)                             │
│  ─────────────────────────────────────────────────────                      │
│  • Model learns: State → Action → Reward                                    │
│  • Shadow mode: Predictions vs human decisions                              │
│  • Graduated autonomy based on accuracy                                     │
│  • Continuous learning from outcomes                                        │
│                                                                              │
│                              ↓                                               │
│                                                                              │
│  STAGE 4: Human-Level Decision Making (Year 2+)                            │
│  ───────────────────────────────────────────────                            │
│  • Context-aware decisions (seasonality, launches)                          │
│  • Proactive recommendations before problems                                │
│  • Cross-account learning (with permission)                                 │
│  • Explainable AI: "I paused this because..."                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.1 ML-Ready Database Fields (Add Now, Use Later)

These fields should be added to models NOW so we collect training data from day one:

#### IntelAutomationAction (Extended for ML)

```javascript
// backend/intelligence/models/IntelAutomationAction.js
{
  // ... existing fields ...

  // ML Training Fields (add these now)
  model_recommendation: ENUM('pause', 'scale', 'reduce', 'maintain', null),
  model_confidence: DECIMAL(3,2),        // 0.00 - 1.00
  model_version: STRING(20),             // 'v1.0.0', 'rules_only', 'kmeans_v1'
  features_used: JSON,                   // ['cpa', 'frequency', 'ctr_trend']
  feature_values: JSON,                  // { cpa: 68.5, frequency: 3.2, ctr_trend: -0.15 }

  // Human Feedback (for training)
  human_decision: ENUM('approved', 'rejected', 'modified'),
  human_modified_action: STRING,         // If human chose different action
  human_feedback_reason: TEXT,           // Why human disagreed

  // Outcome Tracking (for reward signal)
  outcome_measured_at: DATETIME,         // When we measured result
  outcome_metrics: JSON,                 // { cpa_before: 68, cpa_after: 42, saved: 150 }
  outcome_score: DECIMAL(5,2),           // Calculated reward: +50 (good), -30 (bad)

  // Indexes for ML queries
  INDEX: [model_version, human_decision],
  INDEX: [outcome_score, created_at]
}
```

#### IntelMLTrainingData (New Table for ML)

```javascript
// backend/intelligence/models/IntelMLTrainingData.js
{
  id: INTEGER PRIMARY KEY,

  // Context
  user_id: INTEGER NOT NULL,
  ad_account_id: STRING NOT NULL,
  entity_type: ENUM('campaign', 'adset', 'ad'),
  entity_id: STRING NOT NULL,

  // State Vector (input features)
  state_vector: JSON NOT NULL,
  /* Example:
  {
    spend_today: 150,
    spend_7d: 800,
    conversions_today: 2,
    conversions_7d: 15,
    cpa_today: 75,
    cpa_7d: 53.33,
    ctr: 1.2,
    ctr_trend_7d: -0.15,
    frequency: 3.2,
    learning_phase: 'ACTIVE',
    days_running: 14,
    hour_of_day: 14,
    day_of_week: 'Tuesday',
    budget_utilization: 0.85
  }
  */

  // Action Taken
  action_taken: ENUM('pause', 'activate', 'increase_budget', 'decrease_budget',
                     'adjust_bid', 'do_nothing'),
  action_params: JSON,                   // { percentage: 20 }
  action_source: ENUM('human', 'rule', 'model'),

  // Outcome (Reward Signal) - Filled 24-72 hours later
  outcome_measured: BOOLEAN DEFAULT false,
  reward_score: DECIMAL(5,2),            // Positive = good decision, Negative = bad
  outcome_details: JSON,
  /* Example:
  {
    cpa_change: -35%,
    conversions_change: +20%,
    spend_saved: 150,
    roas_change: +0.5
  }
  */

  // Timing
  state_captured_at: DATETIME NOT NULL,
  action_taken_at: DATETIME,
  outcome_measured_at: DATETIME,

  // For model training
  used_for_training: BOOLEAN DEFAULT false,
  training_batch_id: STRING,

  // Indexes
  INDEX: [user_id, ad_account_id, state_captured_at],
  INDEX: [action_source, outcome_measured],
  INDEX: [used_for_training, created_at]
}
```

#### IntelModelVersion (Track Model Evolution)

```javascript
// backend/intelligence/models/IntelModelVersion.js
{
  id: INTEGER PRIMARY KEY,

  // Model Identity
  version: STRING(20) NOT NULL UNIQUE,   // 'v1.0.0'
  model_type: ENUM('rules', 'statistical', 'kmeans', 'reinforcement'),
  description: TEXT,

  // Training Info
  trained_at: DATETIME,
  training_data_count: INTEGER,          // How many samples used
  training_data_range: JSON,             // { from: '2024-01-01', to: '2024-03-01' }

  // Performance Metrics
  accuracy_score: DECIMAL(5,4),          // 0.0000 - 1.0000
  precision_score: DECIMAL(5,4),
  recall_score: DECIMAL(5,4),
  f1_score: DECIMAL(5,4),

  // A/B Test Results
  ab_test_id: STRING,
  ab_test_winner: BOOLEAN,

  // Status
  status: ENUM('training', 'testing', 'shadow', 'active', 'deprecated'),
  promoted_at: DATETIME,                 // When moved to active
  deprecated_at: DATETIME,

  // Model Artifacts
  model_config: JSON,                    // Hyperparameters, thresholds
  model_weights_path: STRING,            // Path to saved model (if applicable)

  created_at: DATETIME,
  updated_at: DATETIME
}
```

### 10.2 K-Means Clustering Implementation

```javascript
// backend/intelligence/ml/KMeansClustering.js

class CampaignClusterer {
  /**
   * Cluster campaigns by performance signature
   * Uses: simple-statistics library (no heavy ML needed)
   */

  // Feature extraction for clustering
  extractFeatures(campaignData) {
    return {
      avg_cpa: mean(campaignData.map(d => d.cpa)),
      cpa_volatility: standardDeviation(campaignData.map(d => d.cpa)),
      conversion_rate: sum(campaignData.map(d => d.conversions)) / sum(campaignData.map(d => d.clicks)),
      fatigue_rate: this.calculateFatigueRate(campaignData),
      optimal_frequency: this.findOptimalFrequency(campaignData),
      best_hour_concentration: this.calculateHourConcentration(campaignData),
      budget_efficiency: this.calculateBudgetEfficiency(campaignData)
    };
  }

  // Cluster campaigns into archetypes
  async clusterCampaigns(allCampaignData, k = 5) {
    const features = allCampaignData.map(c => this.extractFeatures(c));
    const normalizedFeatures = this.normalize(features);

    // K-Means clustering
    const clusters = kMeans(normalizedFeatures, k);

    // Label clusters with human-readable names
    return clusters.map((cluster, idx) => ({
      id: idx,
      name: this.labelCluster(cluster),  // "Fast Converters", "Slow Burners", etc.
      campaigns: cluster.members,
      characteristics: this.describeCluster(cluster)
    }));
  }

  // Label clusters based on characteristics
  labelCluster(cluster) {
    const avgCPA = mean(cluster.members.map(m => m.avg_cpa));
    const avgFatigue = mean(cluster.members.map(m => m.fatigue_rate));

    if (avgCPA < 20 && avgFatigue < 0.1) return 'Star Performers';
    if (avgCPA < 40 && avgFatigue < 0.2) return 'Reliable Workhorses';
    if (avgFatigue > 0.3) return 'Fast Fatiguing';
    if (avgCPA > 60) return 'High CPA Candidates for Pause';
    return 'Mixed Performance';
  }
}
```

### 10.3 Reinforcement Learning Framework

```javascript
// backend/intelligence/ml/ReinforcementLearner.js

/**
 * Contextual Bandit approach for campaign optimization
 * Learns: Given current state, which action maximizes future reward?
 */

class CampaignOptimizationAgent {
  constructor() {
    this.actions = ['pause', 'maintain', 'scale_10', 'scale_20', 'reduce_20', 'reduce_50'];
    this.explorationRate = 0.1;  // 10% random exploration
  }

  // State representation
  getState(entityData) {
    return {
      // Performance metrics
      cpa_ratio: entityData.cpa / entityData.target_cpa,  // 1.0 = on target
      roas: entityData.roas,
      ctr_zscore: (entityData.ctr - entityData.account_avg_ctr) / entityData.account_std_ctr,

      // Trend indicators
      cpa_trend_3d: entityData.cpa_trend_3d,    // -1 to 1 (declining to increasing)
      ctr_trend_7d: entityData.ctr_trend_7d,

      // Fatigue indicators
      frequency: entityData.frequency,
      frequency_velocity: entityData.frequency_change_24h,

      // Learning phase
      learning_phase: entityData.learning_phase,  // 0 = learning, 1 = active
      days_since_edit: entityData.days_since_last_edit,

      // Budget utilization
      budget_utilization: entityData.spend_today / entityData.daily_budget,
      budget_pacing: entityData.projected_spend / entityData.daily_budget
    };
  }

  // Reward calculation (called 24-72 hours after action)
  calculateReward(stateBefore, stateAfter, actionTaken) {
    let reward = 0;

    // Primary reward: CPA improvement
    if (stateAfter.cpa_ratio < stateBefore.cpa_ratio) {
      reward += (stateBefore.cpa_ratio - stateAfter.cpa_ratio) * 50;
    } else {
      reward -= (stateAfter.cpa_ratio - stateBefore.cpa_ratio) * 30;
    }

    // Secondary reward: ROAS improvement
    reward += (stateAfter.roas - stateBefore.roas) * 20;

    // Penalty for pausing winners (high ROAS that got paused)
    if (actionTaken === 'pause' && stateBefore.roas > 2.0) {
      reward -= 100;  // Big penalty for pausing a winner
    }

    // Bonus for catching losers early
    if (actionTaken === 'pause' && stateBefore.cpa_ratio > 2.0 && stateBefore.conversions === 0) {
      reward += 50;  // Good catch!
    }

    return reward;
  }

  // Policy: Given state, choose action
  async chooseAction(state, mode = 'shadow') {
    // Shadow mode: Always return recommendation but don't execute
    // Auto mode: Execute if confidence high enough

    // Exploration: Random action (helps learn edge cases)
    if (Math.random() < this.explorationRate && mode !== 'shadow') {
      return {
        action: this.actions[Math.floor(Math.random() * this.actions.length)],
        confidence: 0,
        reason: 'exploration'
      };
    }

    // Exploitation: Use learned policy
    const actionValues = await this.predictActionValues(state);
    const bestAction = this.getBestAction(actionValues);

    return {
      action: bestAction.action,
      confidence: bestAction.confidence,
      reason: this.explainDecision(state, bestAction)
    };
  }

  // Human-readable explanation
  explainDecision(state, decision) {
    const reasons = [];

    if (state.cpa_ratio > 2.0 && decision.action === 'pause') {
      reasons.push(`CPA is ${(state.cpa_ratio * 100 - 100).toFixed(0)}% above target`);
    }
    if (state.frequency > 3.5 && state.ctr_trend_7d < -0.1) {
      reasons.push(`Frequency ${state.frequency.toFixed(1)} with declining CTR suggests fatigue`);
    }
    if (state.roas > 3.0 && decision.action.includes('scale')) {
      reasons.push(`ROAS ${state.roas.toFixed(1)}x suggests room to scale`);
    }

    return reasons.join('. ') || 'Based on learned patterns from similar campaigns';
  }
}
```

### 10.4 Training Data Collection Loop

```javascript
// backend/intelligence/ml/TrainingDataCollector.js

class TrainingDataCollector {
  /**
   * Every action (human or automated) becomes training data
   * This runs in background, collecting state→action→outcome tuples
   */

  // Called when any action is taken (human approval, rule execution, etc.)
  async recordAction(entityId, actionTaken, actionSource) {
    // Capture current state
    const currentState = await this.captureState(entityId);

    // Create training record
    const trainingRecord = await IntelMLTrainingData.create({
      entity_id: entityId,
      state_vector: currentState,
      action_taken: actionTaken,
      action_source: actionSource,  // 'human', 'rule', 'model'
      state_captured_at: new Date(),
      action_taken_at: new Date()
    });

    // Schedule outcome measurement (24-72 hours later)
    await this.scheduleOutcomeMeasurement(trainingRecord.id, entityId);

    return trainingRecord;
  }

  // Called 24-72 hours after action to measure outcome
  async measureOutcome(trainingRecordId, entityId) {
    const record = await IntelMLTrainingData.findByPk(trainingRecordId);
    const stateBefore = record.state_vector;
    const stateAfter = await this.captureState(entityId);

    // Calculate reward
    const reward = this.calculateReward(stateBefore, stateAfter, record.action_taken);

    // Update record with outcome
    await record.update({
      outcome_measured: true,
      reward_score: reward,
      outcome_details: {
        state_after: stateAfter,
        cpa_change: ((stateAfter.cpa - stateBefore.cpa) / stateBefore.cpa * 100).toFixed(1) + '%',
        roas_change: (stateAfter.roas - stateBefore.roas).toFixed(2)
      },
      outcome_measured_at: new Date()
    });

    return record;
  }
}
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Database & Models:**
- [ ] Create PerformanceSnapshot model & migration
- [ ] Create PixelHealth model & migration
- [ ] Create AutomationRule model & migration
- [ ] Create AutomationAction model & migration
- [ ] Create AccountScore model & migration
- [ ] Create Notification model & migration
- [ ] Create LearnedPattern model & migration

**Backend Services:**
- [ ] Create InsightsCollectorService
- [ ] Add insights fetching methods to FacebookAPI
- [ ] Extend QueueProcessor for intelligence tasks
- [ ] Create basic NotificationService

**Testing:**
- [ ] Unit tests for all new models
- [ ] Integration tests for InsightsCollector

---

### Phase 2: Data Collection (Week 3-4)

**Insights Collection:**
- [ ] Implement hourly collection scheduler
- [ ] Implement campaign insights fetching
- [ ] Implement ad set insights fetching (with learning phase)
- [ ] Implement ad insights fetching
- [ ] Implement rate limit management for collection

**Pixel Health:**
- [ ] Create PixelHealthService
- [ ] Implement pixel stats fetching
- [ ] Implement EMQ calculation
- [ ] Implement funnel rate calculation

**API Endpoints:**
- [ ] GET /api/intelligence/performance/:entityId/trend
- [ ] GET /api/intelligence/pixel/:pixelId/health
- [ ] GET /api/notifications

---

### Phase 3: Dashboard UI (Week 5-6)

**Frontend Pages:**
- [ ] Create IntelligenceDashboard main page
- [ ] Create PixelHealthDashboard page
- [ ] Create AccountScoreDashboard page

**Components:**
- [ ] Create ScoreCard component
- [ ] Create MetricTrendChart component
- [ ] Create PixelEventFunnel component
- [ ] Create NotificationBell component
- [ ] Create NotificationDropdown component

**Navigation:**
- [ ] Add Intelligence link to main navigation
- [ ] Add Notification bell to header

---

### Phase 4: Rules Engine (Week 7-8)

**Backend:**
- [ ] Create AutomationRulesEngine service
- [ ] Implement rule condition evaluation
- [ ] Implement action creation and execution
- [ ] Add default rule templates
- [ ] Create rule evaluation scheduler

**API Endpoints:**
- [ ] CRUD endpoints for rules
- [ ] Action approval/rejection endpoints
- [ ] Rule templates endpoint

**Frontend:**
- [ ] Create AutomationRules list page
- [ ] Create RuleBuilder wizard component
- [ ] Create RuleConditionBuilder component
- [ ] Create ActionHistory page
- [ ] Create ActionApprovalCard component

---

### Phase 5: Account Scoring (Week 9-10)

**Backend:**
- [ ] Create AccountScoreService
- [ ] Implement score calculation algorithms
- [ ] Implement recommendation generation
- [ ] Add daily score calculation to scheduler

**API Endpoints:**
- [ ] GET /api/intelligence/account/:id/score
- [ ] GET /api/intelligence/recommendations

**Frontend:**
- [ ] Enhance AccountScoreDashboard
- [ ] Create RecommendationsList component
- [ ] Add score history charts

---

### Phase 6: Pattern Learning (Week 11-12)

**Backend:**
- [ ] Create PatternLearningService
- [ ] Implement time pattern detection
- [ ] Implement fatigue pattern detection
- [ ] Implement budget optimization detection
- [ ] Add weekly pattern refresh to scheduler

**API Endpoints:**
- [ ] GET /api/intelligence/patterns
- [ ] POST /api/intelligence/patterns/refresh

**Frontend:**
- [ ] Create LearnedPatterns page
- [ ] Create PatternCard component
- [ ] Integrate patterns into recommendations

---

### Phase 7: Automatic Mode Transition (Week 13-14)

**Backend:**
- [ ] Add execution mode switching logic
- [ ] Implement confidence-based auto-execution
- [ ] Add safeguards for automatic actions
- [ ] Implement action reversal capability

**Frontend:**
- [ ] Add mode selector to rules
- [ ] Add execution history to rules
- [ ] Add confidence indicator to patterns
- [ ] Add "undo" option for recent actions

**Documentation:**
- [ ] User guide for Intelligence Engine
- [ ] Admin configuration guide
- [ ] API documentation

---

### Phase 8: Future Enhancements (Week 15+)

**Notifications:**
- [ ] Add Slack integration
- [ ] Add Email alerts
- [ ] Add webhook support

**Advanced ML:**
- [ ] Add performance prediction
- [ ] Add anomaly detection
- [ ] Add audience clustering

**Reporting:**
- [ ] Add weekly summary reports
- [ ] Add export to CSV/PDF
- [ ] Add scheduled report delivery

---

## 12. File Structure (Isolated Architecture)

### ⚠️ CRITICAL: All Intelligence Code in Separate Folder

```
backend/
│
├── services/                          # 🛡️ EXISTING - NEVER MODIFIED BY INTELLIGENCE
│   ├── facebookApi.js                 # Campaign creation - PROTECTED
│   ├── batchDuplication.js            # Duplication - PROTECTED
│   ├── strategy150Duplication.js      # Strategy 150 - PROTECTED
│   ├── strategyForAllDuplication.js   # Strategy For All - PROTECTED
│   ├── metricsCalculator.js           # Metrics - READ ONLY by intelligence
│   ├── QueueProcessor.js              # Queue - READ ONLY by intelligence
│   └── ... (all existing services)    # PROTECTED
│
├── models/                            # 🛡️ EXISTING - NEVER MODIFIED BY INTELLIGENCE
│   ├── Campaign.js                    # PROTECTED
│   ├── AdSet.js                       # PROTECTED
│   ├── User.js                        # PROTECTED
│   └── ... (all existing models)      # PROTECTED
│
├── routes/                            # 🛡️ EXISTING - NEVER MODIFIED BY INTELLIGENCE
│   ├── campaigns.js                   # PROTECTED
│   ├── strategy150.js                 # PROTECTED
│   ├── campaignManagement.js          # PROTECTED
│   └── ... (all existing routes)      # PROTECTED
│
│
├── intelligence/                      # 🆕 NEW - ALL INTELLIGENCE CODE HERE
│   │
│   ├── index.js                       # Module entry point with kill switch
│   │
│   ├── models/                        # Intelligence-specific models
│   │   ├── IntelPerformanceSnapshot.js
│   │   ├── IntelPixelHealth.js
│   │   ├── IntelAutomationRule.js
│   │   ├── IntelAutomationAction.js
│   │   ├── IntelAccountScore.js
│   │   ├── IntelLearnedPattern.js
│   │   ├── IntelNotification.js
│   │   ├── IntelMLTrainingData.js     # ML training data
│   │   └── IntelModelVersion.js       # Model version tracking
│   │
│   ├── services/                      # Intelligence services
│   │   ├── InsightsCollectorService.js
│   │   ├── PixelHealthService.js
│   │   ├── AutomationRulesEngine.js
│   │   ├── AccountScoreService.js
│   │   ├── PatternLearningService.js
│   │   ├── NotificationService.js
│   │   ├── IntelligenceScheduler.js
│   │   └── ActionExecutor.js          # Separate - can be disabled
│   │
│   ├── ml/                            # Machine Learning code
│   │   ├── FeatureExtractor.js
│   │   ├── KMeansClustering.js
│   │   ├── ReinforcementLearner.js
│   │   ├── TrainingDataCollector.js
│   │   ├── ModelTrainer.js
│   │   └── PredictionService.js
│   │
│   ├── routes/                        # Intelligence API routes
│   │   ├── intelligence.js            # /api/intelligence/*
│   │   └── notifications.js           # /api/notifications/*
│   │
│   └── migrations/                    # Intelligence-specific migrations
│       ├── YYYYMMDD-create-intel-performance-snapshot.js
│       ├── YYYYMMDD-create-intel-pixel-health.js
│       ├── YYYYMMDD-create-intel-automation-rule.js
│       ├── YYYYMMDD-create-intel-automation-action.js
│       ├── YYYYMMDD-create-intel-account-score.js
│       ├── YYYYMMDD-create-intel-learned-pattern.js
│       ├── YYYYMMDD-create-intel-notification.js
│       ├── YYYYMMDD-create-intel-ml-training-data.js
│       └── YYYYMMDD-create-intel-model-version.js

frontend/
├── src/
│   │
│   ├── pages/                         # 🛡️ EXISTING PAGES - PROTECTED
│   │   ├── CampaignManagement.tsx     # PROTECTED
│   │   ├── Strategy150.tsx            # PROTECTED
│   │   └── ... (existing pages)       # PROTECTED
│   │
│   └── intelligence/                  # 🆕 NEW - ALL INTELLIGENCE UI HERE
│       │
│       ├── pages/
│       │   ├── IntelligenceDashboard.tsx
│       │   ├── PixelHealthDashboard.tsx
│       │   ├── AccountScoreDashboard.tsx
│       │   ├── AutomationRules.tsx
│       │   ├── RuleBuilder.tsx
│       │   ├── ActionHistory.tsx
│       │   └── LearnedPatterns.tsx
│       │
│       ├── components/
│       │   ├── ScoreCard.tsx
│       │   ├── MetricTrendChart.tsx
│       │   ├── PixelEventFunnel.tsx
│       │   ├── RuleConditionBuilder.tsx
│       │   ├── ActionApprovalCard.tsx
│       │   ├── NotificationBell.tsx
│       │   ├── NotificationDropdown.tsx
│       │   ├── PatternCard.tsx
│       │   ├── RecommendationsList.tsx
│       │   └── PerformanceComparison.tsx
│       │
│       ├── hooks/
│       │   └── useIntelligence.ts
│       │
│       ├── services/
│       │   └── intelligenceApi.ts
│       │
│       └── types/
│           └── intelligence.ts
```

### Module Entry Point with Kill Switch

```javascript
// backend/intelligence/index.js

/**
 * Intelligence Module Entry Point
 *
 * This module is COMPLETELY ISOLATED from campaign creation code.
 * It can be disabled entirely with ENABLE_INTELLIGENCE=false
 */

const isEnabled = process.env.ENABLE_INTELLIGENCE === 'true';

if (!isEnabled) {
  console.log('⚠️ Intelligence module DISABLED');
  module.exports = {
    enabled: false,
    routes: null,
    scheduler: null
  };
  return;
}

console.log('✅ Intelligence module ENABLED');

// Only load if enabled
const intelligenceRoutes = require('./routes/intelligence');
const notificationRoutes = require('./routes/notifications');
const IntelligenceScheduler = require('./services/IntelligenceScheduler');

module.exports = {
  enabled: true,
  routes: {
    intelligence: intelligenceRoutes,
    notifications: notificationRoutes
  },
  scheduler: IntelligenceScheduler,

  // Start the intelligence system
  start() {
    if (process.env.ENABLE_INSIGHTS_COLLECTION === 'true') {
      IntelligenceScheduler.startInsightsCollection();
    }
    if (process.env.ENABLE_RULES_ENGINE === 'true') {
      IntelligenceScheduler.startRulesEvaluation();
    }
    if (process.env.ENABLE_ACTION_EXECUTOR === 'true') {
      IntelligenceScheduler.startActionExecutor();
    }
  },

  // Stop everything
  stop() {
    IntelligenceScheduler.stopAll();
  }
};
```

---

## 13. Environment Controls

### Complete Control Over Intelligence Features

```bash
# .env - Intelligence Configuration

# ============================================
# MASTER KILL SWITCH
# ============================================
# Set to false to completely disable intelligence module
# Your campaign creation code works exactly as before
ENABLE_INTELLIGENCE=false

# ============================================
# FEATURE TOGGLES (only work if ENABLE_INTELLIGENCE=true)
# ============================================

# Data Collection - Just collect data, no actions
ENABLE_INSIGHTS_COLLECTION=true

# Rules Engine - Evaluate rules and create pending actions
ENABLE_RULES_ENGINE=true

# ML Components - Pattern detection, clustering, predictions
ENABLE_ML_PREDICTIONS=false

# Action Executor - Actually apply changes to Facebook
# ⚠️ CRITICAL: Keep false until you trust the system
ENABLE_ACTION_EXECUTOR=false

# ============================================
# SAFETY LIMITS
# ============================================

# Maximum auto-actions per hour (prevent runaway automation)
MAX_AUTO_ACTIONS_PER_HOUR=10

# Force approval mode for first N days (regardless of settings)
REQUIRE_APPROVAL_FOR_DAYS=30

# Minimum confidence score for auto-execution (0.0 - 1.0)
MIN_CONFIDENCE_FOR_AUTO=0.85

# Maximum budget change percentage in single action
MAX_BUDGET_CHANGE_PERCENT=30

# Cooldown between actions on same entity (hours)
ACTION_COOLDOWN_HOURS=4

# ============================================
# DATA COLLECTION SETTINGS
# ============================================

# How often to collect insights (in minutes)
INSIGHTS_COLLECTION_INTERVAL=60

# How many days of historical data to fetch initially
INITIAL_HISTORICAL_DAYS=30

# ============================================
# ML MODEL SETTINGS
# ============================================

# Which model version to use for predictions
ACTIVE_MODEL_VERSION=rules_only

# Enable shadow mode (model predicts but doesn't act)
ML_SHADOW_MODE=true

# Minimum training samples before enabling ML
MIN_TRAINING_SAMPLES=1000
```

### Feature Matrix by Environment Setting

| Setting | Collects Data | Evaluates Rules | Shows Recommendations | Auto-Executes Actions |
|---------|--------------|-----------------|----------------------|----------------------|
| `ENABLE_INTELLIGENCE=false` | ❌ | ❌ | ❌ | ❌ |
| `ENABLE_INSIGHTS_COLLECTION=true` only | ✅ | ❌ | ❌ | ❌ |
| `ENABLE_RULES_ENGINE=true` | ✅ | ✅ | ✅ (pending approval) | ❌ |
| `ENABLE_ACTION_EXECUTOR=true` | ✅ | ✅ | ✅ | ✅ (with limits) |

### Recommended Rollout Strategy

```
Phase 1 (Months 1-2): Data Collection Only
─────────────────────────────────────────
ENABLE_INTELLIGENCE=true
ENABLE_INSIGHTS_COLLECTION=true
ENABLE_RULES_ENGINE=false
ENABLE_ACTION_EXECUTOR=false
→ Just collect data, build history

Phase 2 (Months 3-4): Rules + Approval
─────────────────────────────────────────
ENABLE_INTELLIGENCE=true
ENABLE_INSIGHTS_COLLECTION=true
ENABLE_RULES_ENGINE=true
ENABLE_ACTION_EXECUTOR=false
REQUIRE_APPROVAL_FOR_DAYS=60
→ See recommendations, approve manually

Phase 3 (Months 5-6): Graduated Automation
─────────────────────────────────────────
ENABLE_INTELLIGENCE=true
ENABLE_INSIGHTS_COLLECTION=true
ENABLE_RULES_ENGINE=true
ENABLE_ACTION_EXECUTOR=true
MAX_AUTO_ACTIONS_PER_HOUR=5
MIN_CONFIDENCE_FOR_AUTO=0.90
→ Low-risk auto-actions, high confidence only

Phase 4 (Month 7+): Full Automation
─────────────────────────────────────────
ENABLE_INTELLIGENCE=true
ENABLE_INSIGHTS_COLLECTION=true
ENABLE_RULES_ENGINE=true
ENABLE_ML_PREDICTIONS=true
ENABLE_ACTION_EXECUTOR=true
MAX_AUTO_ACTIONS_PER_HOUR=20
MIN_CONFIDENCE_FOR_AUTO=0.80
→ ML-powered optimization
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

```javascript
// Example test structure

describe('InsightsCollectorService', () => {
  describe('collectCampaignInsights', () => {
    it('should fetch insights from Facebook API');
    it('should calculate metrics correctly');
    it('should store snapshot in database');
    it('should handle rate limit errors');
    it('should skip inactive campaigns');
  });
});

describe('AutomationRulesEngine', () => {
  describe('evaluateRule', () => {
    it('should evaluate AND conditions correctly');
    it('should evaluate OR conditions correctly');
    it('should handle missing fields gracefully');
    it('should create pending action when conditions match');
  });

  describe('executeAction', () => {
    it('should pause ad set correctly');
    it('should increase budget correctly');
    it('should log action in audit trail');
    it('should send notification after execution');
  });
});

describe('PatternLearningService', () => {
  describe('learnTimePatterns', () => {
    it('should identify best performing hours');
    it('should require minimum sample size');
    it('should calculate confidence score');
  });
});
```

### 14.2 Integration Tests

```javascript
describe('Intelligence Integration', () => {
  it('should collect data, evaluate rules, and trigger actions');
  it('should respect rate limits during collection');
  it('should handle Facebook API errors gracefully');
  it('should properly aggregate hourly data to daily');
});
```

### 14.3 End-to-End Tests

```javascript
describe('Intelligence Dashboard E2E', () => {
  it('should display account score correctly');
  it('should show pending actions for approval');
  it('should allow approving/rejecting actions');
  it('should update in real-time after actions');
});
```

---

## Summary

This implementation plan provides a comprehensive, production-ready Campaign Intelligence Engine that:

1. **Builds on existing infrastructure** - Reuses MetricsCalculator, QueueProcessor, and existing models
2. **Collects data hourly** - Stores performance snapshots for trend analysis
3. **Evaluates rules continuously** - Both user-defined and learned patterns
4. **Requires approval initially** - Transitions to automatic after building trust
5. **Learns from patterns** - Uses statistical analysis to find optimizations
6. **Provides actionable insights** - Score cards, recommendations, and alerts
7. **Scales efficiently** - Rate limit aware, batch processing, proper scheduling

The phased approach ensures each piece is properly tested before moving to the next, minimizing risk and allowing for adjustments based on real-world usage.

---

*Document Version: 1.0*
*Created: December 2024*
*Last Updated: December 2024*
