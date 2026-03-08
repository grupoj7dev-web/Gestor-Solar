const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDeviceRealtime() {
    const client = new SolarmanClient();
    // Using a known station ID to find devices first
    const stationId = 17501;

    try {
        await client.obtainToken();
        console.log('✓ Token obtained');

        // 1. Get devices for this station
        console.log(`Fetching devices for station ${stationId}...`);
        const devices = await client.stationDevices({ stationId, page: 1, size: 10 });

        if (!devices.deviceList || devices.deviceList.length === 0) {
            console.log('No devices found for this station.');
            return;
        }

        const device = devices.deviceList[0];
        console.log(`Found device: ${device.deviceSn} (${device.deviceType})`);

        // 2. Get Real-time data for this device
        console.log(`Fetching real-time data for device ${device.deviceSn}...`);
        const realTimeData = await client.deviceCurrentDataBySn(device.deviceSn);

        console.log('\n--- Real-time Data Structure ---');
        console.log(JSON.stringify(realTimeData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugDeviceRealtime();
