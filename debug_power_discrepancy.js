
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugPower() {
    const client = new SolarmanClient();
    console.log('Fetching all stations...');

    try {
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];
        console.log(`Total Stations: ${stations.length}`);

        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('Error:', error);
    }
}

debugPower();
