// Debug script to check Denilton alarms
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDeniltonAlarms() {
    const client = new SolarmanClient();
    const stationId = 1584435; // Denilton ID

    try {
        await client.obtainToken();

        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const formatDate = (d) => d.toISOString().split('T')[0];

        console.log(`Fetching alarms for Denilton (${stationId})...`);

        const alarms = await client.stationAlarms({
            stationId,
            startTime: formatDate(start),
            endTime: formatDate(end)
        });

        console.log(`Total Alarms: ${alarms.total || 0}`);
        console.log(`stationAlertItems: ${alarms.stationAlertItems ? alarms.stationAlertItems.length : 0}`);

        if (alarms.stationAlertItems && alarms.stationAlertItems.length > 0) {
            console.log('First Alarm:', JSON.stringify(alarms.stationAlertItems[0], null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugDeniltonAlarms();
