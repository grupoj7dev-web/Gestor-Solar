require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDailyComparison() {
    const client = new SolarmanClient();

    try {
        console.log('🔍 Fetching all stations...\n');
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];

        console.log(`Found ${stations.length} stations\n`);

        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Date: ${today}\n`);

        let totalDaily = 0;
        let stationsWithData = 0;
        let stationsWithoutData = 0;
        const topStations = [];

        console.log('Processing stations...\n');

        // Process in batches of 30
        const BATCH_SIZE = 30;
        for (let i = 0; i < stations.length; i += BATCH_SIZE) {
            const batch = stations.slice(i, i + BATCH_SIZE);

            const results = await Promise.all(
                batch.map(async (station) => {
                    try {
                        const data = await client.stationHistorical({
                            stationId: station.id,
                            timeType: 2,
                            startTime: today,
                            endTime: today
                        });

                        const value = data.stationDataItems?.[0]?.generationValue || 0;
                        return {
                            id: station.id,
                            name: station.name,
                            value: value
                        };
                    } catch (err) {
                        return {
                            id: station.id,
                            name: station.name,
                            value: 0,
                            error: true
                        };
                    }
                })
            );

            results.forEach(result => {
                if (result.value > 0) {
                    totalDaily += result.value;
                    stationsWithData++;
                    topStations.push(result);
                } else if (!result.error) {
                    stationsWithoutData++;
                }
            });

            // Small delay between batches
            if (i + BATCH_SIZE < stations.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Progress
            const processed = Math.min(i + BATCH_SIZE, stations.length);
            console.log(`Progress: ${processed}/${stations.length} stations`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTS');
        console.log('='.repeat(60));
        console.log(`Total stations: ${stations.length}`);
        console.log(`Stations with data today: ${stationsWithData}`);
        console.log(`Stations without data today: ${stationsWithoutData}`);
        console.log(`\n🔋 Total Daily Generation: ${totalDaily.toFixed(2)} kWh`);
        console.log(`🔋 Total Daily Generation: ${(totalDaily / 1000).toFixed(2)} MWh`);
        console.log(`\n🎯 Solarman shows: 20.71 MWh`);
        console.log(`📱 Your system shows: ${(totalDaily / 1000).toFixed(2)} MWh`);
        console.log(`📉 Difference: ${(20.71 - (totalDaily / 1000)).toFixed(2)} MWh`);

        // Show top 10 generators
        console.log('\n' + '='.repeat(60));
        console.log('🏆 TOP 10 GENERATORS TODAY');
        console.log('='.repeat(60));
        topStations
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .forEach((station, index) => {
                console.log(`${index + 1}. ${station.name}: ${station.value.toFixed(2)} kWh`);
            });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugDailyComparison();
