/**
 * Test script to create a Facebook Page Post with display link
 * This will trigger the pages_manage_posts permission and register as an API call for app review
 */

require('dotenv').config();
const axios = require('axios');

async function testPagePost() {
  console.log('\n=== Testing Facebook Page Post API Call ===\n');

  const pageId = '228304287042316'; // Your page ID
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const apiVersion = process.env.FB_API_VERSION || 'v18.0';

  if (!pageAccessToken) {
    console.error('❌ FB_PAGE_ACCESS_TOKEN not found in .env file');
    process.exit(1);
  }

  console.log('✅ Page Access Token found');
  console.log('📄 Page ID:', pageId);
  console.log('🔧 API Version:', apiVersion);

  const url = `https://graph.facebook.com/${apiVersion}/${pageId}/feed`;

  // Create a simple page post (without video for now, just to test the permission)
  const params = {
    access_token: pageAccessToken,
    message: 'Test post for Facebook App Review - Display Link Feature\n\nThis post demonstrates the pages_manage_posts permission usage for creating ads with custom display links.',
    link: 'https://track.netprofitzone.pro/test',
    caption: 'wifiprofits.com',
    // Remove name and description as they require URL ownership
    published: true
  };

  try {
    console.log('\n📤 Making API call to:', url);
    console.log('📊 Parameters:', {
      message: params.message.substring(0, 50) + '...',
      link: params.link,
      caption: params.caption
    });

    const response = await axios.post(url, null, { params });

    console.log('\n✅ SUCCESS! Page post created');
    console.log('📝 Post ID:', response.data.id);
    console.log('\n🎉 This API call should now be registered with Facebook for app review!');
    console.log('🔍 Check your App Review page - it should show "1 of 1 API call(s) required"');
    console.log('\n📱 View the post on Facebook: https://facebook.com/' + response.data.id);

  } catch (error) {
    console.error('\n❌ ERROR creating page post:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testPagePost();
