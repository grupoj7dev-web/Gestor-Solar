require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugHistory() {
    const client = new SolarmanClient();
    const stationId = 15996; // Duparma Aroldo
    const today = new Date().toISOString().split('T')[0];

    try {
        console.log(`Fetching history for station ${stationId} on ${today}...`);

        // Try timeType 1 (Intraday)
        const res1 = await client.stationHistorical({
            stationId,
            timeType: 1,
            startTime: today,
            endTime: today
        });
        console.log('History (Type 1) Items:', res1.stationDataItems ? res1.stationDataItems.length : 0);
        if (res1.stationDataItems && res1.stationDataItems.length > 0) {
            console.log('First Item:', res1.stationDataItems[0]);
        }

        // Try timeType 2 (Daily) - usually returns one item per day with total generation
        const res2 = await client.stationHistorical({
            stationId,
            timeType: 2,
            startTime: today,
            endTime: today
        });
        console.log('History (Type 2) Items:', res2.stationDataItems ? res2.stationDataItems.length : 0);
        if (res2.stationDataItems && res2.stationDataItems.length > 0) {
            console.log('First Item:', res2.stationDataItems[0]);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugHistory();
