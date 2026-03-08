const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugRawDevices() {
    const client = new SolarmanClient();
    const stationId = 15996; // Duparma Aroldo

    try {
        await client.obtainToken();
        console.log('✓ Token obtained');

        console.log(`Fetching devices for station ${stationId}...`);
        const devices = await client.stationDevices({ stationId, page: 1, size: 10 });

        console.log('\n--- Raw Response ---');
        console.log(JSON.stringify(devices, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugRawDevices();
