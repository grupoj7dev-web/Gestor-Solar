// Script to fetch realtime data for all stations
const { SolarmanClient } = require('./api/src/solarmanClient');

async function fetchRealtimeData() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // Get all stations
        const result = await client.stationListAll();
        const stations = result.stationList || [];

        console.log(`Total stations: ${stations.length}\n`);
        console.log('Fetching realtime data for first 10 stations...\n');

        let totalRealtimePower = 0;
        let successCount = 0;
        let errorCount = 0;

        // Fetch realtime for first 10 as sample
        for (let i = 0; i < Math.min(10, stations.length); i++) {
            const station = stations[i];
            try {
                const realtime = await client.stationRealTime(station.id);

                console.log(`${i + 1}. ${station.name}`);
                console.log(`   List Power: ${(station.generationPower / 1000).toFixed(2)} kW`);
                console.log(`   Realtime Power: ${realtime.generationPower ? (realtime.generationPower / 1000).toFixed(2) : 'N/A'} kW`);
                console.log(`   Match: ${station.generationPower === realtime.generationPower ? '✓' : '✗'}\n`);

                if (realtime.generationPower !== undefined) {
                    totalRealtimePower += realtime.generationPower;
                    successCount++;
                }
            } catch (e) {
                console.log(`${i + 1}. ${station.name} - ERROR: ${e.message}\n`);
                errorCount++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n=== SUMMARY (first 10 stations) ===');
        console.log(`Success: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total Realtime Power (sample): ${(totalRealtimePower / 1000).toFixed(2)} kW`);

        // Now let's check if there's a difference in the data structure
        console.log('\n\nFetching one realtime data to see full structure...');
        const sampleRealtime = await client.stationRealTime(stations[0].id);
        console.log('\nRealtime data structure:');
        console.log(JSON.stringify(sampleRealtime, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchRealtimeData();
