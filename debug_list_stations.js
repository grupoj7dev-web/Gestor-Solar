require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function listStations() {
    const client = new SolarmanClient();
    try {
        const result = await client.stationList({ page: 1, size: 20 });
        console.log('Stations found:', result.stationList.length);
        result.stationList.forEach(s => {
            console.log(`- ${s.name} (ID: ${s.id})`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listStations();
