// Debug script to find Luiz Alberto Trindade and check status
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugLuiz() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // 1. Get all stations
        const list = await client.stationListAll();

        // 2. Find Luiz Alberto Trindade
        const luiz = list.stationList.find(s => s.name.toLowerCase().includes('luiz alberto'));

        if (!luiz) {
            console.log('Station "Luiz Alberto" not found!');
            return;
        }

        console.log('Station Info:');
        console.log(`  ID: ${luiz.id}`);
        console.log(`  Name: ${luiz.name}`);
        console.log(`  Network Status: ${luiz.networkStatus}`);
        console.log(`  Work Status: ${luiz.workStatus}`);
        console.log(`  Generation Power: ${luiz.generationPower}`);
        console.log('\n');

        // 3. Check Alarms for him
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const formatDate = (d) => d.toISOString().split('T')[0];

        const alarms = await client.stationAlarms({
            stationId: luiz.id,
            startTime: formatDate(start),
            endTime: formatDate(end)
        });

        console.log('Alarms Response:');
        console.log(`Total: ${alarms.total || 0}`);
        console.log(`stationAlertItems: ${alarms.stationAlertItems ? alarms.stationAlertItems.length : 0}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugLuiz();
