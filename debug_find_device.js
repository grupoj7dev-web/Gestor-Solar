const { SolarmanClient } = require('./api/src/solarmanClient');

async function findStationWithDevices() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained');

        // 1. List all stations
        const stations = await client.stationListAll();
        console.log(`Found ${stations.stationList.length} stations.`);

        // Check only first 10 stations
        const limit = 10;
        for (let i = 0; i < Math.min(stations.stationList.length, limit); i++) {
            const station = stations.stationList[i];
            console.log(`Checking station: ${station.name} (${station.id})...`);

            // 2. Try to get devices for this station
            const devices = await client.stationDevices({ stationId: station.id, page: 1, size: 1 });
            if (devices.deviceList && devices.deviceList.length > 0) {
                console.log(`\n✓ Station "${station.name}" (ID: ${station.id}) has devices!`);
                const device = devices.deviceList[0];
                console.log(`  Device: ${device.deviceSn} (${device.deviceType})`);

                // 3. Get Real-time data
                console.log(`  Fetching real-time data...`);
                const realTimeData = await client.deviceCurrentDataBySn(device.deviceSn);
                console.log('\n--- Real-time Data Structure ---');
                console.log(JSON.stringify(realTimeData, null, 2));
                return; // Found one, we are done
            }
        }
        console.log('No stations with devices found in the first 10.');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findStationWithDevices();
