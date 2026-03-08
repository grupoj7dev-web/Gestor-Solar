// Check if station real-time data has total energy
const { SolarmanClient } = require('./api/src/solarmanClient');

async function checkRealTimeData() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // Get first station
        const list = await client.stationListAll({ size: 3 });
        const stations = list.stationList || [];

        for (const station of stations) {
            console.log(`\n=== Station: ${station.name} (ID: ${station.id}) ===`);

            // Get real-time data
            const realTime = await client.stationRealTime({ stationId: station.id });
            console.log('Real-time data:');
            console.log(JSON.stringify(realTime, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkRealTimeData();
