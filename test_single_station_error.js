// Test a single station to see the exact error
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testSingleStation() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const yearStr = `${today.getFullYear()}`;

        // Test with a failing station ID from the logs
        const stationId = 2587649;

        console.log(`Testing station ${stationId}...`);
        console.log(`Today: ${todayStr}, Month: ${monthStr}, Year: ${yearStr}\n`);

        try {
            console.log('=== TODAY (timeType: 2) ===');
            const todayData = await client.stationHistorical({
                stationId: stationId,
                timeType: 2,
                startTime: todayStr,
                endTime: todayStr
            });
            console.log('Success:', JSON.stringify(todayData, null, 2));
        } catch (err) {
            console.log('ERROR:', err.message);
            if (err.response) {
                console.log('Response status:', err.response.status);
                console.log('Response data:', JSON.stringify(err.response.data, null, 2));
            }
        }

        console.log('\n=== MONTH (timeType: 3) ===');
        try {
            const monthData = await client.stationHistorical({
                stationId: stationId,
                timeType: 3,
                startTime: monthStr,
                endTime: monthStr
            });
            console.log('Success:', JSON.stringify(monthData, null, 2));
        } catch (err) {
            console.log('ERROR:', err.message);
            if (err.response) {
                console.log('Response status:', err.response.status);
                console.log('Response data:', JSON.stringify(err.response.data, null, 2));
            }
        }

        console.log('\n=== YEAR (timeType: 4) ===');
        try {
            const yearData = await client.stationHistorical({
                stationId: stationId,
                timeType: 4,
                startTime: yearStr,
                endTime: yearStr
            });
            console.log('Success:', JSON.stringify(yearData, null, 2));
        } catch (err) {
            console.log('ERROR:', err.message);
            if (err.response) {
                console.log('Response status:', err.response.status);
                console.log('Response data:', JSON.stringify(err.response.data, null, 2));
            }
        }

    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

testSingleStation();
