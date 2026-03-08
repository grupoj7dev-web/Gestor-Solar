require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugAlarms() {
    const client = new SolarmanClient();
    const stationId = 15996; // Duparma Aroldo

    // Start date 1 month ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
        console.log(`Fetching alarms for station ${stationId} from ${startStr} to ${endStr}...`);

        // Check solarmanClient.js for exact method signature if needed, but assuming payload structure
        const res = await client.stationAlarms({
            stationId: stationId,
            startTime: startStr,
            endTime: endStr,
            page: 1,
            size: 20
        });

        console.log('Alarms Response:', JSON.stringify(res, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugAlarms();
