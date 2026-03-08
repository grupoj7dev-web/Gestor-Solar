require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testNovemberData() {
    const client = new SolarmanClient();

    // Test station ID
    const testStationId = 15996;

    console.log('🔍 Testing November 2024 data...\n');

    try {
        const novemberData = await client.stationHistorical({
            stationId: testStationId,
            timeType: 3,
            startTime: '2024-11',
            endTime: '2024-11'
        });

        console.log('✅ November 2024 data:');
        if (novemberData.stationDataItems && novemberData.stationDataItems.length > 0) {
            const novValue = novemberData.stationDataItems[0].generationValue;
            console.log(`📊 November generation: ${novValue} kWh`);
        } else {
            console.log('No data for November');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testNovemberData().catch(console.error);
