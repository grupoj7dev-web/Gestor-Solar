const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugRealtime() {
    const client = new SolarmanClient();
    const stationId = 15996; // ID from the screenshot

    try {
        console.log(`Fetching Realtime Data for Station ID: ${stationId}...`);
        const realtime = await client.stationRealTime(stationId);
        console.log('Realtime Response:', JSON.stringify(realtime, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

debugRealtime();
