require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugTodayGeneration() {
    const client = new SolarmanClient();

    try {
        // Get first station
        const stationsData = await client.stationListAll({ size: 5 });
        const station = stationsData.stationList[0];

        console.log(`\n🔍 Testing station: ${station.name} (ID: ${station.id})`);
        console.log(`Current power: ${station.generationPower}W`);

        const today = new Date().toISOString().split('T')[0];
        console.log(`\n📅 Date: ${today}`);

        // Test timeType 1 (intraday)
        console.log('\n--- TimeType 1 (Intraday) ---');
        const intraday = await client.stationHistorical({
            stationId: station.id,
            timeType: 1,
            startTime: today,
            endTime: today
        });
        console.log('Response keys:', Object.keys(intraday));
        console.log('stationDataItems:', intraday.stationDataItems?.length || 0, 'items');
        console.log('stationHistoryItems:', intraday.stationHistoryItems?.length || 0, 'items');

        if (intraday.stationDataItems && intraday.stationDataItems.length > 0) {
            console.log('First stationDataItem:', intraday.stationDataItems[0]);
            const sum = intraday.stationDataItems.reduce((s, i) => s + (i.generationValue || i.value || 0), 0);
            console.log('Sum of generationValue:', sum);
        }

        if (intraday.stationHistoryItems && intraday.stationHistoryItems.length > 0) {
            console.log('First stationHistoryItem:', intraday.stationHistoryItems[0]);
            const sum = intraday.stationHistoryItems.reduce((s, i) => s + (i.generationValue || i.value || 0), 0);
            console.log('Sum of generationValue:', sum);
        }

        // Test timeType 2 (daily)
        console.log('\n--- TimeType 2 (Daily) ---');
        const daily = await client.stationHistorical({
            stationId: station.id,
            timeType: 2,
            startTime: today,
            endTime: today
        });
        console.log('Response keys:', Object.keys(daily));
        console.log('stationDataItems:', daily.stationDataItems?.length || 0, 'items');
        if (daily.stationDataItems && daily.stationDataItems.length > 0) {
            console.log('First item:', daily.stationDataItems[0]);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugTodayGeneration();
