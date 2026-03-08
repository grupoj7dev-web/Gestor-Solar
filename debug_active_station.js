const { SolarmanClient } = require('./api/src/solarmanClient');

async function findActiveStation() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained');

        const stations = await client.stationListAll();
        console.log(`Found ${stations.stationList.length} stations.`);

        // Find first station with generation > 0
        const activeStation = stations.stationList.find(s => s.generationPower > 0);

        if (!activeStation) {
            console.log('No active stations found (generationPower > 0).');
            return;
        }

        console.log(`\n✓ Found Active Station: "${activeStation.name}" (ID: ${activeStation.id})`);
        console.log(`  Generation: ${activeStation.generationPower} W`);

        // Get devices
        const devices = await client.stationDevices({ stationId: activeStation.id, page: 1, size: 1 });
        if (devices.deviceList && devices.deviceList.length > 0) {
            const device = devices.deviceList[0];
            console.log(`  Device: ${device.deviceSn} (${device.deviceType})`);

            // Get Real-time data
            console.log(`  Fetching real-time data...`);
            const realTimeData = await client.deviceCurrentDataBySn(device.deviceSn);
            console.log('\n--- Real-time Data Structure ---');
            console.log(JSON.stringify(realTimeData, null, 2));
        } else {
            console.log('  Active station has no devices listed?');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findActiveStation();
