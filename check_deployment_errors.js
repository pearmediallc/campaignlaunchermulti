// Quick script to check deployment errors
const db = require('./backend/models');

async function checkDeploymentErrors() {
  try {
    const recentDeployments = await db.DeployedCampaign.findAll({
      where: { status: 'failed' },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log('\n🔍 Recent Failed Deployments:\n');

    if (recentDeployments.length === 0) {
      console.log('✅ No failed deployments found');
    } else {
      recentDeployments.forEach((d, i) => {
        console.log(`\n${i + 1}. Deployment ID: ${d.deploymentId}`);
        console.log(`   Target Account: ${d.targetAdAccountId}`);
        console.log(`   Target Page: ${d.targetPageId}`);
        console.log(`   Error: ${d.errorMessage}`);
        console.log(`   Details:`, d.errorDetails);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeploymentErrors();
