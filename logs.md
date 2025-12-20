2025-12-20T10:22:05.6563209Z   📦 adSetData.spendingLimits: undefined
2025-12-20T10:22:05.65632428Z   📦 adSetData.adSetBudget: undefined
2025-12-20T10:22:05.65632753Z   📦 adSetData.adSetBudget?.spendingLimits: undefined
2025-12-20T10:22:05.65633067Z   📦 adSetData.dailyBudget: undefined
2025-12-20T10:22:05.656334351Z   📦 adSetData.lifetimeBudget: undefined
2025-12-20T10:22:05.656346481Z 🔍 DEBUG - Targeting object received:
2025-12-20T10:22:05.656352892Z   adSetData.targeting: {
2025-12-20T10:22:05.656356292Z   "geo_locations": {
2025-12-20T10:22:05.656359962Z     "countries": [
2025-12-20T10:22:05.656363702Z       "US"
2025-12-20T10:22:05.656373933Z     ]
2025-12-20T10:22:05.656376294Z   },
2025-12-20T10:22:05.656378534Z   "age_min": 18,
2025-12-20T10:22:05.656380694Z   "age_max": 65,
2025-12-20T10:22:05.656383334Z   "publisher_platforms": [
2025-12-20T10:22:05.656385454Z     "facebook",
2025-12-20T10:22:05.656387934Z     "instagram"
2025-12-20T10:22:05.656390084Z   ],
2025-12-20T10:22:05.656392564Z   "facebook_positions": [
2025-12-20T10:22:05.656394715Z     "feed"
2025-12-20T10:22:05.656398145Z   ],
2025-12-20T10:22:05.656401325Z   "instagram_positions": [
2025-12-20T10:22:05.656405155Z     "stream"
2025-12-20T10:22:05.656409326Z   ]
2025-12-20T10:22:05.656412526Z }
2025-12-20T10:22:05.656421097Z   adSetData.targeting?.locations: undefined
2025-12-20T10:22:05.656424747Z Targeting object before stringify: {
2025-12-20T10:22:05.656428147Z   "age_min": 18,
2025-12-20T10:22:05.656431577Z   "age_max": 65,
2025-12-20T10:22:05.656435078Z   "geo_locations": {
2025-12-20T10:22:05.656438598Z     "countries": [
2025-12-20T10:22:05.656442108Z       "US"
2025-12-20T10:22:05.656445208Z     ]
2025-12-20T10:22:05.656448128Z   },
2025-12-20T10:22:05.656451208Z   "targeting_automation": {
2025-12-20T10:22:05.656454189Z     "advantage_audience": 0
2025-12-20T10:22:05.656457459Z   }
2025-12-20T10:22:05.656460909Z }
2025-12-20T10:22:05.656463899Z 
2025-12-20T10:22:05.656466069Z 📤 Sending AdSet Creation Request...
2025-12-20T10:22:05.65646876Z 🔍 FINAL CHECK - is_dynamic_creative in params? undefined
2025-12-20T10:22:05.65647093Z 📦 Final params being sent: {
2025-12-20T10:22:05.65647368Z   "name": "[Launcher] [TEST] 1-10-1 Single Image - 2025-12-20T10-22-04 - AdSet Main",
2025-12-20T10:22:05.65647587Z   "campaign_id": "120239028542480588",
2025-12-20T10:22:05.65647797Z   "billing_event": "IMPRESSIONS",
2025-12-20T10:22:05.65648019Z   "optimization_goal": "LINK_CLICKS",
2025-12-20T10:22:05.656482351Z   "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
2025-12-20T10:22:05.656484521Z   "status": "ACTIVE",
2025-12-20T10:22:05.656486701Z   "access_token": "[HIDDEN]",
2025-12-20T10:22:05.656488821Z   "performance_goal": "OFFSITE_CONVERSIONS",
2025-12-20T10:22:05.656490921Z   "targeting": "[TARGETING_DATA]"
2025-12-20T10:22:05.656493051Z }
2025-12-20T10:22:05.852125712Z 📊 API call tracked: CampaignGlobal (Main OAuth) (14/200 calls, 7%)
2025-12-20T10:22:05.852142533Z ✅ Campaign Created Successfully!
2025-12-20T10:22:05.852145544Z 🆔 Campaign ID: 120239028542800588
2025-12-20T10:22:05.852154264Z === CAMPAIGN CREATION END ===
2025-12-20T10:22:05.852156664Z 
2025-12-20T10:22:05.852197787Z 
2025-12-20T10:22:05.852206798Z === ADSET CREATION START ===
2025-12-20T10:22:05.852210888Z 📍 Step 2: Creating AdSet
2025-12-20T10:22:05.852231099Z 🔗 API URL: https://graph.facebook.com/v18.0/act_245628241931442/adsets
2025-12-20T10:22:05.85224033Z 🎯 Campaign ID: 120239028542800588
2025-12-20T10:22:05.85224411Z 💰 Budget Type: daily
2025-12-20T10:22:05.85224732Z 🎯 Conversion Location: website
2025-12-20T10:22:05.852250491Z ⚠️ No pixel selected - campaign will be created without conversion tracking
2025-12-20T10:22:05.852253901Z    User should select a pixel via the resource selector for conversion tracking
2025-12-20T10:22:05.852261441Z 📋 AdSet Configuration:
2025-12-20T10:22:05.852265292Z   - Budget Type: daily
2025-12-20T10:22:05.852271892Z   - Daily Budget: Not set
2025-12-20T10:22:05.852275302Z   - Lifetime Budget: Not set
2025-12-20T10:22:05.852278523Z   - Conversion Location: website
2025-12-20T10:22:05.852295974Z   - Pixel ID: NONE
2025-12-20T10:22:05.852303334Z   - Page ID: 228304287042316
2025-12-20T10:22:05.852307035Z   - Conversion Event: Purchase
2025-12-20T10:22:05.852310495Z   - Optimization Goal: Will be calculated
2025-12-20T10:22:05.852314155Z   - Dynamic Creative: DISABLED
2025-12-20T10:22:05.852361868Z ⚠️ No pixel available - using LINK_CLICKS instead of OFFSITE_CONVERSIONS
2025-12-20T10:22:05.852368309Z    To use conversion tracking, select a pixel in the resource selector
2025-12-20T10:22:05.852375949Z 
2025-12-20T10:22:05.85237972Z 🔍 DEBUG - Checking dynamic creative conditions:
2025-12-20T10:22:05.852425443Z   adSetData.dynamicCreativeEnabled: undefined
2025-12-20T10:22:05.852429463Z   adSetData.dynamicTextEnabled: undefined
2025-12-20T10:22:05.852432353Z   adSetData.primaryTextVariations: undefined
2025-12-20T10:22:05.852434873Z   adSetData.headlineVariations: undefined
2025-12-20T10:22:05.852448114Z   Has primaryTextVariations? undefined
2025-12-20T10:22:05.852453794Z   Has headlineVariations? undefined
2025-12-20T10:22:05.852468915Z   DECISION: shouldEnableDynamicCreative = undefined
2025-12-20T10:22:05.852475526Z   ❌ NOT setting is_dynamic_creative (conditions not met)
2025-12-20T10:22:05.852477716Z 
2025-12-20T10:22:05.852480236Z 🎯 Creating promoted_object...
2025-12-20T10:22:05.852482307Z 
2025-12-20T10:22:05.852484607Z 📊 Building promoted_object...
2025-12-20T10:22:05.852486847Z   Input conversion location: website
2025-12-20T10:22:05.852492197Z   Input conversion event: Purchase
2025-12-20T10:22:05.852568032Z   ⚠️ No pixel ID available for website conversion
2025-12-20T10:22:05.852570333Z   Available pixel ID: NONE
2025-12-20T10:22:05.852575413Z ⚠️ No promoted_object created - pixel ID missing
2025-12-20T10:22:05.852594494Z   Available page ID: 228304287042316
2025-12-20T10:22:05.852598714Z   🔄 Returning null to trigger pixel fetching in createAdSet
2025-12-20T10:22:05.852601255Z 🔄 Will proceed without promoted_object (safe mode)
2025-12-20T10:22:05.852604345Z 🔍 Attribution Settings Received:
2025-12-20T10:22:05.852631046Z   attributionSetting: 7d_click_1d_view
2025-12-20T10:22:05.852637087Z   attributionWindow: [{"event_type":"CLICK_THROUGH","window_days":7},{"event_type":"VIEW_THROUGH","window_days":1}]
2025-12-20T10:22:05.852639557Z   ⚠️ Using fallback attribution window logic
2025-12-20T10:22:05.852642377Z   ⚠️ No attribution spec generated
2025-12-20T10:22:05.852645447Z   💰 No AdSet budget (using Campaign Budget Optimization)
2025-12-20T10:22:05.852648878Z 🔍 DEBUG - Inside createAdSet:
2025-12-20T10:22:05.852663019Z   📦 adSetData.spendingLimits: undefined
2025-12-20T10:22:05.852667009Z   📦 adSetData.adSetBudget: undefined
2025-12-20T10:22:05.852669499Z   📦 adSetData.adSetBudget?.spendingLimits: undefined
2025-12-20T10:22:05.852671629Z   📦 adSetData.dailyBudget: undefined
2025-12-20T10:22:05.85267662Z   📦 adSetData.lifetimeBudget: undefined
2025-12-20T10:22:05.852704872Z 🔍 DEBUG - Targeting object received:
2025-12-20T10:22:05.852734504Z   adSetData.targeting: {
2025-12-20T10:22:05.852748194Z   "geo_locations": {
2025-12-20T10:22:05.852750815Z     "countries": [
2025-12-20T10:22:05.852753585Z       "US"
2025-12-20T10:22:05.852756045Z     ]
2025-12-20T10:22:05.852758955Z   },
2025-12-20T10:22:05.852762075Z   "age_min": 18,
2025-12-20T10:22:05.852763926Z   "age_max": 65,
2025-12-20T10:22:05.852767346Z   "publisher_platforms": [
2025-12-20T10:22:05.852770196Z     "facebook",
2025-12-20T10:22:05.852773106Z     "instagram"
2025-12-20T10:22:05.852775847Z   ],
2025-12-20T10:22:05.852786787Z   "facebook_positions": [
2025-12-20T10:22:05.852788767Z     "feed"
2025-12-20T10:22:05.852790437Z   ],
2025-12-20T10:22:05.852792168Z   "instagram_positions": [
2025-12-20T10:22:05.852793988Z     "stream"
2025-12-20T10:22:05.852795688Z   ]
2025-12-20T10:22:05.852797398Z }
2025-12-20T10:22:05.852799228Z   adSetData.targeting?.locations: undefined
2025-12-20T10:22:05.85283122Z Targeting object before stringify: {
2025-12-20T10:22:05.852841741Z   "age_min": 18,
2025-12-20T10:22:05.852845261Z   "age_max": 65,
2025-12-20T10:22:05.852848201Z   "geo_locations": {
2025-12-20T10:22:05.852850972Z     "countries": [
2025-12-20T10:22:05.852854152Z       "US"
2025-12-20T10:22:05.852856752Z     ]
2025-12-20T10:22:05.852858472Z   },
2025-12-20T10:22:05.852860192Z   "targeting_automation": {
2025-12-20T10:22:05.852862112Z     "advantage_audience": 0
2025-12-20T10:22:05.852863832Z   }
2025-12-20T10:22:05.852865502Z }
2025-12-20T10:22:05.852867043Z 
2025-12-20T10:22:05.852868743Z 📤 Sending AdSet Creation Request...
2025-12-20T10:22:05.852871243Z 🔍 FINAL CHECK - is_dynamic_creative in params? undefined
2025-12-20T10:22:05.852872973Z 📦 Final params being sent: {
2025-12-20T10:22:05.852877163Z   "name": "[Launcher] [TEST] 1-50-1 Single Image - 2025-12-20T10-22-04 - AdSet Main",
2025-12-20T10:22:05.852889304Z   "campaign_id": "120239028542800588",
2025-12-20T10:22:05.852891144Z   "billing_event": "IMPRESSIONS",
2025-12-20T10:22:05.852892804Z   "optimization_goal": "LINK_CLICKS",
2025-12-20T10:22:05.852894584Z   "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
2025-12-20T10:22:05.852896305Z   "status": "ACTIVE",
2025-12-20T10:22:05.852898005Z   "access_token": "[HIDDEN]",
2025-12-20T10:22:05.852899715Z   "performance_goal": "OFFSITE_CONVERSIONS",
2025-12-20T10:22:05.852901385Z   "targeting": "[TARGETING_DATA]"
2025-12-20T10:22:05.852903085Z }
2025-12-20T10:22:05.872067996Z 📊 API call tracked: CampaignGlobal (Main OAuth) (15/200 calls, 8%)
2025-12-20T10:22:05.872084277Z ✅ Campaign Created Successfully!
2025-12-20T10:22:05.872089067Z 🆔 Campaign ID: 120239028542920588
2025-12-20T10:22:05.872092308Z === CAMPAIGN CREATION END ===
2025-12-20T10:22:05.872095488Z 
2025-12-20T10:22:05.872116829Z 
2025-12-20T10:22:05.87212128Z === ADSET CREATION START ===
2025-12-20T10:22:05.87212426Z 📍 Step 2: Creating AdSet
2025-12-20T10:22:05.872339315Z 🔗 API URL: https://graph.facebook.com/v18.0/act_245628241931442/adsets
2025-12-20T10:22:05.872347075Z 🎯 Campaign ID: 120239028542920588
2025-12-20T10:22:05.872350775Z 💰 Budget Type: daily
2025-12-20T10:22:05.872353425Z 🎯 Conversion Location: website
2025-12-20T10:22:05.872356336Z ⚠️ No pixel selected - campaign will be created without conversion tracking
2025-12-20T10:22:05.872359386Z    User should select a pixel via the resource selector for conversion tracking
2025-12-20T10:22:05.872361786Z 📋 AdSet Configuration:
2025-12-20T10:22:05.872364296Z   - Budget Type: daily
2025-12-20T10:22:05.872367266Z   - Daily Budget: Not set
2025-12-20T10:22:05.872370026Z   - Lifetime Budget: Not set
2025-12-20T10:22:05.872371447Z   ⚠️ No pixel ID available for website conversion
2025-12-20T10:22:05.872386338Z   - Conversion Location: website
2025-12-20T10:22:05.872388498Z   - Pixel ID: NONE
2025-12-20T10:22:05.872390218Z   - Page ID: 228304287042316
2025-12-20T10:22:05.872391918Z   - Conversion Event: Purchase
2025-12-20T10:22:05.872393788Z   - Optimization Goal: Will be calculated
2025-12-20T10:22:05.872395538Z   - Dynamic Creative: DISABLED
2025-12-20T10:22:05.872397238Z ⚠️ No pixel available - using LINK_CLICKS instead of OFFSITE_CONVERSIONS
2025-12-20T10:22:05.872409539Z    To use conversion tracking, select a pixel in the resource selector
2025-12-20T10:22:05.872411259Z 
2025-12-20T10:22:05.87241324Z 🔍 DEBUG - Checking dynamic creative conditions:
2025-12-20T10:22:05.872414949Z   adSetData.dynamicCreativeEnabled: true
2025-12-20T10:22:05.87241674Z   adSetData.dynamicTextEnabled: undefined
2025-12-20T10:22:05.87241843Z   adSetData.primaryTextVariations: undefined
2025-12-20T10:22:05.87242016Z   adSetData.headlineVariations: undefined
2025-12-20T10:22:05.87242182Z   Has primaryTextVariations? undefined
2025-12-20T10:22:05.87242346Z   Has headlineVariations? undefined
2025-12-20T10:22:05.87242516Z   DECISION: shouldEnableDynamicCreative = true
2025-12-20T10:22:05.87242682Z   ✅ SETTING params.is_dynamic_creative = true
2025-12-20T10:22:05.872433321Z ⚠️ No promoted_object created - pixel ID missing
2025-12-20T10:22:05.872441231Z 🎨 Dynamic Creative enabled - Setting is_dynamic_creative=true on ad set
2025-12-20T10:22:05.872444131Z    ℹ️  This allows multiple media assets but limits to 1 ad per ad set
2025-12-20T10:22:05.872446822Z 
2025-12-20T10:22:05.872449342Z 🎯 Creating promoted_object...
2025-12-20T10:22:05.872451862Z 
2025-12-20T10:22:05.872469113Z 📊 Building promoted_object...
2025-12-20T10:22:05.872472813Z   Input conversion location: website
2025-12-20T10:22:05.872475474Z   Input conversion event: Purchase
2025-12-20T10:22:05.872478024Z   Available pixel ID: NONE
2025-12-20T10:22:05.872481014Z   Available page ID: 228304287042316
2025-12-20T10:22:05.872495035Z   🔄 Returning null to trigger pixel fetching in createAdSet
2025-12-20T10:22:05.872499395Z 🔄 Will proceed without promoted_object (safe mode)
2025-12-20T10:22:05.872502055Z 🔍 Attribution Settings Received:
2025-12-20T10:22:05.872505076Z   attributionSetting: 7d_click_1d_view
2025-12-20T10:22:05.872517096Z   attributionWindow: [{"event_type":"CLICK_THROUGH","window_days":7},{"event_type":"VIEW_THROUGH","window_days":1}]
2025-12-20T10:22:05.872518997Z   ⚠️ Using fallback attribution window logic
2025-12-20T10:22:05.872520657Z   ⚠️ No attribution spec generated
2025-12-20T10:22:05.872522307Z   💰 No AdSet budget (using Campaign Budget Optimization)
2025-12-20T10:22:05.872523937Z 🔍 DEBUG - Inside createAdSet:
2025-12-20T10:22:05.872525567Z   📦 adSetData.spendingLimits: undefined
2025-12-20T10:22:05.872527237Z   📦 adSetData.adSetBudget: undefined
2025-12-20T10:22:05.872528927Z   📦 adSetData.adSetBudget?.spendingLimits: undefined
2025-12-20T10:22:05.872530648Z   📦 adSetData.dailyBudget: undefined
2025-12-20T10:22:05.872532288Z   📦 adSetData.lifetimeBudget: undefined
2025-12-20T10:22:05.872533998Z 🔍 DEBUG - Targeting object received:
2025-12-20T10:22:05.872545689Z   adSetData.targeting: {
2025-12-20T10:22:05.872551779Z   "geo_locations": {
2025-12-20T10:22:05.872554869Z     "countries": [
2025-12-20T10:22:05.872557679Z       "US"
2025-12-20T10:22:05.87256075Z     ]
2025-12-20T10:22:05.8725633Z   },
2025-12-20T10:22:05.87256602Z   "age_min": 18,
2025-12-20T10:22:05.87256855Z   "age_max": 65,
2025-12-20T10:22:05.87257113Z   "publisher_platforms": [
2025-12-20T10:22:05.87257402Z     "facebook",
2025-12-20T10:22:05.87257658Z     "instagram"
2025-12-20T10:22:05.872579811Z   ],
2025-12-20T10:22:05.872582581Z   "facebook_positions": [
2025-12-20T10:22:05.872585151Z     "feed"
2025-12-20T10:22:05.872587601Z   ],
2025-12-20T10:22:05.872590341Z   "instagram_positions": [
2025-12-20T10:22:05.872600492Z     "stream"
2025-12-20T10:22:05.872602962Z   ]
2025-12-20T10:22:05.872605313Z }
2025-12-20T10:22:05.872608083Z   adSetData.targeting?.locations: undefined
2025-12-20T10:22:05.872622264Z Targeting object before stringify: {
2025-12-20T10:22:05.872625284Z   "age_min": 18,
2025-12-20T10:22:05.872627804Z   "age_max": 65,
2025-12-20T10:22:05.872630574Z   "geo_locations": {
2025-12-20T10:22:05.872633434Z     "countries": [
2025-12-20T10:22:05.872636465Z       "US"
2025-12-20T10:22:05.872638955Z     ]
2025-12-20T10:22:05.872641575Z   },
2025-12-20T10:22:05.872644275Z   "targeting_automation": {
2025-12-20T10:22:05.872646795Z     "advantage_audience": 0
2025-12-20T10:22:05.872649765Z   }
2025-12-20T10:22:05.872652366Z }
2025-12-20T10:22:05.872663286Z 
2025-12-20T10:22:05.872666177Z 📤 Sending AdSet Creation Request...
2025-12-20T10:22:05.872669167Z 🔍 FINAL CHECK - is_dynamic_creative in params? true
2025-12-20T10:22:05.872672177Z 📦 Final params being sent: {
2025-12-20T10:22:05.872675037Z   "name": "[Launcher] [TEST] 1-50-1 DC (3 img + 2 vid) - 2025-12-20T10-22-04 - AdSet Main",
2025-12-20T10:22:05.872677818Z   "campaign_id": "120239028542920588",
2025-12-20T10:22:05.872680688Z   "billing_event": "IMPRESSIONS",
2025-12-20T10:22:05.872683368Z   "optimization_goal": "LINK_CLICKS",
2025-12-20T10:22:05.872685968Z   "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
2025-12-20T10:22:05.872688688Z   "status": "ACTIVE",
2025-12-20T10:22:05.872691328Z   "access_token": "[HIDDEN]",
2025-12-20T10:22:05.872693899Z   "is_dynamic_creative": true,
2025-12-20T10:22:05.872696429Z   "performance_goal": "OFFSITE_CONVERSIONS",
2025-12-20T10:22:05.872698779Z   "targeting": "[TARGETING_DATA]"
2025-12-20T10:22:05.872701399Z }
2025-12-20T10:22:06.697004738Z 📊 API call tracked: CampaignGlobal (Main OAuth) (16/200 calls, 8%)
2025-12-20T10:22:06.69702979Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.697050791Z 🆔 AdSet ID: 120239028544950588
2025-12-20T10:22:06.697052742Z === ADSET CREATION END ===
2025-12-20T10:22:06.697054382Z 
2025-12-20T10:22:06.697056032Z 
2025-12-20T10:22:06.697057672Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.697059952Z 📌 Campaign: [TEST] 1-100-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:06.697061712Z 📊 Media Type: single_image
2025-12-20T10:22:06.697064063Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.697065812Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.697070773Z ===========================================
2025-12-20T10:22:06.697072433Z 
2025-12-20T10:22:06.697074183Z 📸 Starting image upload...
2025-12-20T10:22:06.697076823Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.697242815Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.697247235Z File size: 1.79MB
2025-12-20T10:22:06.700901623Z Original format detected: png
2025-12-20T10:22:06.700914374Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:06.70984984Z 📊 API call tracked: CampaignGlobal (Main OAuth) (17/200 calls, 9%)
2025-12-20T10:22:06.709870012Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.709874912Z 🆔 AdSet ID: 120239028546720588
2025-12-20T10:22:06.709877542Z === ADSET CREATION END ===
2025-12-20T10:22:06.709879702Z 
2025-12-20T10:22:06.709881723Z 
2025-12-20T10:22:06.709883903Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.709886633Z 📌 Campaign: [TEST] 1-10-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:06.709925405Z 📊 Media Type: single_image
2025-12-20T10:22:06.709929996Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.709933346Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.709936626Z ===========================================
2025-12-20T10:22:06.709939606Z 
2025-12-20T10:22:06.709942967Z 📸 Starting image upload...
2025-12-20T10:22:06.709947017Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.709959298Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.709962728Z File size: 1.79MB
2025-12-20T10:22:06.710586781Z Original format detected: png
2025-12-20T10:22:06.710594291Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:06.77052999Z 📊 API call tracked: CampaignGlobal (Main OAuth) (18/200 calls, 9%)
2025-12-20T10:22:06.770577193Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.770584194Z 🆔 AdSet ID: 120239028547090588
2025-12-20T10:22:06.770586724Z === ADSET CREATION END ===
2025-12-20T10:22:06.770589104Z 
2025-12-20T10:22:06.770591514Z 
2025-12-20T10:22:06.770594354Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.770596904Z 📌 Campaign: [TEST] 2 Campaigns DC - 2025-12-20T10-22-04 - Campaign 1
2025-12-20T10:22:06.770600035Z 📊 Media Type: dynamic
2025-12-20T10:22:06.770602595Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.770605375Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.770618816Z ===========================================
2025-12-20T10:22:06.770621596Z 
2025-12-20T10:22:06.770624376Z 🎨 Processing Dynamic Creative media...
2025-12-20T10:22:06.770627276Z 📊 Total media files to process: 3
2025-12-20T10:22:06.770783877Z   📸 2 images, 📹 1 videos
2025-12-20T10:22:06.770791537Z   🚀 Uploading 2 images in parallel...
2025-12-20T10:22:06.78452616Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.785033244Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:06.786012031Z 📊 API call tracked: CampaignGlobal (Main OAuth) (19/200 calls, 10%)
2025-12-20T10:22:06.786028742Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.787001208Z 🆔 AdSet ID: 120239028547150588
2025-12-20T10:22:06.787016169Z === ADSET CREATION END ===
2025-12-20T10:22:06.787018759Z 
2025-12-20T10:22:06.787020819Z 
2025-12-20T10:22:06.78702335Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.78702616Z 📌 Campaign: [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04
2025-12-20T10:22:06.78702891Z 📊 Media Type: dynamic
2025-12-20T10:22:06.78703096Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.78703303Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.78703531Z ===========================================
2025-12-20T10:22:06.787037351Z 
2025-12-20T10:22:06.787039701Z 🎨 Processing Dynamic Creative media...
2025-12-20T10:22:06.787041721Z 📊 Total media files to process: 3
2025-12-20T10:22:06.787043811Z   📸 3 images, 📹 0 videos
2025-12-20T10:22:06.787045891Z   🚀 Uploading 3 images in parallel...
2025-12-20T10:22:06.787048621Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.787050901Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:06.787053621Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226088532_main.webp
2025-12-20T10:22:06.787056402Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:06.787071203Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.787073783Z File size: 1.79MB
2025-12-20T10:22:06.787076053Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:06.787078523Z Processing image: test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:06.787080783Z File size: 1.41MB
2025-12-20T10:22:06.787924701Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:06.787949082Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.787953373Z File size: 1.79MB
2025-12-20T10:22:06.788187149Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:06.788197569Z Processing image: test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:06.788279935Z File size: 1.41MB
2025-12-20T10:22:06.788367561Z Original format detected: png
2025-12-20T10:22:06.788405123Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:06.788703164Z Original format detected: png
2025-12-20T10:22:06.788709814Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:06.789326896Z Original format detected: png
2025-12-20T10:22:06.789336816Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:06.789559872Z ⚠️ Image test_1766226088532_main.webp dimensions (600x400) don't meet minimum requirements (600x600)
2025-12-20T10:22:06.789565802Z   ⚠️ Skipping image - dimensions (600x400) below minimum (600x600): /opt/render/project/src/backend/uploads/test_1766226088532_main.webp
2025-12-20T10:22:06.789602985Z Original format detected: png
2025-12-20T10:22:06.789606265Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:06.799044526Z 📊 API call tracked: CampaignGlobal (Main OAuth) (20/200 calls, 10%)
2025-12-20T10:22:06.799068097Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.799071427Z 🆔 AdSet ID: 120239028546170588
2025-12-20T10:22:06.799073828Z === ADSET CREATION END ===
2025-12-20T10:22:06.799075848Z 
2025-12-20T10:22:06.799078518Z 
2025-12-20T10:22:06.799081148Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.799084508Z 📌 Campaign: [TEST] 3 Campaigns × 10 AdSets - 2025-12-20T10-22-04 - Campaign 1
2025-12-20T10:22:06.799087058Z 📊 Media Type: single_image
2025-12-20T10:22:06.799090249Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.799092999Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.799095389Z ===========================================
2025-12-20T10:22:06.799097439Z 
2025-12-20T10:22:06.799099779Z 📸 Starting image upload...
2025-12-20T10:22:06.79910203Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.79910511Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.79910758Z File size: 1.79MB
2025-12-20T10:22:06.880522237Z 📊 API call tracked: CampaignGlobal (Main OAuth) (21/200 calls, 11%)
2025-12-20T10:22:06.880544228Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.880547748Z 🆔 AdSet ID: 120239028547370588
2025-12-20T10:22:06.880549919Z === ADSET CREATION END ===
2025-12-20T10:22:06.880551879Z 
2025-12-20T10:22:06.880554189Z 
2025-12-20T10:22:06.880556299Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.880559149Z 📌 Campaign: [TEST] With Spending Limits - 2025-12-20T10-22-04
2025-12-20T10:22:06.880561389Z 📊 Media Type: single_image
2025-12-20T10:22:06.88056394Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.88056615Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.880579211Z ===========================================
2025-12-20T10:22:06.880581411Z 
2025-12-20T10:22:06.880583541Z 📸 Starting image upload...
2025-12-20T10:22:06.880600942Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.880650615Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.880658886Z File size: 1.79MB
2025-12-20T10:22:06.902377561Z 📊 API call tracked: CampaignGlobal (Main OAuth) (22/200 calls, 11%)
2025-12-20T10:22:06.902506369Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.90250999Z 🆔 AdSet ID: 120239028549020588
2025-12-20T10:22:06.90251271Z === ADSET CREATION END ===
2025-12-20T10:22:06.90251483Z 
2025-12-20T10:22:06.90251694Z 
2025-12-20T10:22:06.90251975Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.90252283Z 📌 Campaign: [TEST] 1-25-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:06.9025251Z 📊 Media Type: single_image
2025-12-20T10:22:06.902528101Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.902530371Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.902565953Z ===========================================
2025-12-20T10:22:06.902568183Z 
2025-12-20T10:22:06.902577314Z 📸 Starting image upload...
2025-12-20T10:22:06.902580524Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.902582975Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.902585384Z File size: 1.79MB
2025-12-20T10:22:06.934412045Z 📊 API call tracked: CampaignGlobal (Main OAuth) (23/200 calls, 12%)
2025-12-20T10:22:06.934433537Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.934436627Z 🆔 AdSet ID: 120239028549010588
2025-12-20T10:22:06.934438777Z === ADSET CREATION END ===
2025-12-20T10:22:06.934441767Z 
2025-12-20T10:22:06.934445238Z 
2025-12-20T10:22:06.934448898Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.934452438Z 📌 Campaign: [TEST] 1-50-1 DC (2 img + 2 vid) - 2025-12-20T10-22-04
2025-12-20T10:22:06.934456348Z 📊 Media Type: dynamic
2025-12-20T10:22:06.934459619Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.934466479Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.93448492Z ===========================================
2025-12-20T10:22:06.93448845Z 
2025-12-20T10:22:06.934492311Z 🎨 Processing Dynamic Creative media...
2025-12-20T10:22:06.934496181Z 📊 Total media files to process: 4
2025-12-20T10:22:06.934507272Z   📸 2 images, 📹 2 videos
2025-12-20T10:22:06.934509612Z   🚀 Uploading 2 images in parallel...
2025-12-20T10:22:06.934512582Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.934705445Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:06.98515424Z 📊 API call tracked: CampaignGlobal (Main OAuth) (24/200 calls, 12%)
2025-12-20T10:22:06.985178972Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.985182622Z 🆔 AdSet ID: 120239028548520588
2025-12-20T10:22:06.985185032Z === ADSET CREATION END ===
2025-12-20T10:22:06.985187082Z 
2025-12-20T10:22:06.98663329Z 
2025-12-20T10:22:06.986649202Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.986653352Z 📌 Campaign: [TEST] Minimum 1-1-1 - 2025-12-20T10-22-04
2025-12-20T10:22:06.986656542Z 📊 Media Type: single_image
2025-12-20T10:22:06.986659512Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.986661732Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.986663892Z ===========================================
2025-12-20T10:22:06.986665972Z 
2025-12-20T10:22:06.986667983Z 📸 Starting image upload...
2025-12-20T10:22:06.986722927Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.986726277Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:06.986728837Z File size: 1.79MB
2025-12-20T10:22:06.986732037Z 📊 API call tracked: CampaignGlobal (Main OAuth) (25/200 calls, 13%)
2025-12-20T10:22:06.986734507Z ✅ AdSet Created Successfully!
2025-12-20T10:22:06.986736857Z 🆔 AdSet ID: 120239028545800588
2025-12-20T10:22:06.986739048Z === ADSET CREATION END ===
2025-12-20T10:22:06.986741028Z 
2025-12-20T10:22:06.986742998Z 
2025-12-20T10:22:06.986745148Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:06.986747888Z 📌 Campaign: [TEST] 1-50-1 DC (3 videos) - 2025-12-20T10-22-04
2025-12-20T10:22:06.986750168Z 📊 Media Type: dynamic
2025-12-20T10:22:06.986752338Z 🔄 Skip Upload: NO
2025-12-20T10:22:06.986754418Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:06.986756559Z ===========================================
2025-12-20T10:22:06.986758469Z 
2025-12-20T10:22:06.986760579Z 🎨 Processing Dynamic Creative media...
2025-12-20T10:22:06.986762769Z 📊 Total media files to process: 3
2025-12-20T10:22:06.986764979Z   📸 0 images, 📹 3 videos
2025-12-20T10:22:06.98676721Z   🚀 Uploading 3 videos (max 3 concurrent)...
2025-12-20T10:22:06.986769279Z   📹 Processing video batch 1/1
2025-12-20T10:22:06.98677247Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:06.98677471Z   📊 Video size: 1.30MB
2025-12-20T10:22:06.990934632Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:06.991011267Z   📊 Video size: 0.43MB
2025-12-20T10:22:06.99178792Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086906_AQOHghHd9QX8NqE5JhZIbzEfgUSTNeMHe90Novi6j9oVP7kv9TDUNBY6xgF0J9Crnmg7L3DJubJNiCmiHinB11xpojGyOcyDW2OzA0ECiA.mp4
2025-12-20T10:22:06.991869176Z   📊 Video size: 0.92MB
2025-12-20T10:22:06.99354606Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:06.993793496Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:06.993797377Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:06.995893559Z 🎬 [uploadVideo] File size: 1.30 MB
2025-12-20T10:22:06.995901419Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:06.99590392Z 🎬 [uploadVideo] Buffer size: 1.30 MB
2025-12-20T10:22:06.99590733Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:06.99591032Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:06.99591342Z 🎬 [uploadVideo] Uploading video: test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:06.995915811Z 🎬 [uploadVideo] File size: 1.30MB
2025-12-20T10:22:06.995918071Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:06.995920301Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:06.995922771Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:06.995925471Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:06.995977185Z 🎬 [uploadVideo] File size: 0.43 MB
2025-12-20T10:22:06.995980275Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:06.996154617Z 🎬 [uploadVideo] Buffer size: 0.43 MB
2025-12-20T10:22:06.996162047Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:06.996299137Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:06.996342909Z 🎬 [uploadVideo] Uploading video: test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:06.996382732Z 🎬 [uploadVideo] File size: 0.43MB
2025-12-20T10:22:06.996426715Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:06.996652621Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:06.996656911Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:06.996659511Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086906_AQOHghHd9QX8NqE5JhZIbzEfgUSTNeMHe90Novi6j9oVP7kv9TDUNBY6xgF0J9Crnmg7L3DJubJNiCmiHinB11xpojGyOcyDW2OzA0ECiA.mp4
2025-12-20T10:22:06.996723355Z 🎬 [uploadVideo] File size: 0.92 MB
2025-12-20T10:22:06.996753097Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:06.99708033Z 🎬 [uploadVideo] Buffer size: 0.92 MB
2025-12-20T10:22:06.99708753Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:06.997205418Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:06.997208858Z 🎬 [uploadVideo] Uploading video: test_1766226086906_AQOHghHd9QX8NqE5JhZIbzEfgUSTNeMHe90Novi6j9oVP7kv9TDUNBY6xgF0J9Crnmg7L3DJubJNiCmiHinB11xpojGyOcyDW2OzA0ECiA.mp4
2025-12-20T10:22:06.997211668Z 🎬 [uploadVideo] File size: 0.92MB
2025-12-20T10:22:06.997214079Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:07.087952569Z 📊 API call tracked: CampaignGlobal (Main OAuth) (26/200 calls, 13%)
2025-12-20T10:22:07.087994051Z ✅ AdSet Created Successfully!
2025-12-20T10:22:07.087998112Z 🆔 AdSet ID: 120239028546580588
2025-12-20T10:22:07.088000392Z === ADSET CREATION END ===
2025-12-20T10:22:07.088002362Z 
2025-12-20T10:22:07.088004212Z 
2025-12-20T10:22:07.088006222Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:07.088008512Z 📌 Campaign: [TEST] 1-50-1 DC (3 img + 2 vid) - 2025-12-20T10-22-04
2025-12-20T10:22:07.088011143Z 📊 Media Type: dynamic
2025-12-20T10:22:07.088013253Z 🔄 Skip Upload: NO
2025-12-20T10:22:07.088015323Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:07.088018023Z ===========================================
2025-12-20T10:22:07.088020063Z 
2025-12-20T10:22:07.088022353Z 🎨 Processing Dynamic Creative media...
2025-12-20T10:22:07.088024613Z 📊 Total media files to process: 5
2025-12-20T10:22:07.088026874Z   📸 3 images, 📹 2 videos
2025-12-20T10:22:07.088029074Z   🚀 Uploading 3 images in parallel...
2025-12-20T10:22:07.088031984Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.088034314Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:07.088037174Z   📸 Processing image: /opt/render/project/src/backend/uploads/test_1766226088532_main.webp
2025-12-20T10:22:07.088384088Z 📊 API call tracked: CampaignGlobal (Main OAuth) (27/200 calls, 14%)
2025-12-20T10:22:07.088463163Z ✅ AdSet Created Successfully!
2025-12-20T10:22:07.088581571Z 🆔 AdSet ID: 120239028544970588
2025-12-20T10:22:07.088629565Z === ADSET CREATION END ===
2025-12-20T10:22:07.088633205Z 
2025-12-20T10:22:07.08871207Z 
2025-12-20T10:22:07.088716611Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:07.088766864Z 📌 Campaign: [TEST] With Text Variations - 2025-12-20T10-22-04
2025-12-20T10:22:07.091871625Z 📊 Media Type: single_image
2025-12-20T10:22:07.09195439Z 🔄 Skip Upload: NO
2025-12-20T10:22:07.091959141Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:07.091962411Z ===========================================
2025-12-20T10:22:07.091964391Z 
2025-12-20T10:22:07.091966561Z 📸 Starting image upload...
2025-12-20T10:22:07.091969491Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.091972232Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.091974562Z File size: 1.79MB
2025-12-20T10:22:07.091977432Z 📊 API call tracked: CampaignGlobal (Main OAuth) (28/200 calls, 14%)
2025-12-20T10:22:07.091979552Z ✅ AdSet Created Successfully!
2025-12-20T10:22:07.091981602Z 🆔 AdSet ID: 120239028549730588
2025-12-20T10:22:07.091983612Z === ADSET CREATION END ===
2025-12-20T10:22:07.091985522Z 
2025-12-20T10:22:07.091987382Z 
2025-12-20T10:22:07.091992453Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:07.091994963Z 📌 Campaign: [TEST] 1-50-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:07.091997243Z 📊 Media Type: single_image
2025-12-20T10:22:07.091999543Z 🔄 Skip Upload: NO
2025-12-20T10:22:07.092001754Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:07.092003914Z ===========================================
2025-12-20T10:22:07.092006034Z 
2025-12-20T10:22:07.092008364Z 📸 Starting image upload...
2025-12-20T10:22:07.092010774Z   Image path: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.092013564Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.092016195Z File size: 1.79MB
2025-12-20T10:22:07.18799069Z 📊 API call tracked: CampaignGlobal (Main OAuth) (29/200 calls, 14%)
2025-12-20T10:22:07.188017002Z ✅ AdSet Created Successfully!
2025-12-20T10:22:07.188021162Z 🆔 AdSet ID: 120239028547940588
2025-12-20T10:22:07.188023612Z === ADSET CREATION END ===
2025-12-20T10:22:07.188025572Z 
2025-12-20T10:22:07.188037793Z 
2025-12-20T10:22:07.188040553Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:07.188047554Z 📌 Campaign: [TEST] 1-50-1 Single Video - 2025-12-20T10-22-04
2025-12-20T10:22:07.188052884Z 📊 Media Type: video
2025-12-20T10:22:07.188055354Z 🔄 Skip Upload: NO
2025-12-20T10:22:07.188057555Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:07.188059745Z ===========================================
2025-12-20T10:22:07.188061605Z 
2025-12-20T10:22:07.188063635Z 🎬 Starting video upload...
2025-12-20T10:22:07.188066515Z   Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:07.188068675Z   📊 Video size: 1.30MB
2025-12-20T10:22:07.188845888Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:07.189045531Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:07.189199042Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:07.189368804Z 🎬 [uploadVideo] File size: 1.30 MB
2025-12-20T10:22:07.189530214Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:07.190044149Z 🎬 [uploadVideo] Buffer size: 1.30 MB
2025-12-20T10:22:07.190163987Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:07.190439706Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:07.190559064Z 🎬 [uploadVideo] Uploading video: test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:07.190621938Z 🎬 [uploadVideo] File size: 1.30MB
2025-12-20T10:22:07.190720505Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:07.193258637Z 📊 API call tracked: CampaignGlobal (Main OAuth) (30/200 calls, 15%)
2025-12-20T10:22:07.193271248Z ✅ AdSet Created Successfully!
2025-12-20T10:22:07.193274678Z 🆔 AdSet ID: 120239028545870588
2025-12-20T10:22:07.193277359Z === ADSET CREATION END ===
2025-12-20T10:22:07.193279789Z 
2025-12-20T10:22:07.193286429Z 
2025-12-20T10:22:07.19329391Z 🔒 ========== MEDIA ISOLATION CHECK ==========
2025-12-20T10:22:07.19329683Z 📌 Campaign: [TEST] 1-25-1 Single Video - 2025-12-20T10-22-04
2025-12-20T10:22:07.19329982Z 📊 Media Type: video
2025-12-20T10:22:07.193468352Z 🔄 Skip Upload: NO
2025-12-20T10:22:07.193649854Z ♻️ Has Reused Hashes: NO
2025-12-20T10:22:07.193658285Z ===========================================
2025-12-20T10:22:07.193660775Z 
2025-12-20T10:22:07.194187371Z 🎬 Starting video upload...
2025-12-20T10:22:07.194196711Z   Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:07.194199361Z   📊 Video size: 1.30MB
2025-12-20T10:22:07.196180226Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:07.196190167Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:07.196193677Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:07.196228989Z 🎬 [uploadVideo] File size: 1.30 MB
2025-12-20T10:22:07.19624657Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:07.196517799Z 🎬 [uploadVideo] Buffer size: 1.30 MB
2025-12-20T10:22:07.196523539Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:07.196663509Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:07.196697381Z 🎬 [uploadVideo] Uploading video: test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:07.196736224Z 🎬 [uploadVideo] File size: 1.30MB
2025-12-20T10:22:07.196739814Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:07.604579951Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:07.604989459Z 📸 Uploading image: test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:07.605001139Z 📦 File size: 0.18MB
2025-12-20T10:22:07.6050052Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:07.60500811Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:07.78796627Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:07.788335906Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:07.788359747Z 📦 File size: 0.25MB
2025-12-20T10:22:07.788364227Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:07.788368798Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:07.892955618Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:07.893332223Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:07.893341624Z 📦 File size: 0.25MB
2025-12-20T10:22:07.893345984Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:07.893350304Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:07.894619521Z Original format detected: png
2025-12-20T10:22:07.894631992Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:07.895025318Z Original format detected: png
2025-12-20T10:22:07.895036139Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:07.895229132Z Original format detected: png
2025-12-20T10:22:07.895234832Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:07.89594378Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:07.895954751Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.895958001Z File size: 1.79MB
2025-12-20T10:22:07.895960502Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:07.895962712Z Processing image: test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:07.895965232Z File size: 1.41MB
2025-12-20T10:22:07.895967952Z Original format detected: png
2025-12-20T10:22:07.895970532Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:07.896196908Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:07.896245271Z Processing image: test_1766226086013_ad-image-0__3_.png
2025-12-20T10:22:07.896352498Z File size: 1.79MB
2025-12-20T10:22:07.896535201Z   ✅ Image dimensions OK (1024x1024), uploading...
2025-12-20T10:22:07.896541291Z Processing image: test_1766226086710_ad-image-1__3_.png
2025-12-20T10:22:07.896544631Z File size: 1.41MB
2025-12-20T10:22:07.896600505Z ⚠️ Image test_1766226088532_main.webp dimensions (600x400) don't meet minimum requirements (600x600)
2025-12-20T10:22:07.896681251Z   ⚠️ Skipping image - dimensions (600x400) below minimum (600x600): /opt/render/project/src/backend/uploads/test_1766226088532_main.webp
2025-12-20T10:22:07.896686731Z Original format detected: png
2025-12-20T10:22:07.896689621Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:07.896932238Z Original format detected: png
2025-12-20T10:22:07.896944048Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:07.905421834Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:07.90566107Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:07.905668871Z 📦 File size: 0.25MB
2025-12-20T10:22:07.905672891Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:07.905676001Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:08.500827224Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:08.50106117Z 📸 Uploading image: test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:08.503484845Z 📦 File size: 0.18MB
2025-12-20T10:22:08.503500206Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:08.503504286Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:08.693241937Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:08.693765352Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:08.693930253Z 📦 File size: 0.25MB
2025-12-20T10:22:08.694034691Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:08.694143358Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:08.696557692Z Original format detected: png
2025-12-20T10:22:08.696710192Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:08.697343205Z Original format detected: png
2025-12-20T10:22:08.697500746Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:08.911094356Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:08.911629582Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:08.91175172Z 📦 File size: 0.25MB
2025-12-20T10:22:08.911851527Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:08.911943124Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:08.913595276Z Original format detected: png
2025-12-20T10:22:08.913712184Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:08.914192976Z Original format detected: png
2025-12-20T10:22:08.914285052Z Converting to JPEG for Facebook compatibility...
2025-12-20T10:22:09.000901443Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.001458861Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.001654734Z 📦 File size: 0.25MB
2025-12-20T10:22:09.001791353Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:09.001984196Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:09.58919828Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.589220492Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.589223972Z 📦 File size: 0.25MB
2025-12-20T10:22:09.589226942Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:09.589229943Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:09.809964297Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.809989049Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.809992499Z 📦 File size: 0.25MB
2025-12-20T10:22:09.80999958Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:09.81000271Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:09.899943396Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.900246457Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:09.900255517Z 📦 File size: 0.25MB
2025-12-20T10:22:09.900259247Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:09.900262258Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:10.004036163Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:10.004346524Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:10.004351194Z 📦 File size: 0.25MB
2025-12-20T10:22:10.004354564Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:10.004358034Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:10.492597399Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:10.492911991Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:10.492921621Z 📦 File size: 0.25MB
2025-12-20T10:22:10.492925361Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:10.492939253Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:10.496855808Z 📨 Facebook API Response: {
2025-12-20T10:22:10.49687586Z   "images": {
2025-12-20T10:22:10.496892351Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.496896291Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.496900331Z       "height": 1024,
2025-12-20T10:22:10.496905002Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=6Mi_7lZ5aG6beoi2mQE6Ig&_nc_tpa=Q5bMBQGRdFEMw3f1b1lMxECiARznQf9shcslmVEIXelZmmGHea3BtrucKITjvqlieJJRYK2RiB2_Px3V&oh=00_Afnw0J2Oyp2wEZOqtWTP1WatnTxU9rWmCVPZfXpl2QMG3w&oe=694C3754",
2025-12-20T10:22:10.496912592Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.496916052Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=6Mi_7lZ5aG6beoi2mQE6Ig&_nc_tpa=Q5bMBQFMYTPPGWG4I28_uQKx45eqs45VDsd_l11gy5rBF-FCXtnYiL7GDG9dw6prQHpoCM1PvZ11_ZDM&oh=00_AfmeHX3bUZt41mT6s4hvLEPUXQtI3YSDYgzpVO_CuYhDxg&oe=694C3754",
2025-12-20T10:22:10.496919303Z       "width": 1024,
2025-12-20T10:22:10.496922933Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=6Mi_7lZ5aG6beoi2mQE6Ig&_nc_tpa=Q5bMBQG63ChNhpCxJhP5x3tivi7e7w78vAF6Zmw5VJPih9T9ZCsHJN6jGTb_VBcHxCgjJa-asS8LQPC1&oh=00_Afnic_UTiiQEO-Ld5Szzdi7sMDMI0aGua0SiYhl3T_HqrA&oe=694C3754",
2025-12-20T10:22:10.496926243Z       "url_256_height": "260",
2025-12-20T10:22:10.496929564Z       "url_256_width": "260"
2025-12-20T10:22:10.496935894Z     }
2025-12-20T10:22:10.496939644Z   }
2025-12-20T10:22:10.496943254Z }
2025-12-20T10:22:10.496945834Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.496948105Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.497147438Z   ✅ Image uploaded with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.497285288Z 📨 Facebook API Response: {
2025-12-20T10:22:10.497289918Z   "images": {
2025-12-20T10:22:10.497293218Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.497296428Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.497299678Z       "height": 1024,
2025-12-20T10:22:10.497305079Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=svL0fqSW8XDiQkie-ca5Qg&_nc_tpa=Q5bMBQHC0Lyz6GK7MCOD59nkG-whoPjB3bA9JNdYkEY7ab1YF1GIko8hf2lCVk8Y1IqcoKL7zgk8tF_7&oh=00_Afl8zYhaF4RzCFJ_3hoYKq30_Qw5hVnnsXOBgoymJHtrPw&oe=694C3754",
2025-12-20T10:22:10.497307789Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.497311719Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=svL0fqSW8XDiQkie-ca5Qg&_nc_tpa=Q5bMBQH853lt9R1SKRbTBV1aP6suQ0wWvYRUm6CkJRmm1ekThl1arRdMfP80x1h8DvSNRnpfn6rIW2A8&oh=00_AflPE577IH3I-b8Cy87Tby8B5woLk3XU072ZotJO-TX6qg&oe=694C3754",
2025-12-20T10:22:10.497341191Z       "width": 1024,
2025-12-20T10:22:10.497344772Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=svL0fqSW8XDiQkie-ca5Qg&_nc_tpa=Q5bMBQF-nRRDJuiLudKeC4jBwTtARTQsl8T-A-0--gCrsV0jzuaX8cChPQ1V0dOKKoldPAGwncot7pJw&oh=00_AflkG4ynFSFmoM-QGp65gwT6okoOy-LK_YO2r_-IALOlnQ&oe=694C3754",
2025-12-20T10:22:10.497348142Z       "url_256_height": "260",
2025-12-20T10:22:10.497351282Z       "url_256_width": "260"
2025-12-20T10:22:10.497354122Z     }
2025-12-20T10:22:10.497357012Z   }
2025-12-20T10:22:10.497359622Z }
2025-12-20T10:22:10.497362563Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.497365333Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.497377054Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.497381394Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.497448588Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.498077981Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.498147276Z 📋 Ad Data Received: {
2025-12-20T10:22:10.498152466Z   mediaType: 'single_image',
2025-12-20T10:22:10.498155307Z   displayLink: 'example.com',
2025-12-20T10:22:10.498158787Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.498161547Z   url: 'https://example.com',
2025-12-20T10:22:10.498164337Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.498167427Z   primaryTextVariations: 0,
2025-12-20T10:22:10.498170237Z   headlineVariations: 0
2025-12-20T10:22:10.498183718Z }
2025-12-20T10:22:10.498215261Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.498218781Z   enabled: undefined,
2025-12-20T10:22:10.498221461Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.498224131Z   hasHeadlines: false,
2025-12-20T10:22:10.498226721Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.498229281Z }
2025-12-20T10:22:10.498340209Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 1-10-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.498344509Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.49834738Z   Ad Set ID: 120239028546720588
2025-12-20T10:22:10.4983513Z   Ad Name: [Launcher] [TEST] 1-10-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.498432775Z   Using Dynamic Creative: false
2025-12-20T10:22:10.498443286Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.499507999Z 📨 Facebook API Response: {
2025-12-20T10:22:10.499517609Z   "images": {
2025-12-20T10:22:10.499520879Z     "test_1766226086710_ad-image-1__3_-fb.jpg": {
2025-12-20T10:22:10.499523629Z       "hash": "188598cafdddf3bba77504e2c6b7ae54",
2025-12-20T10:22:10.49953668Z       "height": 1024,
2025-12-20T10:22:10.499542051Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=890911&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=zbtC9ZpHWYyBr3MDIzaMPg&_nc_tpa=Q5bMBQEJSAodDUP9t6kB3whKZgHKKyBZ5g4_whOwIMEPY-0_o_kVosUcl6CilynAQGcGH9BkG_XtcHpO&oh=00_Afm2ZsDpr6sRF15K8F_XaJWCtH3Vh8tCHs7qujrIRSfNVg&oe=694C665E",
2025-12-20T10:22:10.499544811Z       "name": "test_1766226086710_ad-image-1__3_-fb.jpg",
2025-12-20T10:22:10.499548141Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=zbtC9ZpHWYyBr3MDIzaMPg&_nc_tpa=Q5bMBQHl3DztsfipDLF5Is9WG6bgq2MQdjShSOq4sY36girUHdxY-s_ibhtCc8q3fWEChW0yYJtBRj92&oh=00_Afm7zzUfR-C-DHj6p9uJNB1izq1hGZ00dw_Pp2TOIEmpzw&oe=694C665E",
2025-12-20T10:22:10.499551111Z       "width": 1024,
2025-12-20T10:22:10.499553891Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=zbtC9ZpHWYyBr3MDIzaMPg&_nc_tpa=Q5bMBQEVD0xyGGIU1K79H08xnH4gO7rl6NBTn0mX6MYJOVrt79GF7b1Zzf2LLc4cBM2md0Gn3gobziDo&oh=00_AfnSHXGlx0yvoB4msfevpZ0bv4fwJDc9rEJMhLsoq-XT8Q&oe=694C665E",
2025-12-20T10:22:10.499556482Z       "url_256_height": "260",
2025-12-20T10:22:10.499559042Z       "url_256_width": "260"
2025-12-20T10:22:10.499562022Z     }
2025-12-20T10:22:10.499564772Z   }
2025-12-20T10:22:10.499567492Z }
2025-12-20T10:22:10.499570173Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.499573303Z 🔖 Image Hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:10.499691681Z   ✅ Image uploaded with hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:10.499735494Z   🚀 Uploading 1 videos (max 3 concurrent)...
2025-12-20T10:22:10.499776497Z   📹 Processing video batch 1/1
2025-12-20T10:22:10.499781427Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:10.499832181Z   📊 Video size: 1.30MB
2025-12-20T10:22:10.502733317Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:10.502744698Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:10.502749068Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:10.502758449Z 🎬 [uploadVideo] File size: 1.30 MB
2025-12-20T10:22:10.502837805Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:10.503911317Z 🎬 [uploadVideo] Buffer size: 1.30 MB
2025-12-20T10:22:10.503920638Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:10.504046647Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:10.504057517Z 🎬 [uploadVideo] Uploading video: test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:10.504064178Z 🎬 [uploadVideo] File size: 1.30MB
2025-12-20T10:22:10.504077039Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:10.50732925Z 📨 Facebook API Response: {
2025-12-20T10:22:10.507349011Z   "images": {
2025-12-20T10:22:10.507352961Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.507355491Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.507430736Z       "height": 1024,
2025-12-20T10:22:10.507437947Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=2VZVkDMPP2tu1pVYx1uG0w&_nc_tpa=Q5bMBQGRwuBunK5Ux0NQd5x3npSOt67BcVMvPvnRVrzeNmKzzu6icF6sF8az62TiHZymWJ6eA1Sy3uTC&oh=00_AfmMZ79zoSdMbzKCLiw6_nP9VDUp_k6joCvsfrziAIMAVQ&oe=694C3754",
2025-12-20T10:22:10.507441447Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.507446787Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=2VZVkDMPP2tu1pVYx1uG0w&_nc_tpa=Q5bMBQF8Z1wrNU28cC3SLACtVxk8pW3x3aIImD5sZTIQzAPL4zVifruOiTUBC_ZUw0GLEjBDklntSF9S&oh=00_AfkmoD1kbIMd20yfZyqRPklzjCtp2dRTRL1zVlDPJWmOWQ&oe=694C3754",
2025-12-20T10:22:10.507449598Z       "width": 1024,
2025-12-20T10:22:10.50748913Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=2VZVkDMPP2tu1pVYx1uG0w&_nc_tpa=Q5bMBQFhHFm5TrOH8cUbVD3PPjt9Ec3rS4nJkFw2GlOdBXChyNa9IeXZqsa5BuIptS1_5EhGO8VxewcB&oh=00_Afm8s83QY9ENXprY-ZJzVJXJvJDrLEyAr_Zid4-_0WQYlA&oe=694C3754",
2025-12-20T10:22:10.50749233Z       "url_256_height": "260",
2025-12-20T10:22:10.507495021Z       "url_256_width": "260"
2025-12-20T10:22:10.507497911Z     }
2025-12-20T10:22:10.507500551Z   }
2025-12-20T10:22:10.507503671Z }
2025-12-20T10:22:10.507506571Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.507509322Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.507623759Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.50762889Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.50763252Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.50763533Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.50763797Z 📋 Ad Data Received: {
2025-12-20T10:22:10.507655732Z   mediaType: 'single_image',
2025-12-20T10:22:10.507658602Z   displayLink: 'example.com',
2025-12-20T10:22:10.507662052Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.507665062Z   url: 'https://example.com',
2025-12-20T10:22:10.507667853Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.507670813Z   primaryTextVariations: 0,
2025-12-20T10:22:10.507673353Z   headlineVariations: 0
2025-12-20T10:22:10.507675893Z }
2025-12-20T10:22:10.507678463Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.507680923Z   enabled: undefined,
2025-12-20T10:22:10.507683694Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.507686284Z   hasHeadlines: false,
2025-12-20T10:22:10.507688944Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.507702945Z }
2025-12-20T10:22:10.507708845Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 1-100-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.507711545Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.507714116Z   Ad Set ID: 120239028544950588
2025-12-20T10:22:10.507717166Z   Ad Name: [Launcher] [TEST] 1-100-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.507719546Z   Using Dynamic Creative: false
2025-12-20T10:22:10.507724746Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.508607406Z 📨 Facebook API Response: {
2025-12-20T10:22:10.508621957Z   "images": {
2025-12-20T10:22:10.508626507Z     "test_1766226086710_ad-image-1__3_-fb.jpg": {
2025-12-20T10:22:10.508629107Z       "hash": "188598cafdddf3bba77504e2c6b7ae54",
2025-12-20T10:22:10.508632268Z       "height": 1024,
2025-12-20T10:22:10.508636168Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=890911&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=hFI2m-BEyNqd5UUUF9YrLQ&_nc_tpa=Q5bMBQGWFksf3uk5LNpJzmP_OGgVzz2QxEKbveFCQzvhNT6wMA1SltUX4XrZxJEtOGPMzu6SQsZSJW3d&oh=00_AfmcxHn_KzKuaroKY_5nYi1XkXmY0nl3_Zd6QrJHpeCqhA&oe=694C665E",
2025-12-20T10:22:10.508638898Z       "name": "test_1766226086710_ad-image-1__3_-fb.jpg",
2025-12-20T10:22:10.508642239Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=hFI2m-BEyNqd5UUUF9YrLQ&_nc_tpa=Q5bMBQH2g4TAMjZ1yBatEQ6h2H6XZNII2TkeMcbCXYmFh7vQBjzZlwApNVW1Wamk1XOPHftEcrZT4mnX&oh=00_Aflveclc72Mgr6MJ-0B2biiqfz0u19gl5YCbU8fBsjThHA&oe=694C665E",
2025-12-20T10:22:10.508644839Z       "width": 1024,
2025-12-20T10:22:10.508647309Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=hFI2m-BEyNqd5UUUF9YrLQ&_nc_tpa=Q5bMBQHt1kAgQOMq5mUTZsOw7F3lS7FA8syY3_u_ssGh0yAXOHxoLdRkiKjn7GKC70o79lv88Qoq993z&oh=00_Afn0Y2cN98Xv4AVw_Nm-kJAdZydzV9cl3nE0UPkgQ7I6Qw&oe=694C665E",
2025-12-20T10:22:10.508650109Z       "url_256_height": "260",
2025-12-20T10:22:10.508652749Z       "url_256_width": "260"
2025-12-20T10:22:10.508655749Z     }
2025-12-20T10:22:10.508658089Z   }
2025-12-20T10:22:10.50866015Z }
2025-12-20T10:22:10.50866237Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.50866464Z 🔖 Image Hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:10.508678451Z   ✅ Image uploaded with hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:10.587041821Z 📨 Facebook API Response: {
2025-12-20T10:22:10.587060412Z   "images": {
2025-12-20T10:22:10.587064092Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.587066843Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.587069623Z       "height": 1024,
2025-12-20T10:22:10.587087844Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=GoQu4q7kciv1GUWCJnBQ1Q&_nc_tpa=Q5bMBQHH5Aeg5ytypw4qmp9-x1zITOY8EEB6j-6U157aYHIL4nj7TnCnZ6hOGfIBo6NgNJyGASk2S9nz&oh=00_Aflv5JzJjnEoebz5iYDhLUs75fJD-87Dj5OD_d7AxpbnQw&oe=694C3754",
2025-12-20T10:22:10.587090514Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.587093714Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=GoQu4q7kciv1GUWCJnBQ1Q&_nc_tpa=Q5bMBQFIDQpxGynIU4l0DcmLEBnFhMjh9GkLVX0VV0ebONhrLke9DRLHvv2UnJzP2AKnwfOrtCtdu2s_&oh=00_AfmDs6vJsD-LcebUaAdK59iFAPjIHojl3KZt5RmHcc3DHQ&oe=694C3754",
2025-12-20T10:22:10.587096505Z       "width": 1024,
2025-12-20T10:22:10.587099285Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=GoQu4q7kciv1GUWCJnBQ1Q&_nc_tpa=Q5bMBQEjpANzJZu_VflizPF0H-fNYYLjkKjdmfujSSu80z84N9Qnh2t2waYPpXYtVJaMPIGLPVhvgEmz&oh=00_Afnf9HH7O5fAH0fbQbtG0JY7AihfrNOiidR7pwCtEz2gkA&oe=694C3754",
2025-12-20T10:22:10.587101655Z       "url_256_height": "260",
2025-12-20T10:22:10.587103775Z       "url_256_width": "260"
2025-12-20T10:22:10.587106035Z     }
2025-12-20T10:22:10.587108985Z   }
2025-12-20T10:22:10.587111226Z }
2025-12-20T10:22:10.587113526Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.587116146Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.587199192Z   ✅ Image uploaded with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.587203892Z ✅ Dynamic Creative: 2 unique images (0 duplicates removed)
2025-12-20T10:22:10.587206582Z ✅ Dynamic Creative media ready: 2 images, 0 videos
2025-12-20T10:22:10.587209232Z 
2025-12-20T10:22:10.587212452Z 📊 ========== MEDIA ASSET SUMMARY ==========
2025-12-20T10:22:10.587215393Z 📌 Campaign: [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04
2025-12-20T10:22:10.587218813Z 🖼️ Images: 2
2025-12-20T10:22:10.587245655Z 🎬 Videos: 0
2025-12-20T10:22:10.587250195Z    Image hashes: 37075ed6837a5619db1ecd172e6bd97f, 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:10.587253065Z ==========================================
2025-12-20T10:22:10.587255525Z 
2025-12-20T10:22:10.587258285Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.587281347Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.58732397Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.587389024Z 📋 Ad Data Received: {
2025-12-20T10:22:10.587393255Z   mediaType: 'dynamic',
2025-12-20T10:22:10.587396835Z   displayLink: 'example.com',
2025-12-20T10:22:10.587400265Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.587403195Z   url: 'https://example.com',
2025-12-20T10:22:10.587405826Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.587408556Z   primaryTextVariations: 0,
2025-12-20T10:22:10.587411136Z   headlineVariations: 0
2025-12-20T10:22:10.587424277Z }
2025-12-20T10:22:10.587427297Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.587430147Z   enabled: undefined,
2025-12-20T10:22:10.587432697Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.587435208Z   hasHeadlines: false,
2025-12-20T10:22:10.587450858Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.587454019Z }
2025-12-20T10:22:10.587456889Z 🎨 Creating ad with Dynamic Creative / Text Variations
2025-12-20T10:22:10.58746431Z   Has text variations: undefined
2025-12-20T10:22:10.58746704Z   Has dynamic media: true
2025-12-20T10:22:10.58746987Z   📝 Primary Text Options: 1 (main + variations, deduplicated)
2025-12-20T10:22:10.58747275Z   📰 Headline Options: 1 (main + variations, deduplicated)
2025-12-20T10:22:10.587612529Z   📸 Added 2 images to Dynamic Creative
2025-12-20T10:22:10.58761696Z ✅ Asset feed spec configured for dynamic creative
2025-12-20T10:22:10.587626501Z   Bodies: 1
2025-12-20T10:22:10.587629181Z   Titles: 1
2025-12-20T10:22:10.587634781Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.587684485Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.587688385Z   Ad Set ID: 120239028547150588
2025-12-20T10:22:10.587691255Z   Ad Name: [Launcher] [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.587697255Z   Using Dynamic Creative: false
2025-12-20T10:22:10.587722117Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316"},"asset_feed_spec":{"bodies":[{"text":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget."}],"titles":[{"text":"Test Campaign - Do Not Activate"}],"link_urls":[{"website_url":"https://example.com","display_url":"example.com"}],"call_to_action_types":["LEARN_MORE"],"ad_formats":["SINGLE_IMAGE"],"descriptions":[{"text":"Automated test campaign"}],"images":[{"hash":"37075ed6837a5619db1ecd1...
2025-12-20T10:22:10.589041477Z 📨 Facebook API Response: {
2025-12-20T10:22:10.589054598Z   "images": {
2025-12-20T10:22:10.589058648Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.589061838Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.589065268Z       "height": 1024,
2025-12-20T10:22:10.589069168Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=ijI0oxht-HsWGLmJWZxmkw&_nc_tpa=Q5bMBQFzh51LJEp-Tzo_ZCxSslBBr9So57CwtFRBwBbcHz1I-5NS3DLLa0YumcZDT64E90if3izIiJZq&oh=00_AfnavRbatgAXMJLgNRGgfbQXeqo1ruvE-_NczQXLIz80KA&oe=694C3754",
2025-12-20T10:22:10.589072639Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.589076509Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=ijI0oxht-HsWGLmJWZxmkw&_nc_tpa=Q5bMBQHEMDWg-SEPDp6ix1X-dJvCby6JM5Jf1MUfFqH7ZNdPsEVgHEMsW17OgdRSWcR4BMmSC1iPWX1F&oh=00_Afnl1XyR7ZbSx1Gy3j74q4lUg5Gl-M1L_sd02ZWxJbT_AA&oe=694C3754",
2025-12-20T10:22:10.589079739Z       "width": 1024,
2025-12-20T10:22:10.589083329Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=ijI0oxht-HsWGLmJWZxmkw&_nc_tpa=Q5bMBQH_wlVUYgb3yaUAYzG76FUEPZb5__DPYC_7l3f636Z9xGB-5bfpEoHl87fMeWBFW6XUXzFjLjTN&oh=00_AfkOnal79BOUiJlbQasXEZg4g5465e65nnu5BbTIfir05w&oe=694C3754",
2025-12-20T10:22:10.58909815Z       "url_256_height": "260",
2025-12-20T10:22:10.589102031Z       "url_256_width": "260"
2025-12-20T10:22:10.589105451Z     }
2025-12-20T10:22:10.589108811Z   }
2025-12-20T10:22:10.589112231Z }
2025-12-20T10:22:10.589115652Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.589119162Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.589128632Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.589131983Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.589188396Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.589193097Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.589196597Z 📋 Ad Data Received: {
2025-12-20T10:22:10.589200417Z   mediaType: 'single_image',
2025-12-20T10:22:10.589203758Z   displayLink: 'example.com',
2025-12-20T10:22:10.589207828Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.589211358Z   url: 'https://example.com',
2025-12-20T10:22:10.589214628Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.589217858Z   primaryTextVariations: 0,
2025-12-20T10:22:10.589221209Z   headlineVariations: 0
2025-12-20T10:22:10.589224679Z }
2025-12-20T10:22:10.589289063Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.589292824Z   enabled: undefined,
2025-12-20T10:22:10.589295604Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.589298834Z   hasHeadlines: false,
2025-12-20T10:22:10.589301264Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.589302934Z }
2025-12-20T10:22:10.589305335Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] With Spending Limits - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.589307785Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.589309505Z   Ad Set ID: 120239028547370588
2025-12-20T10:22:10.589311625Z   Ad Name: [Launcher] [TEST] With Spending Limits - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.589313625Z   Using Dynamic Creative: false
2025-12-20T10:22:10.589315965Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.59056806Z 📨 Facebook API Response: {
2025-12-20T10:22:10.590577871Z   "images": {
2025-12-20T10:22:10.590581221Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.590583791Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.590586491Z       "height": 1024,
2025-12-20T10:22:10.590590092Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=amfifoXHneDFkjgkFTJTvA&_nc_tpa=Q5bMBQGHePYHJM1JifJQu-Zp-7JF1VGKnkGGGgzGUyVRazgK5cOHGKn4mTAFm7Dph3B7l5T2xS3fSp5_&oh=00_AflopYaGbn1pTYKoXbWwEZ2DvnGybuT7b7ZPk9Qq1_5gZA&oe=694C3754",
2025-12-20T10:22:10.590593382Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.590604303Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=amfifoXHneDFkjgkFTJTvA&_nc_tpa=Q5bMBQFm0kOWw5ASpPEATIh3nO7AOTRuIxbCz78RZIeCg159lnvPZHpD5WuERqwe-mqAtsgxP-aV6s4E&oh=00_Afn9-73CFFN0_StFM11gHZoE4kUDEcb3EK8eWEed8QJfMA&oe=694C3754",
2025-12-20T10:22:10.590606103Z       "width": 1024,
2025-12-20T10:22:10.590607803Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=amfifoXHneDFkjgkFTJTvA&_nc_tpa=Q5bMBQF-yPShrJ-T93tvJ0sKeEdtphX75BkypsAyxx2kw8JBHiJ1oHagwhLmuHg5AjxhY0x_KBCqlpNO&oh=00_AfnFf0rGrLBzL53l30YUktS_I9zVkywdUvHN12aPLGHZvA&oe=694C3754",
2025-12-20T10:22:10.590609533Z       "url_256_height": "260",
2025-12-20T10:22:10.590611293Z       "url_256_width": "260"
2025-12-20T10:22:10.590613273Z     }
2025-12-20T10:22:10.590616044Z   }
2025-12-20T10:22:10.590619074Z }
2025-12-20T10:22:10.590622054Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.590625154Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.592152098Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.592164919Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.592168399Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.592170999Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.592174079Z 📋 Ad Data Received: {
2025-12-20T10:22:10.592176999Z   mediaType: 'single_image',
2025-12-20T10:22:10.59217958Z   displayLink: 'example.com',
2025-12-20T10:22:10.59218293Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.59218569Z   url: 'https://example.com',
2025-12-20T10:22:10.59218861Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.5921913Z   primaryTextVariations: 0,
2025-12-20T10:22:10.592194021Z   headlineVariations: 0
2025-12-20T10:22:10.592196521Z }
2025-12-20T10:22:10.592199201Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.592202021Z   enabled: undefined,
2025-12-20T10:22:10.592204691Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.592207352Z   hasHeadlines: false,
2025-12-20T10:22:10.592209852Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.592212372Z }
2025-12-20T10:22:10.592215742Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 3 Campaigns × 10 AdSets - 2025-12-20T10-22-04 - Campaign 1 - Ad Main
2025-12-20T10:22:10.592218202Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.592220722Z   Ad Set ID: 120239028546170588
2025-12-20T10:22:10.592223263Z   Ad Name: [Launcher] [TEST] 3 Campaigns × 10 AdSets - 2025-12-20T10-22-04 - Campaign 1 - Ad Main
2025-12-20T10:22:10.592225623Z   Using Dynamic Creative: false
2025-12-20T10:22:10.592228743Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.592243404Z 📨 Facebook API Response: {
2025-12-20T10:22:10.592246414Z   "images": {
2025-12-20T10:22:10.592248934Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.592251315Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.592253745Z       "height": 1024,
2025-12-20T10:22:10.592260555Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=1jCXjsMQiXWs6TI11UGqtw&_nc_tpa=Q5bMBQHAHrWqwQ93m7CsreHkexmzGVi3jginWh-YlCg-1H4SOoTa-eGTlq_YzoiCuCsp6SC2pXXOZRHN&oh=00_AfnBeF028B0TnLWw_6hN8iC3PnthwOgEnaDFAl0g1zt1gw&oe=694C3754",
2025-12-20T10:22:10.592263705Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.592267065Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=1jCXjsMQiXWs6TI11UGqtw&_nc_tpa=Q5bMBQFeRMZNUmixGjPhbmNDlEnot_R03mx1goXx_kFc5r2kOTKkONNE09Ikqhhos-Xxl1aOvv1cMGIR&oh=00_AfnS7dUoMNrm9W1TCGnF54ynED1Vl6H1er56lOH598yY2A&oe=694C3754",
2025-12-20T10:22:10.592269646Z       "width": 1024,
2025-12-20T10:22:10.592275026Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=1jCXjsMQiXWs6TI11UGqtw&_nc_tpa=Q5bMBQG-u3bGj7rtggGw_GLYgrLBQZzbzUv-9yZmM28KgBKpZmcljiIjHyNDvDs5l9iKoBx2ZLgFgCe_&oh=00_Afn3mke_WEgf-2EAdCJ-13nee_KD-vC4b-ydKxSpn7XUJg&oe=694C3754",
2025-12-20T10:22:10.592277676Z       "url_256_height": "260",
2025-12-20T10:22:10.592280477Z       "url_256_width": "260"
2025-12-20T10:22:10.592283737Z     }
2025-12-20T10:22:10.592286147Z   }
2025-12-20T10:22:10.592288627Z }
2025-12-20T10:22:10.592291267Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.592293967Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.592296898Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.592299318Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.592301808Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.592304308Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.592306668Z 📋 Ad Data Received: {
2025-12-20T10:22:10.592308939Z   mediaType: 'single_image',
2025-12-20T10:22:10.592311299Z   displayLink: 'example.com',
2025-12-20T10:22:10.592313719Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.592316339Z   url: 'https://example.com',
2025-12-20T10:22:10.592318879Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.592321309Z   primaryTextVariations: 0,
2025-12-20T10:22:10.5923237Z   headlineVariations: 0
2025-12-20T10:22:10.59232602Z }
2025-12-20T10:22:10.59232862Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.59233115Z   enabled: undefined,
2025-12-20T10:22:10.59233396Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.59233689Z   hasHeadlines: false,
2025-12-20T10:22:10.59233939Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.592342141Z }
2025-12-20T10:22:10.592350301Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 1-25-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.592358762Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.592361682Z   Ad Set ID: 120239028549020588
2025-12-20T10:22:10.592364402Z   Ad Name: [Launcher] [TEST] 1-25-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.592367122Z   Using Dynamic Creative: false
2025-12-20T10:22:10.592370192Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.593041908Z 📨 Facebook API Response: {
2025-12-20T10:22:10.593056499Z   "images": {
2025-12-20T10:22:10.59306017Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.59306292Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.59306603Z       "height": 1024,
2025-12-20T10:22:10.59307001Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=DqNiGAwoowI5_7QMB-dJBA&_nc_tpa=Q5bMBQE7iA3-cMn07XjWKLTe8aUqPqSn2WgUmIErWGLEIiWBSs16yzVtmY2ZvkoJKCtqrIWVQNwDDbUS&oh=00_AfkCF0SB_nzU_yvkL3fLv3HUqRFplsF4yc3t-3BS86Ii6Q&oe=694C3754",
2025-12-20T10:22:10.5930726Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.59307582Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=DqNiGAwoowI5_7QMB-dJBA&_nc_tpa=Q5bMBQFATk492fOn-cMytJQ3Wzw94z9ubjRdvWQNA-YeYgJ2EmJFRoWXL168XEQ0CFfH6kIt1S_JGpgH&oh=00_AflPeI6HL_TRUcHIIyIb9DBzOQoB-H3rBrnJzMNEqbP0lA&oe=694C3754",
2025-12-20T10:22:10.593078431Z       "width": 1024,
2025-12-20T10:22:10.593083421Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=DqNiGAwoowI5_7QMB-dJBA&_nc_tpa=Q5bMBQH6Gc01WcG33i6lmhiTuZSK9up3aQvSFoMREUfOvCWsSNNT-l40b58a1uIWCRwUDzKYbCg_vDZk&oh=00_Afk1RthjkP5-ghj5nC74ME6v34zJAwvnddn67QUR-PxqbA&oe=694C3754",
2025-12-20T10:22:10.593086421Z       "url_256_height": "260",
2025-12-20T10:22:10.593107313Z       "url_256_width": "260"
2025-12-20T10:22:10.593110683Z     }
2025-12-20T10:22:10.593113263Z   }
2025-12-20T10:22:10.593116033Z }
2025-12-20T10:22:10.593128134Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.593155746Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.593161846Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.593189588Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.593253883Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.593291685Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.59336511Z 📋 Ad Data Received: {
2025-12-20T10:22:10.593377831Z   mediaType: 'single_image',
2025-12-20T10:22:10.593380721Z   displayLink: 'example.com',
2025-12-20T10:22:10.593383861Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.593386401Z   url: 'https://example.com',
2025-12-20T10:22:10.593389012Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.593391512Z   primaryTextVariations: 0,
2025-12-20T10:22:10.593394452Z   headlineVariations: 0
2025-12-20T10:22:10.593397232Z }
2025-12-20T10:22:10.593420884Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.593424404Z   enabled: undefined,
2025-12-20T10:22:10.593427144Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.593429804Z   hasHeadlines: false,
2025-12-20T10:22:10.593432565Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.593435085Z }
2025-12-20T10:22:10.593464547Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 1-50-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.593519181Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.593526421Z   Ad Set ID: 120239028549730588
2025-12-20T10:22:10.593566974Z   Ad Name: [Launcher] [TEST] 1-50-1 Single Image - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.593574084Z   Using Dynamic Creative: false
2025-12-20T10:22:10.593651979Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.594425162Z 📨 Facebook API Response: {
2025-12-20T10:22:10.594434133Z   "images": {
2025-12-20T10:22:10.594437333Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.594439993Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.594442753Z       "height": 1024,
2025-12-20T10:22:10.594446044Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=VIAfj2cUwxwiApJy_voVlg&_nc_tpa=Q5bMBQH_-Y9XE_VM14Sq7CAAaUri247M1P3ArgVWJc8rQMSDbRXIDbrv8hqZmOIoltaAlsynPI556JtI&oh=00_Afk2-mQKEvIM2MSQ6ZJL3yEWqpOd7eNYBhn6sr91VH3zQA&oe=694C3754",
2025-12-20T10:22:10.594448704Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.594451544Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=VIAfj2cUwxwiApJy_voVlg&_nc_tpa=Q5bMBQGOlMFzhF2a45nZHqWAKycAfbbp5GC_VzsgnbFZVOWlgrYIYPcfu7B2z1-0HrNVzuzakQmfklGH&oh=00_AfmlVKElU1Uk1hgEAaVAIU-Xm0H7ubfaLPhpoY2t3NGXMw&oe=694C3754",
2025-12-20T10:22:10.594454194Z       "width": 1024,
2025-12-20T10:22:10.594456844Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=VIAfj2cUwxwiApJy_voVlg&_nc_tpa=Q5bMBQH0ApxAFuEhmyalrMxxuCbZwTN_VNcQYoJuqXv1XnNYmfxw9H6i8TSzpNvOR0kYXsjMvUHEUQgi&oh=00_AflroqDNtwNG57UrJxUI-Xh7tLpQlZJ7eWHfXpz51fYGkQ&oe=694C3754",
2025-12-20T10:22:10.594459444Z       "url_256_height": "260",
2025-12-20T10:22:10.594471565Z       "url_256_width": "260"
2025-12-20T10:22:10.594474835Z     }
2025-12-20T10:22:10.594478186Z   }
2025-12-20T10:22:10.594480956Z }
2025-12-20T10:22:10.594483756Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.594487056Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.594499427Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.594505068Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.594572672Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: undefined, primaryTextVariations: 0, headlineVariations: 0 }
2025-12-20T10:22:10.594577722Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.594613465Z 📋 Ad Data Received: {
2025-12-20T10:22:10.594617435Z   mediaType: 'single_image',
2025-12-20T10:22:10.594620085Z   displayLink: 'example.com',
2025-12-20T10:22:10.594623456Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.594626146Z   url: 'https://example.com',
2025-12-20T10:22:10.594628536Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:10.594631176Z   primaryTextVariations: 0,
2025-12-20T10:22:10.594633966Z   headlineVariations: 0
2025-12-20T10:22:10.594637137Z }
2025-12-20T10:22:10.594664668Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.594667319Z   enabled: undefined,
2025-12-20T10:22:10.59468475Z   hasPrimaryTexts: false,
2025-12-20T10:22:10.59468746Z   hasHeadlines: false,
2025-12-20T10:22:10.59468998Z   willUseAssetFeedSpec: false
2025-12-20T10:22:10.59469275Z }
2025-12-20T10:22:10.594699661Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] Minimum 1-1-1 - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.594749864Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.594799997Z   Ad Set ID: 120239028548520588
2025-12-20T10:22:10.594827799Z   Ad Name: [Launcher] [TEST] Minimum 1-1-1 - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.594859932Z   Using Dynamic Creative: false
2025-12-20T10:22:10.594902904Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316","link_data":{"link":"https://example.com","message":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.","name":"Test Campaign - Do Not Activate","description":"Automated test campaign","call_to_action":{"type":"LEARN_MORE"},"caption":"example.com","image_hash":"37075ed6837a5619db1ecd172e6bd97f"}}}...
2025-12-20T10:22:10.595756302Z 📨 Facebook API Response: {
2025-12-20T10:22:10.595766083Z   "images": {
2025-12-20T10:22:10.595772794Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.595776444Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.595780404Z       "height": 1024,
2025-12-20T10:22:10.595783864Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=vnkiP_2sMMVxh6PXiL7kpQ&_nc_tpa=Q5bMBQF3lqK-_oV_IxhlQsFacoSIrghYBFXNmL0medgwrnARZCll7aqO5c9_hjWGwYvXM0VBoi_9mMnd&oh=00_Afm-JPMv2761IQaxMhbbHR4-_BKAuiW9scoc69j8RZndkQ&oe=694C3754",
2025-12-20T10:22:10.595786335Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.595788935Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=vnkiP_2sMMVxh6PXiL7kpQ&_nc_tpa=Q5bMBQH_BGUEiPsYahhCkvx4cGjEyn2-Tffb1I7M8vZna8WsT7-gXTqYdhoHF_WHqBwpTvM6HgnIdbLY&oh=00_Afn1AjS9o3Oy8FELaNuWkLiDR7Dgjy0X2vAB6f7CoH6l-g&oe=694C3754",
2025-12-20T10:22:10.595803386Z       "width": 1024,
2025-12-20T10:22:10.595844488Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=vnkiP_2sMMVxh6PXiL7kpQ&_nc_tpa=Q5bMBQEalncXRNjk8CvAX6MckrAeTlReHUzke6Oak-pP5VNhRrohvRwVf086dFCsCHKnWi49RxzBgb4L&oh=00_AflS3J8AXbzNiHyQrIUwznh7xswIHgx6TU1wlYSE_XXbbA&oe=694C3754",
2025-12-20T10:22:10.595848779Z       "url_256_height": "260",
2025-12-20T10:22:10.595851739Z       "url_256_width": "260"
2025-12-20T10:22:10.595880181Z     }
2025-12-20T10:22:10.595883771Z   }
2025-12-20T10:22:10.595886711Z }
2025-12-20T10:22:10.595889811Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.595893282Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.595959136Z ✅ Image uploaded successfully with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.595965747Z 📝 Creating ad with editor name: none (local upload)
2025-12-20T10:22:10.595969937Z 🎨 Dynamic Text Check BEFORE createAd: { enabled: true, primaryTextVariations: 3, headlineVariations: 3 }
2025-12-20T10:22:10.596030181Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:10.596062233Z 📋 Ad Data Received: {
2025-12-20T10:22:10.596066443Z   mediaType: 'single_image',
2025-12-20T10:22:10.596069924Z   displayLink: 'example.com',
2025-12-20T10:22:10.596073464Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:10.596076344Z   url: 'https://example.com',
2025-12-20T10:22:10.596079704Z   dynamicTextEnabled: true,
2025-12-20T10:22:10.596082715Z   primaryTextVariations: 3,
2025-12-20T10:22:10.596085815Z   headlineVariations: 3
2025-12-20T10:22:10.596089035Z }
2025-12-20T10:22:10.596096136Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:10.596099826Z   enabled: true,
2025-12-20T10:22:10.596103626Z   hasPrimaryTexts: true,
2025-12-20T10:22:10.596106976Z   hasHeadlines: true,
2025-12-20T10:22:10.596110226Z   willUseAssetFeedSpec: true
2025-12-20T10:22:10.596113517Z }
2025-12-20T10:22:10.596272988Z 🎨 Creating ad with Dynamic Creative / Text Variations
2025-12-20T10:22:10.596283788Z   Has text variations: true
2025-12-20T10:22:10.596355483Z   Has dynamic media: undefined
2025-12-20T10:22:10.59646397Z   📝 Primary Text Options: 4 (main + variations, deduplicated)
2025-12-20T10:22:10.596471651Z   📰 Headline Options: 4 (main + variations, deduplicated)
2025-12-20T10:22:10.596545176Z ✅ Asset feed spec configured for dynamic creative
2025-12-20T10:22:10.596593829Z   Bodies: 4
2025-12-20T10:22:10.59660111Z   Titles: 4
2025-12-20T10:22:10.596672555Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.596721738Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:10.596730869Z   Ad Set ID: 120239028544970588
2025-12-20T10:22:10.596870928Z   Ad Name: [Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:10.59688935Z   Using Dynamic Creative: true
2025-12-20T10:22:10.59689336Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316"},"asset_feed_spec":{"bodies":[{"text":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget."},{"text":"Primary Text 1"},{"text":"Primary Text 2"},{"text":"Primary Text 3"}],"titles":[{"text":"Test Campaign - Do Not Activate"},{"text":"Headline 1"},{"text":"Headline 2"},{"text":"Headline 3"}],"link_urls":[{"website_url":"https://example.com","display_url":"example.com"}],"call_to_action_ty...
2025-12-20T10:22:10.691501422Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:10.69175951Z 📸 Uploading image: test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:10.691887348Z 📦 File size: 0.18MB
2025-12-20T10:22:10.691902809Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:10.691960773Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:10.884851938Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:10.885342381Z 📸 Uploading image: test_1766226086710_ad-image-1__3_-fb.jpg
2025-12-20T10:22:10.885352832Z 📦 File size: 0.18MB
2025-12-20T10:22:10.885374484Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:10.885402605Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:10.887427623Z 📨 Facebook API Response: {
2025-12-20T10:22:10.887441034Z   "images": {
2025-12-20T10:22:10.887445584Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:10.887449295Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:10.887453365Z       "height": 1024,
2025-12-20T10:22:10.887460055Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=PqP-L42DKZ53yA6-3KCTew&_nc_tpa=Q5bMBQE5Jw2DDYevxPcqRa_6HDfBj0JaEfkP3G09i4u_EfC2huHq6jNH4ImGNvwYl9Ra_D12Ah4-Wihx&oh=00_AflgQ5GaFtBuP5ionK4HWIqjZYdZw-D9NIyEOTy6PERM7g&oe=694C3754",
2025-12-20T10:22:10.887463846Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:10.887469786Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=PqP-L42DKZ53yA6-3KCTew&_nc_tpa=Q5bMBQHRQzkw6efKhIOvqku-JjBVHVZqFTdDYIFXyaAINDew7iMXHR1sAiEy65kJfS423iQw5pFA4fSm&oh=00_AfldCAuA_xjqOssPf2BIYyO_RECXHGPkpZEhg7NTREv0KQ&oe=694C3754",
2025-12-20T10:22:10.887473036Z       "width": 1024,
2025-12-20T10:22:10.887475316Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=PqP-L42DKZ53yA6-3KCTew&_nc_tpa=Q5bMBQEwhbQsNbtPngHsVLRnO5IHDJvTvkrtYuRVW3olqN6dS3IpvQTLqDcCv7gHez2c8v7Iz_UMG-nk&oh=00_AfkyTT3q93kC6U_MXLsCNCDE6ic66_Yg2XWq6QBJOkk5nA&oe=694C3754",
2025-12-20T10:22:10.887477457Z       "url_256_height": "260",
2025-12-20T10:22:10.887479547Z       "url_256_width": "260"
2025-12-20T10:22:10.887481707Z     }
2025-12-20T10:22:10.887483897Z   }
2025-12-20T10:22:10.887486447Z }
2025-12-20T10:22:10.887488627Z ✅ Image uploaded successfully!
2025-12-20T10:22:10.887490907Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.887498338Z   ✅ Image uploaded with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:10.889711908Z ✅ Image converted successfully: /opt/render/project/src/backend/uploads/test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:10.889955025Z 📸 Uploading image: test_1766226086013_ad-image-0__3_-fb.jpg
2025-12-20T10:22:10.889963075Z 📦 File size: 0.25MB
2025-12-20T10:22:10.889967395Z 🎯 Ad Account ID: act_245628241931442
2025-12-20T10:22:10.889971876Z 🔑 Access Token: ✓ Present
2025-12-20T10:22:11.092158402Z 📨 Facebook API Response: {
2025-12-20T10:22:11.092178113Z   "images": {
2025-12-20T10:22:11.092181673Z     "test_1766226086710_ad-image-1__3_-fb.jpg": {
2025-12-20T10:22:11.092184073Z       "hash": "188598cafdddf3bba77504e2c6b7ae54",
2025-12-20T10:22:11.092186963Z       "height": 1024,
2025-12-20T10:22:11.092189974Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=890911&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=qngWhmryUdjrRKWkuVA34A&_nc_tpa=Q5bMBQF_DsUTQKlpihXgOz_4JTBnVgthUl5pOedNTCEu4lIuvQS1mw19sHhK6h0lkZcCwZjPMzQUMsHl&oh=00_AfnIs2tA-_Qiu6lFYnkmZYxWcbv9J8-oNRhMyjvK6iyLtw&oe=694C665E",
2025-12-20T10:22:11.092192314Z       "name": "test_1766226086710_ad-image-1__3_-fb.jpg",
2025-12-20T10:22:11.092195094Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=qngWhmryUdjrRKWkuVA34A&_nc_tpa=Q5bMBQHcieil4zNwXLpaydi5Q7r4kedZW6AQlsapcQeduK7i2f4k2Uo4HHanKTcRQIAc1JK4K_5nMlhf&oh=00_AfnDBzKA6x3GzdzNcZzc24MhD1i77XZ3WGbzG9OJjFW_2Q&oe=694C665E",
2025-12-20T10:22:11.092197524Z       "width": 1024,
2025-12-20T10:22:11.092202935Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=qngWhmryUdjrRKWkuVA34A&_nc_tpa=Q5bMBQEJS_0bPFlluyNdOjWvK7GcTz0TIJRyKlG1uOcXCed5tiN7RvnD0AiNFFmKHuNf3nppouyjQLmq&oh=00_AfkoLEBGbjPlEolYXCerYsyPzhTzQ0W9Fjk5_L9wkXwcqA&oe=694C665E",
2025-12-20T10:22:11.092205215Z       "url_256_height": "260",
2025-12-20T10:22:11.092207365Z       "url_256_width": "260"
2025-12-20T10:22:11.092209525Z     }
2025-12-20T10:22:11.092211715Z   }
2025-12-20T10:22:11.092213875Z }
2025-12-20T10:22:11.092216045Z ✅ Image uploaded successfully!
2025-12-20T10:22:11.092218226Z 🔖 Image Hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:11.092352865Z   ✅ Image uploaded with hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:11.092361475Z   🚀 Uploading 2 videos (max 3 concurrent)...
2025-12-20T10:22:11.092369166Z   📹 Processing video batch 1/1
2025-12-20T10:22:11.092372966Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:11.092457472Z   📊 Video size: 1.30MB
2025-12-20T10:22:11.094692144Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:11.094721656Z   📊 Video size: 0.43MB
2025-12-20T10:22:11.095572773Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:11.095584054Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:11.095604095Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:11.095623907Z 🎬 [uploadVideo] File size: 1.30 MB
2025-12-20T10:22:11.095627517Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:11.095994812Z 🎬 [uploadVideo] Buffer size: 1.30 MB
2025-12-20T10:22:11.096007903Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:11.096124411Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:11.096130691Z 🎬 [uploadVideo] Uploading video: test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:11.096133202Z 🎬 [uploadVideo] File size: 1.30MB
2025-12-20T10:22:11.096135432Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:11.096352526Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:11.096356357Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:11.096361737Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:11.09641309Z 🎬 [uploadVideo] File size: 0.43 MB
2025-12-20T10:22:11.096415611Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:11.096604894Z 🎬 [uploadVideo] Buffer size: 0.43 MB
2025-12-20T10:22:11.096607904Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:11.096666828Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:11.096671248Z 🎬 [uploadVideo] Uploading video: test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:11.096673038Z 🎬 [uploadVideo] File size: 0.43MB
2025-12-20T10:22:11.096674868Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:11.275481287Z 📨 Facebook API Response: {
2025-12-20T10:22:11.275503818Z   "images": {
2025-12-20T10:22:11.275507559Z     "test_1766226086710_ad-image-1__3_-fb.jpg": {
2025-12-20T10:22:11.275510069Z       "hash": "188598cafdddf3bba77504e2c6b7ae54",
2025-12-20T10:22:11.275513119Z       "height": 1024,
2025-12-20T10:22:11.275516329Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=890911&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=WrBDrumDtmwG8odTrNFxLQ&_nc_tpa=Q5bMBQEltrDolLxUQEN_vV-ixDqVMtDLK_HeEUXzUWAw8N6PsEkIR9EzWCUJ6_wrnaTzh7jytA8NkApg&oh=00_AflQmhVMNkGQoaXSW59EnquM4N07pU1BrLrqQVBEQugU5Q&oe=694C665E",
2025-12-20T10:22:11.275537361Z       "name": "test_1766226086710_ad-image-1__3_-fb.jpg",
2025-12-20T10:22:11.275540991Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=WrBDrumDtmwG8odTrNFxLQ&_nc_tpa=Q5bMBQEp9w-toxw6nomjNSO1CBTdg5B-UgXpCGH3-Mo-F6yBjm4BwAgP_TceCGd8qnbdT0Bxyy-krZYv&oh=00_AflF4Yw6VsI3HW3ChuIxxMVOUyePfZcVNeBl4XXnDW4NpA&oe=694C665E",
2025-12-20T10:22:11.275543481Z       "width": 1024,
2025-12-20T10:22:11.275546001Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592157268_122203158506320319_8517718568493729250_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=108&ccb=1-7&_nc_sid=189157&_nc_ohc=JEZoz7EE4N4Q7kNvwHvJDVu&_nc_oc=Adm74dpcFMBqnCc3kXswUw94rrYwLa_75TnyBkpm2oN-DFnqfW2d1DqghFICDwh0C_s&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=WrBDrumDtmwG8odTrNFxLQ&_nc_tpa=Q5bMBQG-cFX_Ut9htB7_ujXrVFCukhBvmzqOeYXbPs1sGv99DuydKDaI_4sBI-66R2zd8YZI3k29UQMY&oh=00_AfnIFjAZwp9YlH-f7o-UihvYn7x48fGMKX3LOE5ybvRH7w&oe=694C665E",
2025-12-20T10:22:11.275561172Z       "url_256_height": "260",
2025-12-20T10:22:11.275563672Z       "url_256_width": "260"
2025-12-20T10:22:11.275566143Z     }
2025-12-20T10:22:11.275568403Z   }
2025-12-20T10:22:11.275570763Z }
2025-12-20T10:22:11.275580313Z ✅ Image uploaded successfully!
2025-12-20T10:22:11.275582884Z 🔖 Image Hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:11.275727474Z   ✅ Image uploaded with hash: 188598cafdddf3bba77504e2c6b7ae54
2025-12-20T10:22:11.305859209Z 📨 Facebook API Response: {
2025-12-20T10:22:11.305888121Z   "images": {
2025-12-20T10:22:11.305891951Z     "test_1766226086013_ad-image-0__3_-fb.jpg": {
2025-12-20T10:22:11.305909363Z       "hash": "37075ed6837a5619db1ecd172e6bd97f",
2025-12-20T10:22:11.305912983Z       "height": 1024,
2025-12-20T10:22:11.305916193Z       "url": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=890911&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=erYj_PddNShWWHnffb7viQ&_nc_tpa=Q5bMBQF1FE-WM0wPxi1dBzAkrXJJg7Q_SmdDRqpoWa4KhjE2bAy8WbI2aeG6MfNDjvQOYy7ReM_0R8Lu&oh=00_AfkktYW-88xckG9Iltb6VQlYXRYd9ErMziAhk50mpxP79A&oe=694C3754",
2025-12-20T10:22:11.305918723Z       "name": "test_1766226086013_ad-image-0__3_-fb.jpg",
2025-12-20T10:22:11.305921803Z       "url_128": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s168x128_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=erYj_PddNShWWHnffb7viQ&_nc_tpa=Q5bMBQGz6O12vu6LlRBm_S0zOzIq5lhzGlB0eFF0H6oJkU-2rOwEdKsRNKNuFa3Znws4ArZ-ZLAnYizL&oh=00_Afkbh5Jh08GwoXU351W2vW8pYMXe7x716NtwYdlfjk7fXA&oe=694C3754",
2025-12-20T10:22:11.305924064Z       "width": 1024,
2025-12-20T10:22:11.305926494Z       "url_256": "https://scontent-den2-1.xx.fbcdn.net/v/t45.1600-4/592216005_122203162616320319_940774952535743892_n.jpg?stp=dst-jpg_s261x260_tt6&_nc_cat=109&ccb=1-7&_nc_sid=189157&_nc_ohc=YcGbhjEbSWAQ7kNvwEv3jZX&_nc_oc=Adk4uyT32WLAHqXUSXsaTtiBeSbi9uG2dIcMGmeiTmK7wqSeMgj3T05OXxmrx7iorTs&_nc_zt=1&_nc_ht=scontent-den2-1.xx&edm=AJNyvH4EAAAA&_nc_gid=erYj_PddNShWWHnffb7viQ&_nc_tpa=Q5bMBQHK4zzifim1NDgVQ7amkNF4ZmHdDVjht3BzNeytzz-N-H10Qh3nUsMQHp1MCxt0AM7cCSJxeraz&oh=00_AflWdzkFIHmnA7d6POTq8ODKyZM4re5rErUk_82V8xzlng&oe=694C3754",
2025-12-20T10:22:11.305928894Z       "url_256_height": "260",
2025-12-20T10:22:11.305931164Z       "url_256_width": "260"
2025-12-20T10:22:11.305933614Z     }
2025-12-20T10:22:11.305935924Z   }
2025-12-20T10:22:11.305940325Z }
2025-12-20T10:22:11.30793393Z ✅ Image uploaded successfully!
2025-12-20T10:22:11.307950691Z 🔖 Image Hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:11.307954151Z   ✅ Image uploaded with hash: 37075ed6837a5619db1ecd172e6bd97f
2025-12-20T10:22:11.307957831Z   🚀 Uploading 2 videos (max 3 concurrent)...
2025-12-20T10:22:11.307960432Z   📹 Processing video batch 1/1
2025-12-20T10:22:11.307993534Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:11.308011165Z   📊 Video size: 1.30MB
2025-12-20T10:22:11.308896935Z   📹 Uploading video: /opt/render/project/src/backend/uploads/test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:11.309063037Z   📊 Video size: 0.43MB
2025-12-20T10:22:11.310070905Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:11.310158991Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:11.310272809Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:11.310408288Z 🎬 [uploadVideo] File size: 1.30 MB
2025-12-20T10:22:11.310484953Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:11.310970256Z 🎬 [uploadVideo] Buffer size: 1.30 MB
2025-12-20T10:22:11.311089514Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:11.31132105Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:11.311388764Z 🎬 [uploadVideo] Uploading video: test_1766226086823_AQMlIOvX7sEHjsYtAT_0MTrSV5e_yJYCtdKO-2Dl_JaZTlf6pKgBerzoVEzYPqLPRFdkuSgDWYFCuZ7y3F5HID0tQXwjetNGsYFxR-UZxQ.mp4
2025-12-20T10:22:11.311486301Z 🎬 [uploadVideo] File size: 1.30MB
2025-12-20T10:22:11.311547535Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:11.311937472Z   🚀 File <= 10MB - Using standard upload
2025-12-20T10:22:11.312056Z 🎬 [uploadVideo] START - Standard video upload method
2025-12-20T10:22:11.312132765Z 🎬 [uploadVideo] Video path: /opt/render/project/src/backend/uploads/test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:11.312274364Z 🎬 [uploadVideo] File size: 0.43 MB
2025-12-20T10:22:11.31235657Z 🎬 [uploadVideo] Reading video file into buffer...
2025-12-20T10:22:11.31294665Z 🎬 [uploadVideo] Buffer size: 0.43 MB
2025-12-20T10:22:11.313024415Z 🎬 [uploadVideo] Creating FormData for Facebook API...
2025-12-20T10:22:11.313210688Z 🎬 [uploadVideo] Upload URL: https://graph.facebook.com/v18.0/act_245628241931442/advideos
2025-12-20T10:22:11.313296814Z 🎬 [uploadVideo] Uploading video: test_1766226086888_AQNBoJl3ahDoQniMiaJnNqJzyd6cPUBihfr34VuBNloHILHmSorxERQWJZj7LIZnlGOcpiiRGslWXH6ibY8WUAp1XZkDHeEqUfNr-897Mg.mp4
2025-12-20T10:22:11.313365949Z 🎬 [uploadVideo] File size: 0.43MB
2025-12-20T10:22:11.313444334Z 🎬 [uploadVideo] Sending POST request to Facebook...
2025-12-20T10:22:11.361572021Z   ❌ API Error Details: {
2025-12-20T10:22:11.361599303Z   "status": 500,
2025-12-20T10:22:11.361603293Z   "statusText": "Internal Server Error",
2025-12-20T10:22:11.361605744Z   "code": 2,
2025-12-20T10:22:11.361608594Z   "message": "An unexpected error has occurred. Please retry your request later.",
2025-12-20T10:22:11.361610984Z   "type": "OAuthException",
2025-12-20T10:22:11.361613274Z   "fbtrace_id": "Aw41Q64qGLrr04CYtt9792I",
2025-12-20T10:22:11.361616284Z   "is_transient": true,
2025-12-20T10:22:11.361648476Z   "url": "https://graph.facebook.com/v18.0/act_245628241931442/ads",
2025-12-20T10:22:11.361651597Z   "method": "post"
2025-12-20T10:22:11.361657107Z }
2025-12-20T10:22:11.361780945Z   🔍 FULL Facebook Error Object: {
2025-12-20T10:22:11.361786806Z   "message": "An unexpected error has occurred. Please retry your request later.",
2025-12-20T10:22:11.361790036Z   "type": "OAuthException",
2025-12-20T10:22:11.361793126Z   "is_transient": true,
2025-12-20T10:22:11.361834159Z   "code": 2,
2025-12-20T10:22:11.36184058Z   "fbtrace_id": "Aw41Q64qGLrr04CYtt9792I"
2025-12-20T10:22:11.36184303Z }
2025-12-20T10:22:11.362064375Z   🔍 Rate Limit Detection: {
2025-12-20T10:22:11.362070795Z   isRateLimit: false,
2025-12-20T10:22:11.362073345Z   status: 500,
2025-12-20T10:22:11.362075625Z   errorCode: 2,
2025-12-20T10:22:11.362077826Z   errorSubcode: undefined,
2025-12-20T10:22:11.362080126Z   consecutiveErrors: 0
2025-12-20T10:22:11.362082316Z }
2025-12-20T10:22:11.362388107Z 
2025-12-20T10:22:11.362394907Z ===============================================
2025-12-20T10:22:11.362500534Z 🚨 FACEBOOK API ERROR OCCURRED 🚨
2025-12-20T10:22:11.362567879Z ===============================================
2025-12-20T10:22:11.362638924Z 
2025-12-20T10:22:11.362643214Z 📍 ERROR LOCATION:
2025-12-20T10:22:11.36273435Z   Request URL: https://graph.facebook.com/v18.0/act_245628241931442/ads
2025-12-20T10:22:11.362800005Z   Request Method: post
2025-12-20T10:22:11.362980867Z   HTTP Status: 500
2025-12-20T10:22:11.362989638Z 
2025-12-20T10:22:11.362992488Z 🔴 FACEBOOK ERROR DETAILS:
2025-12-20T10:22:11.363075393Z   Error Code: 2
2025-12-20T10:22:11.363187671Z   Error Message: An unexpected error has occurred. Please retry your request later.
2025-12-20T10:22:11.363192991Z   Error Type: OAuthException
2025-12-20T10:22:11.363195521Z   Error Subcode: undefined
2025-12-20T10:22:11.363198112Z   Error User Title: undefined
2025-12-20T10:22:11.363300639Z   Error User Message: undefined
2025-12-20T10:22:11.364986513Z ⚠️ Transient error on ad creation, retrying with backoff...
2025-12-20T10:22:11.364996164Z 🔄 Attempt 1/3...
2025-12-20T10:22:11.364999034Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:11.365001464Z 📋 Ad Data Received: {
2025-12-20T10:22:11.365003564Z   mediaType: 'dynamic',
2025-12-20T10:22:11.365005884Z   displayLink: 'example.com',
2025-12-20T10:22:11.365008515Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:11.365010845Z   url: 'https://example.com',
2025-12-20T10:22:11.365013225Z   dynamicTextEnabled: undefined,
2025-12-20T10:22:11.365015595Z   primaryTextVariations: 0,
2025-12-20T10:22:11.365017755Z   headlineVariations: 0
2025-12-20T10:22:11.365019945Z }
2025-12-20T10:22:11.365022316Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:11.365024476Z   enabled: undefined,
2025-12-20T10:22:11.365036737Z   hasPrimaryTexts: false,
2025-12-20T10:22:11.365039807Z   hasHeadlines: false,
2025-12-20T10:22:11.365042217Z   willUseAssetFeedSpec: false
2025-12-20T10:22:11.365044487Z }
2025-12-20T10:22:11.365046957Z 🎨 Creating ad with Dynamic Creative / Text Variations
2025-12-20T10:22:11.365049317Z   Has text variations: undefined
2025-12-20T10:22:11.365051638Z   Has dynamic media: true
2025-12-20T10:22:11.365054008Z   📝 Primary Text Options: 1 (main + variations, deduplicated)
2025-12-20T10:22:11.365056388Z   📰 Headline Options: 1 (main + variations, deduplicated)
2025-12-20T10:22:11.365058818Z   📸 Added 2 images to Dynamic Creative
2025-12-20T10:22:11.365061018Z ✅ Asset feed spec configured for dynamic creative
2025-12-20T10:22:11.365063418Z   Bodies: 1
2025-12-20T10:22:11.365065719Z   Titles: 1
2025-12-20T10:22:11.365068549Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:11.365070929Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:11.365073329Z   Ad Set ID: 120239028547150588
2025-12-20T10:22:11.365075829Z   Ad Name: [Launcher] [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:11.36508583Z   Using Dynamic Creative: false
2025-12-20T10:22:11.36508927Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316"},"asset_feed_spec":{"bodies":[{"text":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget."}],"titles":[{"text":"Test Campaign - Do Not Activate"}],"link_urls":[{"website_url":"https://example.com","display_url":"example.com"}],"call_to_action_types":["LEARN_MORE"],"ad_formats":["SINGLE_IMAGE"],"descriptions":[{"text":"Automated test campaign"}],"images":[{"hash":"37075ed6837a5619db1ecd1...
2025-12-20T10:22:11.365123322Z   Fbtrace ID: Aw41Q64qGLrr04CYtt9792I
2025-12-20T10:22:11.365126203Z 
2025-12-20T10:22:11.365129043Z 📤 REQUEST DATA THAT FAILED:
2025-12-20T10:22:11.365131803Z {
2025-12-20T10:22:11.365134793Z   "name": "[Launcher] [TEST] 1-50-1 DC (3 images) - 2025-12-20T10-22-04 - Ad Main",
2025-12-20T10:22:11.365137663Z   "adset_id": "120239028547150588",
2025-12-20T10:22:11.365143924Z   "creative": "{\"object_story_spec\":{\"page_id\":\"228304287042316\"},\"asset_feed_spec\":{\"bodies\":[{\"text\":\"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.\"}],\"titles\":[{\"text\":\"Test Campaign - Do Not Activate\"}],\"link_urls\":[{\"website_url\":\"https://example.com\",\"display_url\":\"example.com\"}],\"call_to_action_types\":[\"LEARN_MORE\"],\"ad_formats\":[\"SINGLE_IMAGE\"],\"descriptions\":[{\"text\":\"Automated test campaign\"}],\"images\":[{\"hash\":\"37075ed6837a5619db1ecd172e6bd97f\"},{\"hash\":\"188598cafdddf3bba77504e2c6b7ae54\"}]}}",
2025-12-20T10:22:11.365149054Z   "status": "ACTIVE",
2025-12-20T10:22:11.365151384Z   "access_token": "[HIDDEN]"
2025-12-20T10:22:11.365165235Z }
2025-12-20T10:22:11.365167485Z 
2025-12-20T10:22:11.365169775Z ===============================================
2025-12-20T10:22:11.365171906Z 
2025-12-20T10:22:11.569149343Z   ❌ API Error Details: {
2025-12-20T10:22:11.569172915Z   "status": 500,
2025-12-20T10:22:11.569177085Z   "statusText": "Internal Server Error",
2025-12-20T10:22:11.569180535Z   "code": 2,
2025-12-20T10:22:11.569184385Z   "message": "An unexpected error has occurred. Please retry your request later.",
2025-12-20T10:22:11.569187046Z   "type": "OAuthException",
2025-12-20T10:22:11.569189906Z   "fbtrace_id": "Ap7fmaX490L-aM5DHQpGVTg",
2025-12-20T10:22:11.569192976Z   "is_transient": true,
2025-12-20T10:22:11.569196626Z   "url": "https://graph.facebook.com/v18.0/act_245628241931442/ads",
2025-12-20T10:22:11.569196676Z   🔍 Rate Limit Detection: {
2025-12-20T10:22:11.569199306Z   "method": "post"
2025-12-20T10:22:11.569207927Z   isRateLimit: false,
2025-12-20T10:22:11.569211957Z   status: 500,
2025-12-20T10:22:11.569214087Z }
2025-12-20T10:22:11.569217108Z   errorCode: 2,
2025-12-20T10:22:11.569219508Z   🔍 FULL Facebook Error Object: {
2025-12-20T10:22:11.569222188Z   errorSubcode: undefined,
2025-12-20T10:22:11.569224408Z   "message": "An unexpected error has occurred. Please retry your request later.",
2025-12-20T10:22:11.569227008Z   consecutiveErrors: 0
2025-12-20T10:22:11.569229479Z   "type": "OAuthException",
2025-12-20T10:22:11.569232549Z }
2025-12-20T10:22:11.569234799Z   "is_transient": true,
2025-12-20T10:22:11.569239999Z   "code": 2,
2025-12-20T10:22:11.569242659Z   "fbtrace_id": "Ap7fmaX490L-aM5DHQpGVTg"
2025-12-20T10:22:11.569245349Z }
2025-12-20T10:22:11.56925689Z 
2025-12-20T10:22:11.56925981Z ===============================================
2025-12-20T10:22:11.569262391Z 🚨 FACEBOOK API ERROR OCCURRED 🚨
2025-12-20T10:22:11.569279152Z ===============================================
2025-12-20T10:22:11.569281072Z 
2025-12-20T10:22:11.569282792Z 📍 ERROR LOCATION:
2025-12-20T10:22:11.569284812Z   Request URL: https://graph.facebook.com/v18.0/act_245628241931442/ads
2025-12-20T10:22:11.569286652Z   Request Method: post
2025-12-20T10:22:11.569298633Z   HTTP Status: 500
2025-12-20T10:22:11.569301453Z 
2025-12-20T10:22:11.569304353Z 🔴 FACEBOOK ERROR DETAILS:
2025-12-20T10:22:11.569307074Z   Error Code: 2
2025-12-20T10:22:11.569309884Z   Error Message: An unexpected error has occurred. Please retry your request later.
2025-12-20T10:22:11.569312694Z   Error Type: OAuthException
2025-12-20T10:22:11.569315214Z   Error Subcode: undefined
2025-12-20T10:22:11.569318274Z   Error User Title: undefined
2025-12-20T10:22:11.569331035Z   Error User Message: undefined
2025-12-20T10:22:11.569336316Z   Fbtrace ID: Ap7fmaX490L-aM5DHQpGVTg
2025-12-20T10:22:11.569350257Z 
2025-12-20T10:22:11.569353737Z 📤 REQUEST DATA THAT FAILED:
2025-12-20T10:22:11.569363768Z {
2025-12-20T10:22:11.569367438Z   "name": "[Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main",
2025-12-20T10:22:11.569370258Z   "adset_id": "120239028544970588",
2025-12-20T10:22:11.569373888Z   "creative": "{\"object_story_spec\":{\"page_id\":\"228304287042316\"},\"asset_feed_spec\":{\"bodies\":[{\"text\":\"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.\"},{\"text\":\"Primary Text 1\"},{\"text\":\"Primary Text 2\"},{\"text\":\"Primary Text 3\"}],\"titles\":[{\"text\":\"Test Campaign - Do Not Activate\"},{\"text\":\"Headline 1\"},{\"text\":\"Headline 2\"},{\"text\":\"Headline 3\"}],\"link_urls\":[{\"website_url\":\"https://example.com\",\"display_url\":\"example.com\"}],\"call_to_action_types\":[\"LEARN_MORE\"],\"ad_formats\":[\"SINGLE_IMAGE\"],\"descriptions\":[{\"text\":\"Automated test campaign\"}],\"images\":[{\"hash\":\"37075ed6837a5619db1ecd172e6bd97f\"}]}}",
2025-12-20T10:22:11.569379389Z   "status": "ACTIVE",
2025-12-20T10:22:11.569382499Z   "access_token": "[HIDDEN]"
2025-12-20T10:22:11.569385509Z }
2025-12-20T10:22:11.569388059Z 
2025-12-20T10:22:11.56939449Z ===============================================
2025-12-20T10:22:11.56939713Z 
2025-12-20T10:22:11.569407791Z ⚠️ Transient error on ad creation, retrying with backoff...
2025-12-20T10:22:11.569413221Z 🔄 Attempt 1/3...
2025-12-20T10:22:11.569449663Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:11.569495437Z 📋 Ad Data Received: {
2025-12-20T10:22:11.569498947Z   mediaType: 'single_image',
2025-12-20T10:22:11.569501947Z   displayLink: 'example.com',
2025-12-20T10:22:11.569504927Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:11.569507817Z   url: 'https://example.com',
2025-12-20T10:22:11.569510687Z   dynamicTextEnabled: true,
2025-12-20T10:22:11.569513858Z   primaryTextVariations: 3,
2025-12-20T10:22:11.569517228Z   headlineVariations: 3
2025-12-20T10:22:11.569519868Z }
2025-12-20T10:22:11.569526629Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:11.569529479Z   enabled: true,
2025-12-20T10:22:11.569532259Z   hasPrimaryTexts: true,
2025-12-20T10:22:11.569534709Z   hasHeadlines: true,
2025-12-20T10:22:11.569537119Z   willUseAssetFeedSpec: true
2025-12-20T10:22:11.569539809Z }
2025-12-20T10:22:11.56954618Z 🎨 Creating ad with Dynamic Creative / Text Variations
2025-12-20T10:22:11.56954931Z   Has text variations: true
2025-12-20T10:22:11.56955196Z   Has dynamic media: undefined
2025-12-20T10:22:11.569586493Z   📝 Primary Text Options: 4 (main + variations, deduplicated)
2025-12-20T10:22:11.569596123Z   📰 Headline Options: 4 (main + variations, deduplicated)
2025-12-20T10:22:11.569602224Z ✅ Asset feed spec configured for dynamic creative
2025-12-20T10:22:11.569606594Z   Bodies: 4
2025-12-20T10:22:11.569609324Z   Titles: 4
2025-12-20T10:22:11.569628455Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:11.569663148Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:11.569665828Z   Ad Set ID: 120239028544970588
2025-12-20T10:22:11.569667988Z   Ad Name: [Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:11.569669728Z   Using Dynamic Creative: true
2025-12-20T10:22:11.569682779Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316"},"asset_feed_spec":{"bodies":[{"text":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget."},{"text":"Primary Text 1"},{"text":"Primary Text 2"},{"text":"Primary Text 3"}],"titles":[{"text":"Test Campaign - Do Not Activate"},{"text":"Headline 1"},{"text":"Headline 2"},{"text":"Headline 3"}],"link_urls":[{"website_url":"https://example.com","display_url":"example.com"}],"call_to_action_ty...
2025-12-20T10:22:11.813413355Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:11.813435597Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:11.813438297Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:11.813441227Z   "id": "855425937340039"
2025-12-20T10:22:11.813443377Z }
2025-12-20T10:22:11.813445927Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:11.813451808Z ✅ [uploadVideo] Video ID: 855425937340039
2025-12-20T10:22:11.813454078Z   ✅ Standard upload successful!
2025-12-20T10:22:11.816257989Z   💾 Cached video for future use
2025-12-20T10:22:11.816367966Z   ✅ Video uploaded with ID: 855425937340039
2025-12-20T10:22:11.940075414Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:11.940203973Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:11.940209413Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:11.940211973Z   "id": "3048264425379969"
2025-12-20T10:22:11.940214133Z }
2025-12-20T10:22:11.940216324Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:11.940218114Z ✅ [uploadVideo] Video ID: 3048264425379969
2025-12-20T10:22:11.940220954Z   ✅ Standard upload successful!
2025-12-20T10:22:11.942063709Z   💾 Cached video for future use
2025-12-20T10:22:11.942197718Z   ✅ Video uploaded with ID: 3048264425379969
2025-12-20T10:22:12.340619616Z   ❌ API Error Details: {
2025-12-20T10:22:12.340641347Z   "status": 500,
2025-12-20T10:22:12.340644477Z   "statusText": "Internal Server Error",
2025-12-20T10:22:12.340646368Z   "code": 2,
2025-12-20T10:22:12.340648528Z   "message": "An unexpected error has occurred. Please retry your request later.",
2025-12-20T10:22:12.340650518Z   "type": "OAuthException",
2025-12-20T10:22:12.340655268Z   "fbtrace_id": "AUMJYCKgGYwT1j8_GC8g3Yx",
2025-12-20T10:22:12.340657738Z   "is_transient": true,
2025-12-20T10:22:12.340660249Z   "url": "https://graph.facebook.com/v18.0/act_245628241931442/ads",
2025-12-20T10:22:12.340662379Z   "method": "post"
2025-12-20T10:22:12.340664099Z }
2025-12-20T10:22:12.340665879Z   🔍 FULL Facebook Error Object: {
2025-12-20T10:22:12.340667649Z   "message": "An unexpected error has occurred. Please retry your request later.",
2025-12-20T10:22:12.340669399Z   "type": "OAuthException",
2025-12-20T10:22:12.340671339Z   "is_transient": true,
2025-12-20T10:22:12.340673029Z   "code": 2,
2025-12-20T10:22:12.34068996Z   "fbtrace_id": "AUMJYCKgGYwT1j8_GC8g3Yx"
2025-12-20T10:22:12.340693281Z }
2025-12-20T10:22:12.340710012Z   🔍 Rate Limit Detection: {
2025-12-20T10:22:12.340713362Z   isRateLimit: false,
2025-12-20T10:22:12.340713592Z 
2025-12-20T10:22:12.340716692Z   status: 500,
2025-12-20T10:22:12.340719273Z   errorCode: 2,
2025-12-20T10:22:12.340721713Z   errorSubcode: undefined,
2025-12-20T10:22:12.340724193Z   consecutiveErrors: 0
2025-12-20T10:22:12.340730773Z ===============================================
2025-12-20T10:22:12.340733554Z 🚨 FACEBOOK API ERROR OCCURRED 🚨
2025-12-20T10:22:12.340735914Z ===============================================
2025-12-20T10:22:12.340738004Z 
2025-12-20T10:22:12.340740804Z 📍 ERROR LOCATION:
2025-12-20T10:22:12.340743974Z   Request URL: https://graph.facebook.com/v18.0/act_245628241931442/ads
2025-12-20T10:22:12.340746915Z   Request Method: post
2025-12-20T10:22:12.340749775Z   HTTP Status: 500
2025-12-20T10:22:12.340752615Z 
2025-12-20T10:22:12.340755535Z 🔴 FACEBOOK ERROR DETAILS:
2025-12-20T10:22:12.340757405Z   Error Code: 2
2025-12-20T10:22:12.340761865Z }
2025-12-20T10:22:12.340787897Z   Error Message: An unexpected error has occurred. Please retry your request later.
2025-12-20T10:22:12.340796608Z   Error Type: OAuthException
2025-12-20T10:22:12.340799888Z   Error Subcode: undefined
2025-12-20T10:22:12.340802748Z   Error User Title: undefined
2025-12-20T10:22:12.340840401Z   Error User Message: undefined
2025-12-20T10:22:12.340941588Z   Fbtrace ID: AUMJYCKgGYwT1j8_GC8g3Yx
2025-12-20T10:22:12.340948218Z 
2025-12-20T10:22:12.340951918Z 📤 REQUEST DATA THAT FAILED:
2025-12-20T10:22:12.340954818Z {
2025-12-20T10:22:12.340957579Z   "name": "[Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main",
2025-12-20T10:22:12.340960089Z   "adset_id": "120239028544970588",
2025-12-20T10:22:12.340963339Z   "creative": "{\"object_story_spec\":{\"page_id\":\"228304287042316\"},\"asset_feed_spec\":{\"bodies\":[{\"text\":\"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.\"},{\"text\":\"Primary Text 1\"},{\"text\":\"Primary Text 2\"},{\"text\":\"Primary Text 3\"}],\"titles\":[{\"text\":\"Test Campaign - Do Not Activate\"},{\"text\":\"Headline 1\"},{\"text\":\"Headline 2\"},{\"text\":\"Headline 3\"}],\"link_urls\":[{\"website_url\":\"https://example.com\",\"display_url\":\"example.com\"}],\"call_to_action_types\":[\"LEARN_MORE\"],\"ad_formats\":[\"SINGLE_IMAGE\"],\"descriptions\":[{\"text\":\"Automated test campaign\"}],\"images\":[{\"hash\":\"37075ed6837a5619db1ecd172e6bd97f\"}]}}",
2025-12-20T10:22:12.340966159Z   "status": "ACTIVE",
2025-12-20T10:22:12.34096857Z   "access_token": "[HIDDEN]"
2025-12-20T10:22:12.34097107Z }
2025-12-20T10:22:12.34097324Z 
2025-12-20T10:22:12.3409756Z ===============================================
2025-12-20T10:22:12.34097781Z 
2025-12-20T10:22:12.340991261Z ⏳ Retryable error (code 2). Waiting 2000ms before retry...
2025-12-20T10:22:12.86890721Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:12.868933241Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:12.868939222Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:12.868943422Z   "id": "874818111753018"
2025-12-20T10:22:12.868947402Z }
2025-12-20T10:22:12.868950893Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:12.868954213Z ✅ [uploadVideo] Video ID: 874818111753018
2025-12-20T10:22:12.868957543Z   ✅ Standard upload successful!
2025-12-20T10:22:12.871336644Z   💾 Cached video for future use
2025-12-20T10:22:12.871487175Z ✅ Video uploaded successfully with ID: 874818111753018
2025-12-20T10:22:12.871504296Z ⏳ Waiting for video to be processed by Facebook...
2025-12-20T10:22:12.871732231Z ⏳ Checking video 874818111753018 processing status...
2025-12-20T10:22:13.10032683Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:13.100351692Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:13.100355602Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:13.100360232Z   "id": "1373689517829364"
2025-12-20T10:22:13.100363023Z }
2025-12-20T10:22:13.100365883Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:13.100372593Z ✅ [uploadVideo] Video ID: 1373689517829364
2025-12-20T10:22:13.100375833Z   ✅ Standard upload successful!
2025-12-20T10:22:13.103599852Z   💾 Cached video for future use
2025-12-20T10:22:13.103734191Z ✅ Video uploaded successfully with ID: 1373689517829364
2025-12-20T10:22:13.103740352Z ⏳ Waiting for video to be processed by Facebook...
2025-12-20T10:22:13.103744302Z ⏳ Checking video 1373689517829364 processing status...
2025-12-20T10:22:13.12345045Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"874818111753018"}
2025-12-20T10:22:13.123467001Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:13.123471161Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:13.123473681Z     Processing phase status: in_progress
2025-12-20T10:22:13.123477212Z     Video status: processing
2025-12-20T10:22:13.123480262Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:13.248298085Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:13.248323997Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:13.248326867Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:13.248329667Z   "id": "852711567613569"
2025-12-20T10:22:13.248331828Z }
2025-12-20T10:22:13.248339898Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:13.248342278Z ✅ [uploadVideo] Video ID: 852711567613569
2025-12-20T10:22:13.248344488Z   ✅ Standard upload successful!
2025-12-20T10:22:13.249415901Z   💾 Cached video for future use
2025-12-20T10:22:13.24954349Z   ✅ Video uploaded with ID: 852711567613569
2025-12-20T10:22:13.249658547Z   ⏳ Checking processing status for 3 videos...
2025-12-20T10:22:13.249826329Z ⏳ Checking video 855425937340039 processing status...
2025-12-20T10:22:13.250364975Z ⏳ Checking video 852711567613569 processing status...
2025-12-20T10:22:13.250642234Z ⏳ Checking video 3048264425379969 processing status...
2025-12-20T10:22:13.444312612Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"1373689517829364"}
2025-12-20T10:22:13.444341494Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:13.444345324Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:13.444348364Z     Processing phase status: in_progress
2025-12-20T10:22:13.444351325Z     Video status: processing
2025-12-20T10:22:13.444354365Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:13.446218991Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"855425937340039"}
2025-12-20T10:22:13.446246593Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:13.446251434Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:13.446254934Z     Processing phase status: in_progress
2025-12-20T10:22:13.446259154Z     Video status: processing
2025-12-20T10:22:13.446275855Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:13.485769647Z 📊 API call tracked: CampaignGlobal (Main OAuth) (31/200 calls, 16%)
2025-12-20T10:22:13.485790578Z ✅ Ad created successfully!
2025-12-20T10:22:13.485881834Z   Ad ID: 120239028555930588
2025-12-20T10:22:13.485899675Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:13.488534854Z 🚀 ========================================
2025-12-20T10:22:13.488546575Z 🚀 OPTIMIZED BATCH AD SET DUPLICATION
2025-12-20T10:22:13.488552675Z 🚀 ========================================
2025-12-20T10:22:13.488556216Z 📊 Creating 9 duplicates of ad set 120239028546170588
2025-12-20T10:22:13.488558856Z 📊 Campaign: 120239028542590588
2025-12-20T10:22:13.488562506Z 📊 Creative Type: Regular Ad (post_id)
2025-12-20T10:22:13.488565536Z 📊 Media Hashes: Provided for asset_feed_spec
2025-12-20T10:22:13.488568356Z 📊 Total operations: 18 (9 ad sets + 9 ads)
2025-12-20T10:22:13.488571146Z 
2025-12-20T10:22:13.488589458Z 📋 Step 1: Fetching campaign and ad set data...
2025-12-20T10:22:13.516378654Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"3048264425379969"}
2025-12-20T10:22:13.516397326Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:13.516401126Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:13.516408327Z     Processing phase status: in_progress
2025-12-20T10:22:13.516411547Z     Video status: processing
2025-12-20T10:22:13.516414847Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:13.580437943Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"852711567613569"}
2025-12-20T10:22:13.580458515Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:13.580462795Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:13.580465595Z     Processing phase status: in_progress
2025-12-20T10:22:13.580468535Z     Video status: processing
2025-12-20T10:22:13.580477486Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:13.738306951Z 📊 API call tracked: CampaignGlobal (Main OAuth) (32/200 calls, 16%)
2025-12-20T10:22:13.740040978Z ✅ Ad created successfully!
2025-12-20T10:22:13.741880533Z   Ad ID: 120239028555880588
2025-12-20T10:22:13.741893554Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:13.741896954Z [TEST sfa-image-100-1766226124468] Campaign created: 120239028542560588
2025-12-20T10:22:13.741912705Z [TEST sfa-image-100-1766226124468] Initial Ad Set: 120239028544950588
2025-12-20T10:22:13.741916135Z [TEST sfa-image-100-1766226124468] Initial Ad: 120239028555880588
2025-12-20T10:22:13.741918645Z [TEST sfa-image-100-1766226124468] Duplicating 99 additional ad sets...
2025-12-20T10:22:13.741921666Z 🚀 ========================================
2025-12-20T10:22:13.741923996Z 🚀 OPTIMIZED BATCH AD SET DUPLICATION
2025-12-20T10:22:13.741926396Z 🚀 ========================================
2025-12-20T10:22:13.741928676Z 📊 Creating 99 duplicates of ad set 120239028544950588
2025-12-20T10:22:13.741930836Z 📊 Campaign: 120239028542560588
2025-12-20T10:22:13.741933077Z 📊 Creative Type: Regular Ad (post_id)
2025-12-20T10:22:13.741935557Z 📊 Media Hashes: Provided for asset_feed_spec
2025-12-20T10:22:13.741937677Z 📊 Total operations: 198 (99 ad sets + 99 ads)
2025-12-20T10:22:13.741939627Z 
2025-12-20T10:22:13.741941847Z 📋 Step 1: Fetching campaign and ad set data...
2025-12-20T10:22:13.741944247Z ✅ Campaign data fetched
2025-12-20T10:22:13.741947298Z    Name: [Launcher] [TEST] 3 Campaigns × 10 AdSets - 2025-12-20T10-22-04 - Campaign 1
2025-12-20T10:22:13.741950128Z    CBO Enabled: Yes
2025-12-20T10:22:13.741952368Z    Campaign Budget: $500
2025-12-20T10:22:13.747325783Z 📊 API call tracked: CampaignGlobal (Main OAuth) (33/200 calls, 17%)
2025-12-20T10:22:13.747382156Z ✅ Ad created successfully!
2025-12-20T10:22:13.747471883Z   Ad ID: 120239028556430588
2025-12-20T10:22:13.747479503Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:13.747605112Z [TEST sfa-image-25-1766226124461] Campaign created: 120239028542650588
2025-12-20T10:22:13.747686187Z [TEST sfa-image-25-1766226124461] Initial Ad Set: 120239028549020588
2025-12-20T10:22:13.747756042Z [TEST sfa-image-25-1766226124461] Initial Ad: 120239028556430588
2025-12-20T10:22:13.747777053Z [TEST sfa-image-25-1766226124461] Duplicating 24 additional ad sets...
2025-12-20T10:22:13.747952835Z 🚀 ========================================
2025-12-20T10:22:13.747963736Z 🚀 OPTIMIZED BATCH AD SET DUPLICATION
2025-12-20T10:22:13.747968776Z 🚀 ========================================
2025-12-20T10:22:13.748045292Z 📊 Creating 24 duplicates of ad set 120239028549020588
2025-12-20T10:22:13.748052852Z 📊 Campaign: 120239028542650588
2025-12-20T10:22:13.748091555Z 📊 Creative Type: Regular Ad (post_id)
2025-12-20T10:22:13.748115936Z 📊 Media Hashes: Provided for asset_feed_spec
2025-12-20T10:22:13.74816636Z 📊 Total operations: 48 (24 ad sets + 24 ads)
2025-12-20T10:22:13.748205623Z 
2025-12-20T10:22:13.748209753Z 📋 Step 1: Fetching campaign and ad set data...
2025-12-20T10:22:13.798240869Z 📊 API call tracked: CampaignGlobal (Main OAuth) (34/200 calls, 17%)
2025-12-20T10:22:13.798260941Z ✅ Ad created successfully!
2025-12-20T10:22:13.798291112Z   Ad ID: 120239028556700588
2025-12-20T10:22:13.798367908Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:13.799538897Z [TEST edge-minimum-1766226124473] Campaign created: 120239028543770588
2025-12-20T10:22:13.799613992Z [TEST edge-minimum-1766226124473] Initial Ad Set: 120239028548520588
2025-12-20T10:22:13.799665996Z [TEST edge-minimum-1766226124473] Initial Ad: 120239028556700588
2025-12-20T10:22:13.80016695Z [TEST edge-minimum-1766226124473] Verifying 1 campaign(s)...
2025-12-20T10:22:13.813318353Z 📊 API call tracked: CampaignGlobal (Main OAuth) (35/200 calls, 18%)
2025-12-20T10:22:13.813350255Z ✅ Ad created successfully!
2025-12-20T10:22:13.813353485Z   Ad ID: 120239028556730588
2025-12-20T10:22:13.813474153Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:13.813480114Z [TEST edge-spending-limits-1766226124475] Campaign created: 120239028542430588
2025-12-20T10:22:13.813482884Z [TEST edge-spending-limits-1766226124475] Initial Ad Set: 120239028547370588
2025-12-20T10:22:13.813485424Z [TEST edge-spending-limits-1766226124475] Initial Ad: 120239028556730588
2025-12-20T10:22:13.813487944Z [TEST edge-spending-limits-1766226124475] Duplicating 9 additional ad sets...
2025-12-20T10:22:13.813491704Z 🚀 ========================================
2025-12-20T10:22:13.813494295Z 🚀 OPTIMIZED BATCH AD SET DUPLICATION
2025-12-20T10:22:13.813496855Z 🚀 ========================================
2025-12-20T10:22:13.813499815Z 📊 Creating 9 duplicates of ad set 120239028547370588
2025-12-20T10:22:13.813502455Z 📊 Campaign: 120239028542430588
2025-12-20T10:22:13.813504945Z 📊 Creative Type: Regular Ad (post_id)
2025-12-20T10:22:13.813508096Z 📊 Media Hashes: Provided for asset_feed_spec
2025-12-20T10:22:13.813510866Z 📊 Total operations: 18 (9 ad sets + 9 ads)
2025-12-20T10:22:13.813513576Z 
2025-12-20T10:22:13.813516206Z 📋 Step 1: Fetching campaign and ad set data...
2025-12-20T10:22:13.912952567Z 📊 API call tracked: CampaignGlobal (Main OAuth) (36/200 calls, 18%)
2025-12-20T10:22:13.912973038Z ✅ Ad created successfully!
2025-12-20T10:22:13.913033932Z   Ad ID: 120239028556350588
2025-12-20T10:22:13.913047643Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:13.913051363Z [TEST sfa-image-10-1766226124459] Campaign created: 120239028542480588
2025-12-20T10:22:13.913094236Z [TEST sfa-image-10-1766226124459] Initial Ad Set: 120239028546720588
2025-12-20T10:22:13.913101697Z [TEST sfa-image-10-1766226124459] Initial Ad: 120239028556350588
2025-12-20T10:22:13.91314949Z [TEST sfa-image-10-1766226124459] Duplicating 9 additional ad sets...
2025-12-20T10:22:13.913160161Z 🚀 ========================================
2025-12-20T10:22:13.913163341Z 🚀 OPTIMIZED BATCH AD SET DUPLICATION
2025-12-20T10:22:13.913166501Z 🚀 ========================================
2025-12-20T10:22:13.913186292Z 📊 Creating 9 duplicates of ad set 120239028546720588
2025-12-20T10:22:13.913189633Z 📊 Campaign: 120239028542480588
2025-12-20T10:22:13.913195653Z 📊 Creative Type: Regular Ad (post_id)
2025-12-20T10:22:13.913198733Z 📊 Media Hashes: Provided for asset_feed_spec
2025-12-20T10:22:13.913204944Z 📊 Total operations: 18 (9 ad sets + 9 ads)
2025-12-20T10:22:13.913207524Z 
2025-12-20T10:22:13.913210214Z 📋 Step 1: Fetching campaign and ad set data...
2025-12-20T10:22:13.953647159Z ✅ Campaign data fetched
2025-12-20T10:22:13.95366388Z    Name: [Launcher] [TEST] 1-100-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:13.953666991Z    CBO Enabled: Yes
2025-12-20T10:22:13.953670011Z    Campaign Budget: $500
2025-12-20T10:22:14.004397035Z 
2025-12-20T10:22:14.004420536Z ✅ Original ad set data fetched
2025-12-20T10:22:14.004425266Z    Name: [Launcher] [TEST] 3 Campaigns × 10 AdSets - 2025-12-20T10-22-04 - Campaign 1 - AdSet Main
2025-12-20T10:22:14.004428806Z    Ad Set Budget: None (using campaign budget - CBO)
2025-12-20T10:22:14.004432357Z    Optimization Goal: LINK_CLICKS
2025-12-20T10:22:14.004435607Z    Billing Event: IMPRESSIONS
2025-12-20T10:22:14.004438447Z 
2025-12-20T10:22:14.004441738Z 🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...
2025-12-20T10:22:14.008979015Z 📊 API call tracked: CampaignGlobal (Main OAuth) (37/200 calls, 19%)
2025-12-20T10:22:14.008990936Z ✅ Ad created successfully!
2025-12-20T10:22:14.009006677Z   Ad ID: 120239028555910588
2025-12-20T10:22:14.009015898Z ✅ Ad creation request sent with editorName: none
2025-12-20T10:22:14.009025759Z [TEST s150-image-50-1766226124437] Campaign created: 120239028542800588
2025-12-20T10:22:14.009028489Z [TEST s150-image-50-1766226124437] Initial Ad Set: 120239028549730588
2025-12-20T10:22:14.009034379Z [TEST s150-image-50-1766226124437] Initial Ad: 120239028555910588
2025-12-20T10:22:14.009089123Z [TEST s150-image-50-1766226124437] Duplicating 49 additional ad sets...
2025-12-20T10:22:14.009160718Z 🚀 ========================================
2025-12-20T10:22:14.009165448Z 🚀 OPTIMIZED BATCH AD SET DUPLICATION
2025-12-20T10:22:14.009168768Z 🚀 ========================================
2025-12-20T10:22:14.009172069Z 📊 Creating 49 duplicates of ad set 120239028549730588
2025-12-20T10:22:14.009174619Z 📊 Campaign: 120239028542800588
2025-12-20T10:22:14.009177449Z 📊 Creative Type: Regular Ad (post_id)
2025-12-20T10:22:14.009180239Z 📊 Media Hashes: Provided for asset_feed_spec
2025-12-20T10:22:14.009182929Z 📊 Total operations: 98 (49 ad sets + 49 ads)
2025-12-20T10:22:14.00919421Z 
2025-12-20T10:22:14.0091972Z 📋 Step 1: Fetching campaign and ad set data...
2025-12-20T10:22:14.029985792Z ✅ Campaign data fetched
2025-12-20T10:22:14.030002703Z    Name: [Launcher] [TEST] With Spending Limits - 2025-12-20T10-22-04
2025-12-20T10:22:14.030007353Z    CBO Enabled: Yes
2025-12-20T10:22:14.030010853Z    Campaign Budget: $500
2025-12-20T10:22:14.040239348Z ✅ Campaign data fetched
2025-12-20T10:22:14.040255179Z    Name: [Launcher] [TEST] 1-25-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:14.040258709Z    CBO Enabled: Yes
2025-12-20T10:22:14.040261409Z    Campaign Budget: $500
2025-12-20T10:22:14.169335081Z Failed to get campaign structure: Request failed with status code 400
2025-12-20T10:22:14.169369404Z   ❌ No cache available for 120239028543770588, returning 0 structure
2025-12-20T10:22:14.169391945Z [TEST edge-minimum-1766226124473] Verification: 0/1 ad sets, 0/1 ads
2025-12-20T10:22:14.20849359Z ✅ Campaign data fetched
2025-12-20T10:22:14.208509211Z    Name: [Launcher] [TEST] 1-10-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:14.208512701Z    CBO Enabled: Yes
2025-12-20T10:22:14.208515081Z    Campaign Budget: $500
2025-12-20T10:22:14.23087918Z ✅ Campaign data fetched
2025-12-20T10:22:14.230903001Z    Name: [Launcher] [TEST] 1-50-1 Single Image - 2025-12-20T10-22-04
2025-12-20T10:22:14.230906772Z    CBO Enabled: Yes
2025-12-20T10:22:14.230909762Z    Campaign Budget: $500
2025-12-20T10:22:14.279441296Z 
2025-12-20T10:22:14.279465618Z ✅ Original ad set data fetched
2025-12-20T10:22:14.279470338Z    Name: [Launcher] [TEST] With Spending Limits - 2025-12-20T10-22-04 - AdSet Main
2025-12-20T10:22:14.279474009Z    Ad Set Budget: None (using campaign budget - CBO)
2025-12-20T10:22:14.279527182Z    Spending Limits:
2025-12-20T10:22:14.279531353Z      - Min: $100
2025-12-20T10:22:14.279534083Z      - Max: $500
2025-12-20T10:22:14.279537383Z    Optimization Goal: LINK_CLICKS
2025-12-20T10:22:14.279540483Z    Billing Event: IMPRESSIONS
2025-12-20T10:22:14.279542903Z 
2025-12-20T10:22:14.279546494Z 🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...
2025-12-20T10:22:14.315340424Z 
2025-12-20T10:22:14.315364435Z ✅ Original ad set data fetched
2025-12-20T10:22:14.315369775Z    Name: [Launcher] [TEST] 1-25-1 Single Image - 2025-12-20T10-22-04 - AdSet Main
2025-12-20T10:22:14.315426989Z    Ad Set Budget: None (using campaign budget - CBO)
2025-12-20T10:22:14.31543168Z    Optimization Goal: LINK_CLICKS
2025-12-20T10:22:14.315448271Z    Billing Event: IMPRESSIONS
2025-12-20T10:22:14.315450881Z 
2025-12-20T10:22:14.315454691Z 🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...
2025-12-20T10:22:14.320058154Z 
2025-12-20T10:22:14.320076455Z ✅ Original ad set data fetched
2025-12-20T10:22:14.320080295Z    Name: [Launcher] [TEST] 1-100-1 Single Image - 2025-12-20T10-22-04 - AdSet Main
2025-12-20T10:22:14.320083486Z    Ad Set Budget: None (using campaign budget - CBO)
2025-12-20T10:22:14.320086656Z    Optimization Goal: LINK_CLICKS
2025-12-20T10:22:14.320089376Z    Billing Event: IMPRESSIONS
2025-12-20T10:22:14.320174642Z 
2025-12-20T10:22:14.320186613Z 🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...
2025-12-20T10:22:14.333327954Z      ⚠️ Rate limited - skipping pre-cleanup
2025-12-20T10:22:14.333345546Z 
2025-12-20T10:22:14.333349646Z 📊 Light payload - using optimized batch size: 5 pairs per batch
2025-12-20T10:22:14.333353176Z 
2025-12-20T10:22:14.333356907Z 🔄 Step 2: Executing OPTIMIZED BATCH creation...
2025-12-20T10:22:14.333359807Z 📦 Total pairs to create: 9
2025-12-20T10:22:14.333363167Z 📊 Pairs per batch: 5
2025-12-20T10:22:14.333366337Z 📊 Total batches: 2
2025-12-20T10:22:14.333369057Z 📊 API calls: 2 (vs 9 with atomic pairs)
2025-12-20T10:22:14.333372137Z 💰 API call reduction: 78%
2025-12-20T10:22:14.333374598Z 
2025-12-20T10:22:14.333377818Z ⏳ Waiting 3 seconds before first batch to reduce transient errors...
2025-12-20T10:22:14.341681812Z 🔄 Attempt 2/3...
2025-12-20T10:22:14.341744716Z Creating Ad with App ID from env: 735375959485927
2025-12-20T10:22:14.342044216Z 📋 Ad Data Received: {
2025-12-20T10:22:14.342057437Z   mediaType: 'single_image',
2025-12-20T10:22:14.342060478Z   displayLink: 'example.com',
2025-12-20T10:22:14.342064068Z   headline: 'Test Campaign - Do Not Activate',
2025-12-20T10:22:14.342066788Z   url: 'https://example.com',
2025-12-20T10:22:14.342069988Z   dynamicTextEnabled: true,
2025-12-20T10:22:14.342072858Z   primaryTextVariations: 3,
2025-12-20T10:22:14.342076188Z   headlineVariations: 3
2025-12-20T10:22:14.342078649Z }
2025-12-20T10:22:14.342086699Z 🎨 Dynamic Creative Check: {
2025-12-20T10:22:14.342089449Z   enabled: true,
2025-12-20T10:22:14.342092089Z   hasPrimaryTexts: true,
2025-12-20T10:22:14.34209456Z   hasHeadlines: true,
2025-12-20T10:22:14.34209718Z   willUseAssetFeedSpec: true
2025-12-20T10:22:14.34209986Z }
2025-12-20T10:22:14.342286893Z 🎨 Creating ad with Dynamic Creative / Text Variations
2025-12-20T10:22:14.342297194Z   Has text variations: true
2025-12-20T10:22:14.342299924Z   Has dynamic media: undefined
2025-12-20T10:22:14.342373929Z   📝 Primary Text Options: 4 (main + variations, deduplicated)
2025-12-20T10:22:14.342494547Z   📰 Headline Options: 4 (main + variations, deduplicated)
2025-12-20T10:22:14.342570152Z ✅ Asset feed spec configured for dynamic creative
2025-12-20T10:22:14.342648167Z   Bodies: 4
2025-12-20T10:22:14.34269254Z   Titles: 4
2025-12-20T10:22:14.342768415Z ℹ️ Using custom ad name as-is: [Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:14.34313353Z 📤 Posting ad to Facebook API...
2025-12-20T10:22:14.343144791Z   Ad Set ID: 120239028544970588
2025-12-20T10:22:14.343148741Z   Ad Name: [Launcher] [TEST] With Text Variations - 2025-12-20T10-22-04 - Ad Main
2025-12-20T10:22:14.343151901Z   Using Dynamic Creative: true
2025-12-20T10:22:14.343157292Z 📦 Creative JSON preview: {"object_story_spec":{"page_id":"228304287042316"},"asset_feed_spec":{"bodies":[{"text":"This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget."},{"text":"Primary Text 1"},{"text":"Primary Text 2"},{"text":"Primary Text 3"}],"titles":[{"text":"Test Campaign - Do Not Activate"},{"text":"Headline 1"},{"text":"Headline 2"},{"text":"Headline 3"}],"link_urls":[{"website_url":"https://example.com","display_url":"example.com"}],"call_to_action_ty...
2025-12-20T10:22:14.465750874Z 
2025-12-20T10:22:14.465783006Z ✅ Original ad set data fetched
2025-12-20T10:22:14.465787727Z    Name: [Launcher] [TEST] 1-50-1 Single Image - 2025-12-20T10-22-04 - AdSet Main
2025-12-20T10:22:14.465790957Z    Ad Set Budget: None (using campaign budget - CBO)
2025-12-20T10:22:14.465794177Z    Optimization Goal: LINK_CLICKS
2025-12-20T10:22:14.465796867Z    Billing Event: IMPRESSIONS
2025-12-20T10:22:14.465799448Z 
2025-12-20T10:22:14.465802978Z 🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...
2025-12-20T10:22:14.486922572Z      ⚠️ Rate limited - skipping pre-cleanup
2025-12-20T10:22:14.486947373Z 
2025-12-20T10:22:14.486951574Z 📊 Light payload - using optimized batch size: 5 pairs per batch
2025-12-20T10:22:14.486954214Z 
2025-12-20T10:22:14.486957694Z 🔄 Step 2: Executing OPTIMIZED BATCH creation...
2025-12-20T10:22:14.486961064Z 📦 Total pairs to create: 9
2025-12-20T10:22:14.486964544Z 📊 Pairs per batch: 5
2025-12-20T10:22:14.486967655Z 📊 Total batches: 2
2025-12-20T10:22:14.486970285Z 📊 API calls: 2 (vs 9 with atomic pairs)
2025-12-20T10:22:14.486972575Z 💰 API call reduction: 78%
2025-12-20T10:22:14.486974655Z 
2025-12-20T10:22:14.486977185Z ⏳ Waiting 3 seconds before first batch to reduce transient errors...
2025-12-20T10:22:14.566323242Z 
2025-12-20T10:22:14.566353074Z ✅ Original ad set data fetched
2025-12-20T10:22:14.566356884Z    Name: [Launcher] [TEST] 1-10-1 Single Image - 2025-12-20T10-22-04 - AdSet Main
2025-12-20T10:22:14.566360054Z    Ad Set Budget: None (using campaign budget - CBO)
2025-12-20T10:22:14.566364195Z    Optimization Goal: LINK_CLICKS
2025-12-20T10:22:14.566368295Z    Billing Event: IMPRESSIONS
2025-12-20T10:22:14.566371375Z 
2025-12-20T10:22:14.566375315Z 🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...
2025-12-20T10:22:14.660517537Z      ⚠️ Rate limited - skipping pre-cleanup
2025-12-20T10:22:14.660551869Z 
2025-12-20T10:22:14.660558109Z 📊 Light payload - using optimized batch size: 5 pairs per batch
2025-12-20T10:22:14.660560459Z 
2025-12-20T10:22:14.6605636Z 🔄 Step 2: Executing OPTIMIZED BATCH creation...
2025-12-20T10:22:14.66056698Z 📦 Total pairs to create: 99
2025-12-20T10:22:14.66057138Z 📊 Pairs per batch: 5
2025-12-20T10:22:14.66057413Z 📊 Total batches: 20
2025-12-20T10:22:14.66057675Z 📊 API calls: 20 (vs 99 with atomic pairs)
2025-12-20T10:22:14.660579351Z 💰 API call reduction: 80%
2025-12-20T10:22:14.660581361Z 
2025-12-20T10:22:14.660583711Z ⏳ Waiting 3 seconds before first batch to reduce transient errors...
2025-12-20T10:22:14.709716606Z      ⚠️ Rate limited - skipping pre-cleanup
2025-12-20T10:22:14.709739728Z 
2025-12-20T10:22:14.709743818Z 📊 Light payload - using optimized batch size: 5 pairs per batch
2025-12-20T10:22:14.709746379Z 
2025-12-20T10:22:14.709749419Z 🔄 Step 2: Executing OPTIMIZED BATCH creation...
2025-12-20T10:22:14.709752449Z 📦 Total pairs to create: 49
2025-12-20T10:22:14.709755109Z 📊 Pairs per batch: 5
2025-12-20T10:22:14.709757409Z 📊 Total batches: 10
2025-12-20T10:22:14.709759729Z 📊 API calls: 10 (vs 49 with atomic pairs)
2025-12-20T10:22:14.70977707Z 💰 API call reduction: 80%
2025-12-20T10:22:14.709779381Z 
2025-12-20T10:22:14.709781731Z ⏳ Waiting 3 seconds before first batch to reduce transient errors...
2025-12-20T10:22:14.752971673Z      ⚠️ Rate limited - skipping pre-cleanup
2025-12-20T10:22:14.752998685Z 
2025-12-20T10:22:14.753001525Z 📊 Light payload - using optimized batch size: 5 pairs per batch
2025-12-20T10:22:14.753003225Z 
2025-12-20T10:22:14.753006075Z 🔄 Step 2: Executing OPTIMIZED BATCH creation...
2025-12-20T10:22:14.753008555Z 📦 Total pairs to create: 24
2025-12-20T10:22:14.753011105Z 📊 Pairs per batch: 5
2025-12-20T10:22:14.753012776Z 📊 Total batches: 5
2025-12-20T10:22:14.753014536Z 📊 API calls: 5 (vs 24 with atomic pairs)
2025-12-20T10:22:14.753016206Z 💰 API call reduction: 79%
2025-12-20T10:22:14.753017776Z 
2025-12-20T10:22:14.753019556Z ⏳ Waiting 3 seconds before first batch to reduce transient errors...
2025-12-20T10:22:14.827976535Z      ⚠️ Rate limited - skipping pre-cleanup
2025-12-20T10:22:14.828003267Z 
2025-12-20T10:22:14.828007127Z 📊 Light payload - using optimized batch size: 5 pairs per batch
2025-12-20T10:22:14.828009267Z 
2025-12-20T10:22:14.828012487Z 🔄 Step 2: Executing OPTIMIZED BATCH creation...
2025-12-20T10:22:14.828015397Z 📦 Total pairs to create: 9
2025-12-20T10:22:14.828018377Z 📊 Pairs per batch: 5
2025-12-20T10:22:14.828020678Z 📊 Total batches: 2
2025-12-20T10:22:14.828022888Z 📊 API calls: 2 (vs 9 with atomic pairs)
2025-12-20T10:22:14.828025158Z 💰 API call reduction: 78%
2025-12-20T10:22:14.828040679Z 
2025-12-20T10:22:14.828043219Z ⏳ Waiting 3 seconds before first batch to reduce transient errors...
2025-12-20T10:22:16.058761609Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:16.058792691Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:16.058796461Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:16.058799822Z   "id": "1330543135423041"
2025-12-20T10:22:16.058802992Z }
2025-12-20T10:22:16.058850775Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:16.058857515Z ✅ [uploadVideo] Video ID: 1330543135423041
2025-12-20T10:22:16.058860295Z   ✅ Standard upload successful!
2025-12-20T10:22:16.061301561Z   💾 Cached video for future use
2025-12-20T10:22:16.061488854Z   ✅ Video uploaded with ID: 1330543135423041
2025-12-20T10:22:16.144052059Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:16.144089801Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:16.144095022Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:16.144099222Z   "id": "1123892136310160"
2025-12-20T10:22:16.144102652Z }
2025-12-20T10:22:16.144105753Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:16.144115423Z ✅ [uploadVideo] Video ID: 1123892136310160
2025-12-20T10:22:16.144119094Z   ✅ Standard upload successful!
2025-12-20T10:22:16.145224478Z   💾 Cached video for future use
2025-12-20T10:22:16.145354427Z   ✅ Video uploaded with ID: 1123892136310160
2025-12-20T10:22:16.292892693Z 🎬 [uploadVideo] Response received from Facebook
2025-12-20T10:22:16.292929126Z 🎬 [uploadVideo] Response status: 200
2025-12-20T10:22:16.292935676Z 🎬 [uploadVideo] Response data: {
2025-12-20T10:22:16.292940246Z   "id": "831607769875362"
2025-12-20T10:22:16.292942827Z }
2025-12-20T10:22:16.292945327Z ✅ [uploadVideo] Video uploaded successfully!
2025-12-20T10:22:16.292954927Z ✅ [uploadVideo] Video ID: 831607769875362
2025-12-20T10:22:16.292959848Z   ✅ Standard upload successful!
2025-12-20T10:22:16.294055982Z   💾 Cached video for future use
2025-12-20T10:22:16.294226444Z   ✅ Video uploaded with ID: 831607769875362
2025-12-20T10:22:16.294230644Z   ⏳ Checking processing status for 2 videos...
2025-12-20T10:22:16.294245655Z ⏳ Checking video 1330543135423041 processing status...
2025-12-20T10:22:16.294934692Z ⏳ Checking video 831607769875362 processing status...
2025-12-20T10:22:16.349191225Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"874818111753018"}
2025-12-20T10:22:16.349214617Z   Attempt 2/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:16.349218087Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:16.349220377Z     Processing phase status: in_progress
2025-12-20T10:22:16.349223447Z     Video status: processing
2025-12-20T10:22:16.349226487Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:16.479391884Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"1330543135423041"}
2025-12-20T10:22:16.479417586Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:16.479421016Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:16.479423306Z     Processing phase status: in_progress
2025-12-20T10:22:16.479426386Z     Video status: processing
2025-12-20T10:22:16.479430257Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:16.523136944Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"831607769875362"}
2025-12-20T10:22:16.523162115Z   Attempt 1/10: Status = {"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}}
2025-12-20T10:22:16.523165866Z     Processing phase: {"status":"in_progress"}
2025-12-20T10:22:16.523168086Z     Processing phase status: in_progress
2025-12-20T10:22:16.523170916Z     Video status: processing
2025-12-20T10:22:16.523173546Z   ⏳ Video still processing, waiting 3s before retry...
2025-12-20T10:22:16.625869758Z   Response data: {"status":{"video_status":"processing","processing_progress":0,"uploading_phase":{"status":"complete"},"processing_phase":{"status":"in_progress"},"publishing_phase":{"status":"not_started"}},"id":"855425937340039"}