const { SolarmanClient } = require('./solarmanClient');

async function run() {
    const client = new SolarmanClient();
    try {
        console.log('Obtaining token...');
        await client.obtainToken();
        console.log('Token obtained.');

        console.log('\n--- Listing All Stations ---');
        const stations = await client.stationList({ page: 1, size: 10 });
        console.log(JSON.stringify(stations, null, 2));

        const stationList = stations.stationList || [];
        if (stationList.length > 0) {
            const stationId = stationList[0].id;
            console.log(`\n--- Listing Devices for Station ${stationId} ---`);
            const devices = await client.stationDevices({ stationId, page: 1, size: 20 });
            console.log(JSON.stringify(devices, null, 2));
        } else {
            console.log('No stations found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
