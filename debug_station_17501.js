// Debug script to check station 17501 alerts
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugStation17501() {
    const client = new SolarmanClient();
    const stationId = 17501;

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // 1. Get station info from list
        const list = await client.stationListAll();
        const station = list.stationList.find(s => s.id === stationId);

        if (!station) {
            console.log('Station not found!');
            return;
        }

        console.log('Station Info:');
        console.log(`  ID: ${station.id}`);
        console.log(`  Name: ${station.name}`);
        console.log(`  Network Status: ${station.networkStatus}`);
        console.log(`  Generation Power: ${station.generationPower}`);
        console.log('\n');

        // 2. Check Station Alarms (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const formatDate = (d) => d.toISOString().split('T')[0];

        console.log(`Fetching alarms from ${formatDate(start)} to ${formatDate(end)}...`);

        const alarms = await client.stationAlarms({
            stationId,
            startTime: formatDate(start),
            endTime: formatDate(end)
        });

        console.log('\nStation Alarms Response:');
        console.log(`Total: ${alarms.total || 0}`);
        console.log(`stationAlertItems: ${alarms.stationAlertItems ? alarms.stationAlertItems.length : 0}`);
        console.log(`alertList: ${alarms.alertList ? alarms.alertList.length : 0}`);
        console.log('\nFull Response:');
        console.log(JSON.stringify(alarms, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugStation17501();
