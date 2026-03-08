// Check how many stations actually have generation data
const { SolarmanClient } = require('./api/src/solarmanClient');

async function checkStationsWithData() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get all stations
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];
        console.log(`Total stations: ${stations.length}\n`);

        let stationsWithData = 0;
        let stationsWithoutData = 0;
        let totalGeneration = 0;

        console.log('Checking first 100 stations...\n');

        for (let i = 0; i < Math.min(100, stations.length); i++) {
            const station = stations[i];

            try {
                const todayData = await client.stationHistorical({
                    stationId: station.id,
                    timeType: 2,
                    startTime: todayStr,
                    endTime: todayStr
                });

                const gen = todayData.stationDataItems?.[0]?.generationValue || 0;

                if (gen > 0) {
                    stationsWithData++;
                    totalGeneration += gen;
                    if (stationsWithData <= 10) {
                        console.log(`✓ ${station.name}: ${gen} kWh`);
                    }
                } else {
                    stationsWithoutData++;
                }
            } catch (err) {
                stationsWithoutData++;
            }

            // Small delay to avoid overwhelming API
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`\n=== RESULTS (first 100 stations) ===`);
        console.log(`Stations WITH data: ${stationsWithData}`);
        console.log(`Stations WITHOUT data: ${stationsWithoutData}`);
        console.log(`Total generation: ${totalGeneration} kWh = ${(totalGeneration / 1000).toFixed(2)} MWh`);
        console.log(`\nIf we extrapolate to all ${stations.length} stations:`);
        console.log(`  Estimated stations with data: ${Math.round(stationsWithData / 100 * stations.length)}`);
        console.log(`  Estimated total: ${(totalGeneration / 100 * stations.length / 1000).toFixed(2)} MWh`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkStationsWithData();
