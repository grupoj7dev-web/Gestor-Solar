// Debug script to check historical data structure
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugHistoricalData() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // Get first station
        const list = await client.stationListAll({ size: 5 });
        const stations = list.stationList || [];

        if (stations.length > 0) {
            const station = stations[0];
            console.log(`Testing with station: ${station.name} (ID: ${station.id})\n`);

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const yearStr = `${today.getFullYear()}`;

            console.log(`Today: ${todayStr}`);
            console.log(`Month: ${monthStr}`);
            console.log(`Year: ${yearStr}\n`);

            // Test daily data
            console.log('=== DAILY DATA (timeType: 2) ===');
            const dailyData = await client.stationHistorical({
                stationId: station.id,
                timeType: 2,
                startTime: todayStr,
                endTime: todayStr
            });
            console.log(JSON.stringify(dailyData, null, 2));

            // Test monthly data
            console.log('\n=== MONTHLY DATA (timeType: 3) ===');
            const monthlyData = await client.stationHistorical({
                stationId: station.id,
                timeType: 3,
                startTime: monthStr,
                endTime: monthStr
            });
            console.log(JSON.stringify(monthlyData, null, 2));

            // Test yearly data
            console.log('\n=== YEARLY DATA (timeType: 4) ===');
            const yearlyData = await client.stationHistorical({
                stationId: station.id,
                timeType: 4,
                startTime: yearStr,
                endTime: yearStr
            });
            console.log(JSON.stringify(yearlyData, null, 2));

            // Test all-time data (timeType: 5)
            console.log('\n=== ALL-TIME DATA (timeType: 5) ===');
            try {
                const allTimeData = await client.stationHistorical({
                    stationId: station.id,
                    timeType: 5,
                    startTime: '0',
                    endTime: String(Math.floor(Date.now() / 1000))
                });
                console.log(JSON.stringify(allTimeData, null, 2));
            } catch (err) {
                console.log('timeType 5 not supported:', err.message);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

debugHistoricalData();
