require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testDifferentApproaches() {
    const client = new SolarmanClient();

    try {
        const stationsData = await client.stationListAll({ size: 5 });
        const station = stationsData.stationList[0];

        console.log(`\n🔍 Testing station: ${station.name} (ID: ${station.id})`);

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        console.log(`\n📅 Today: ${today}`);
        console.log(`📅 Yesterday: ${yesterday}`);

        // Test 1: Today with timeType 2
        console.log('\n--- Test 1: Today (timeType 2) ---');
        const todayDaily = await client.stationHistorical({
            stationId: station.id,
            timeType: 2,
            startTime: today,
            endTime: today
        });
        console.log('Today value:', todayDaily.stationDataItems?.[0]?.generationValue || 0, 'kWh');

        // Test 2: Yesterday with timeType 2
        console.log('\n--- Test 2: Yesterday (timeType 2) ---');
        const yesterdayDaily = await client.stationHistorical({
            stationId: station.id,
            timeType: 2,
            startTime: yesterday,
            endTime: yesterday
        });
        console.log('Yesterday value:', yesterdayDaily.stationDataItems?.[0]?.generationValue || 0, 'kWh');

        // Test 3: Realtime data
        console.log('\n--- Test 3: Realtime Data ---');
        const realtime = await client.stationRealTime(station.id);
        console.log('Realtime keys:', Object.keys(realtime));
        console.log('generationPower:', realtime.generationPower, 'W');
        console.log('generationToday:', realtime.generationToday, 'kWh');
        console.log('generationTotal:', realtime.generationTotal, 'kWh');

        // Test 4: Check if there's a field for today's accumulated generation
        console.log('\n--- Test 4: All Realtime Fields ---');
        Object.keys(realtime).forEach(key => {
            if (key.toLowerCase().includes('generation') || key.toLowerCase().includes('today')) {
                console.log(`${key}:`, realtime[key]);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testDifferentApproaches();
