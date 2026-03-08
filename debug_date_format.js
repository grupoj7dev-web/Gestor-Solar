// Debug date format and check what the API is actually returning
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDateFormat() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const yearStr = `${today.getFullYear()}`;

        console.log('Date formats being used:');
        console.log(`  Today: ${todayStr}`);
        console.log(`  Month: ${monthStr}`);
        console.log(`  Year: ${yearStr}`);
        console.log('');

        // Test with a known station
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];

        // Find a station with high capacity
        const bigStation = stations.find(s => s.installedCapacity > 100) || stations[0];

        console.log(`Testing with station: ${bigStation.name} (${bigStation.installedCapacity} kW)`);
        console.log('');

        // Test TODAY
        console.log('=== TODAY (timeType: 2) ===');
        const todayData = await client.stationHistorical({
            stationId: bigStation.id,
            timeType: 2,
            startTime: todayStr,
            endTime: todayStr
        });
        console.log('Response:', JSON.stringify(todayData, null, 2));
        console.log('');

        // Test MONTH
        console.log('=== MONTH (timeType: 3) ===');
        const monthData = await client.stationHistorical({
            stationId: bigStation.id,
            timeType: 3,
            startTime: monthStr,
            endTime: monthStr
        });
        console.log('Response:', JSON.stringify(monthData, null, 2));
        console.log('');

        // Test YEAR
        console.log('=== YEAR (timeType: 4) ===');
        const yearData = await client.stationHistorical({
            stationId: bigStation.id,
            timeType: 4,
            startTime: yearStr,
            endTime: yearStr
        });
        console.log('Response:', JSON.stringify(yearData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugDateFormat();
