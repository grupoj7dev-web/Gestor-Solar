const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugReports() {
    const client = new SolarmanClient();
    const stationId = 15996; // Aroldo's station ID

    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 30);

    const formatDate = (d) => d.toISOString().split('T')[0];

    console.log(`Fetching data for station ${stationId} from ${formatDate(startTime)} to ${formatDate(endTime)}`);

    try {
        const historicalRes = await client.stationHistorical({
            stationId: stationId,
            timeType: 2, // Daily
            startTime: formatDate(startTime),
            endTime: formatDate(endTime)
        });

        console.log('Historical Response Keys:', Object.keys(historicalRes));

        // Check for stationDataItems (correct for timeType 2) or stationHistoryItems
        const generationList = historicalRes.stationDataItems || historicalRes.stationHistoryItems || [];
        console.log('Using list with length:', generationList.length);

        let totalGeneration = 0;
        let daysWithGeneration = 0;

        generationList.forEach((item, index) => {
            const val = parseFloat(item.generationValue || item.value || 0);
            if (index < 3) console.log(`Item ${index}: val=${val}`);
            if (val > 0) {
                totalGeneration += val;
                daysWithGeneration++;
            }
        });

        console.log('Total Generation:', totalGeneration);
        console.log('Days with Generation:', daysWithGeneration);

        const totalDays = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
        const availability = totalDays > 0 ? (daysWithGeneration / totalDays) * 100 : 0;
        console.log('Calculated Availability:', availability);

        // Check Alarms
        const alarmsRes = await client.stationAlarms({
            stationId: stationId,
            startTime: formatDate(startTime),
            endTime: formatDate(endTime)
        });
        console.log('Alarms Response Keys:', Object.keys(alarmsRes));

    } catch (error) {
        console.error('Error:', error);
    }
}

debugReports();
