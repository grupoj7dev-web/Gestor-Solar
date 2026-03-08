require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDevices() {
    const client = new SolarmanClient();
    const stationId = 15996; // Duparma Aroldo

    try {
        console.log(`Fetching devices for station ${stationId}...`);

        const res = await client.stationDevices({
            stationId: stationId,
            page: 1,
            size: 100
        });

        console.log('API Response:', JSON.stringify(res, null, 2));

        const devices = res.deviceList || [];
        console.log(`Found ${devices.length} devices.`);

        devices.forEach(d => {
            console.log(`Device: ${d.deviceName}`);
            console.log(`  Type: ${d.deviceType}`);
            console.log(`  SN: ${d.deviceSn}`);
            console.log(`  Status: ${d.connectStatus} (${d.connectStatus === 1 ? 'Online' : d.connectStatus === 2 ? 'Offline' : 'Unknown'})`);
            console.log(`  Collection Time: ${new Date(d.collectionTime * 1000).toLocaleString()}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugDevices();
