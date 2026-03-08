const axios = require('axios');

async function testAIVision() {
    try {
        console.log('🔍 Testing AI Vision API on production...\n');

        // You'll need to get a valid token first
        // For now, let's just check if the endpoint is accessible
        const response = await axios.get('https://gestorsolar.iasolar.io/api/ai-vision/analysis', {
            headers: {
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
            },
            validateStatus: () => true // Accept any status
        });

        console.log(`Status: ${response.status}`);
        console.log(`\nResponse:`);
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.totalPlants) {
            console.log(`\n📊 Summary:`);
            console.log(`  Total Plants: ${response.data.totalPlants}`);
            console.log(`  Healthy: ${response.data.healthyPlants}`);
            console.log(`  With Issues: ${response.data.plantsWithIssues}`);
            console.log(`  Anomalies Detected: ${response.data.anomalies?.length || 0}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAIVision();
