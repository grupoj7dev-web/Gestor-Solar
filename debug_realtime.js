require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugRealtime() {
    const client = new SolarmanClient();
    const stationId = 15996; // Duparma Aroldo

    try {
        console.log(`Fetching realtime data for station ${stationId}...`);
        const res = await client.stationRealTime(stationId);
        console.log('Realtime Data:', JSON.stringify(res, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugRealtime();
