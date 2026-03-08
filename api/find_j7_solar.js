const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { SolarmanClient } = require('./src/solarmanClient');

async function findStation() {
    const client = new SolarmanClient();
    try {
        console.log('Fetching station list...');
        const data = await client.stationListAll();
        const station = data.stationList.find(s => s.name.includes('J7 SOLAR'));

        if (station) {
            console.log('Found Station:', JSON.stringify(station, null, 2));
        } else {
            console.log('Station "J7 SOLAR" not found.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

findStation();
