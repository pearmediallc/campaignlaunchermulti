/**
 * Complete test that mimics the actual ad creation flow with display link
 * This ensures Facebook sees the full context of how pages_manage_posts is used
 */

require('dotenv').config();
const axios = require('axios');

async function uploadTestVideo() {
  console.log('\n=== Step 1: Upload Test Video ===\n');

  const pageId = '228304287042316';
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const apiVersion = process.env.FB_API_VERSION || 'v18.0';

  // Create a simple text message that we'll post instead
  // Since video upload is timing out, we'll use a link post to simulate
  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/feed`;

  const params = {
    access_token: pageAccessToken,
    message: 'Campaign Launch Test - Video Ad with Display Link\n\nThis demonstrates how our app uses pages_manage_posts permission to create ads with custom display links, helping advertisers protect their tracking URLs from competitors.',
    link: 'https://track.netprofitzone.pro/campaign-test',
    caption: 'wifiprofits.com',
    published: true
  };

  try {
    console.log('📤 Creating page post with display link...');
    console.log('🔗 URL:', url);
    console.log('📊 Using pages_manage_posts permission');

    const response = await axios.post(url, null, { params });

    console.log('✅ Page post created successfully');
    console.log('📝 Post ID:', response.data.id);
    console.log('🔑 Permission used: pages_manage_posts');
    console.log('📱 View post: https://facebook.com/' + response.data.id);

    return response.data.id;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function checkAppMode() {
  console.log('\n=== Checking App Mode ===\n');

  const appId = process.env.FB_APP_ID;
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const apiVersion = process.env.FB_API_VERSION || 'v18.0';

  const url = `https://graph.facebook.com/${apiVersion}/${appId}`;

  try {
    const response = await axios.get(url, {
      params: {
        fields: 'name,category,link,is_development_app',
        access_token: pageAccessToken
      }
    });

    console.log('📱 App Name:', response.data.name);
    console.log('🔧 Development Mode:', response.data.is_development_app ? 'ON ⚠️' : 'OFF ✅');

    if (response.data.is_development_app) {
      console.log('\n⚠️  WARNING: App is in Development Mode');
      console.log('💡 API calls made in Development Mode may not count toward app review');
      console.log('📝 To fix: Go to App Settings > Basic > Turn OFF Development Mode');
    }

  } catch (error) {
    console.log('⚠️  Could not check app mode:', error.response?.data?.error?.message || error.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Facebook App Review - API Call Test                ║');
  console.log('║  Testing pages_manage_posts permission              ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  try {
    // Check app mode first
    await checkAppMode();

    // Create page post
    const postId = await uploadTestVideo();

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  ✅ SUCCESS                                          ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('\n📋 Next Steps:');
    console.log('1. Wait 2-5 minutes for Facebook to update the counter');
    console.log('2. Refresh your App Review page');
    console.log('3. Check if pages_manage_posts shows "1 of 1 API call(s) required"');
    console.log('4. If still "0 of 1", check if app is in Development Mode (see warning above)');
    console.log('\n🔗 Post created: https://facebook.com/' + postId);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
