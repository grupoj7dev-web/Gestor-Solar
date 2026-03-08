// Debug script to compare our aggregation with Solarman's dashboard
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugAggregation() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        // Get all stations
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];
        console.log(`Total stations: ${stations.length}\n`);

        // Sample 10 random stations
        const sampleSize = 10;
        const sampleStations = [];
        for (let i = 0; i < sampleSize && i < stations.length; i++) {
            const randomIndex = Math.floor(Math.random() * stations.length);
            sampleStations.push(stations[randomIndex]);
        }

        console.log('=== SAMPLE STATIONS ===\n');

        let totalToday = 0;
        let totalMonth = 0;
        let successCount = 0;
        let failCount = 0;

        for (const station of sampleStations) {
            console.log(`Station: ${station.name} (ID: ${station.id})`);

            try {
                // Fetch today
                const todayData = await client.stationHistorical({
                    stationId: station.id,
                    timeType: 2,
                    startTime: todayStr,
                    endTime: todayStr
                });

                const todayGen = todayData.stationDataItems?.[0]?.generationValue || 0;
                console.log(`  Today: ${todayGen} kWh`);
                totalToday += todayGen;

                // Fetch month
                const monthData = await client.stationHistorical({
                    stationId: station.id,
                    timeType: 3,
                    startTime: monthStr,
                    endTime: monthStr
                });

                const monthGen = monthData.stationDataItems?.[0]?.generationValue || 0;
                console.log(`  Month: ${monthGen} kWh`);
                totalMonth += monthGen;

                successCount++;
            } catch (err) {
                console.log(`  ERROR: ${err.response?.data?.msg || err.message}`);
                failCount++;
            }

            console.log('');
        }

        console.log('=== SUMMARY ===');
        console.log(`Success: ${successCount}/${sampleSize}`);
        console.log(`Failed: ${failCount}/${sampleSize}`);
        console.log(`Sample Today Total: ${totalToday} kWh`);
        console.log(`Sample Month Total: ${totalMonth} kWh`);
        console.log(`\nIf we extrapolate to ${stations.length} stations:`);
        console.log(`  Estimated Today: ${(totalToday / sampleSize * stations.length).toFixed(2)} kWh = ${(totalToday / sampleSize * stations.length / 1000).toFixed(2)} MWh`);
        console.log(`  Estimated Month: ${(totalMonth / sampleSize * stations.length).toFixed(2)} kWh = ${(totalMonth / sampleSize * stations.length / 1000).toFixed(2)} MWh`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugAggregation();
