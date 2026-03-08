const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugHistorical() {
    const client = new SolarmanClient();

    try {
        console.log('Fetching station list...');
        const stations = await client.stationList({ page: 1, size: 5 });
        const list = stations.stationList || stations.list || [];

        if (list.length === 0) {
            console.log('No stations found.');
            return;
        }

        const station = list[0];
        console.log(`Testing with Station: ${station.name} (ID: ${station.id})`);

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        console.log(`Fetching history for date: ${dateStr}`);

        // Try timeType 1 (Month dimension - days in month) AND timeType 2 (Year dimension - months in year)?
        // Wait, user provided docs:
        // timeType 1 (frame dimension): specific day, only power level data
        // timeType 2 (day dimension): multi-day statistics (up to 30 days)

        // Let's try timeType 1 first as it says "only power level data" which might be the curve
        // But we want the PEAK of the day.

        // Let's try timeType 2 (Day dimension) for just today.
        console.log('\n--- Requesting timeType: 2 (Day stats) ---');
        const historyDay = await client.stationHistorical({
            stationId: station.id,
            timeType: 2,
            startTime: dateStr,
            endTime: dateStr
        });
        console.log(JSON.stringify(historyDay, null, 2));

        // Let's also try timeType 1 (Frame/Intraday) to see if we can calculate peak manually if needed
        console.log('\n--- Requesting timeType: 1 (Intraday frames) ---');
        const historyFrame = await client.stationHistorical({
            stationId: station.id,
            timeType: 1,
            startTime: dateStr,
            endTime: dateStr
        });
        // Don't log full frame data if it's huge, just summary
        if (historyFrame.stationDataItems) {
            console.log(`Received ${historyFrame.stationDataItems.length} data points.`);
            if (historyFrame.stationDataItems.length > 0) {
                console.log('First point:', historyFrame.stationDataItems[0]);
                // Find max power manually
                const maxPower = historyFrame.stationDataItems.reduce((max, item) => {
                    const p = item.power || item.generationPower || 0;
                    return p > max ? p : max;
                }, 0);
                console.log('Calculated Max Power from frames:', maxPower);
            }
        } else {
            console.log('No frame data items.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugHistorical();
