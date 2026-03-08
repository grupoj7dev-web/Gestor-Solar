require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

const client = new SolarmanClient();

async function inspectStations() {
    try {
        console.log('Fetching stations...');
        const data = await client.stationListAll({ size: 5 });
        const stations = data.stationList || [];

        if (stations.length > 0) {
            console.log('First station data:', JSON.stringify(stations[0], null, 2));
        } else {
            console.log('No stations found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectStations();
