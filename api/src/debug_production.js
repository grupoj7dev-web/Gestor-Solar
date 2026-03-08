const { SolarmanClient } = require('./solarmanClient');

async function run() {
    const client = new SolarmanClient();
    try {
        console.log('Obtaining token...');
        await client.obtainToken();

        console.log('\n--- Station List (First Item) ---');
        const stations = await client.stationList({ page: 1, size: 1 });
        if (stations.stationList && stations.stationList.length > 0) {
            const s = stations.stationList[0];
            console.log(JSON.stringify(s, null, 2));

            console.log(`\n--- Realtime Data for Station ${s.id} ---`);
            const rt = await client.stationRealTime(s.id);
            console.log(JSON.stringify(rt, null, 2));
        } else {
            console.log('No stations found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
