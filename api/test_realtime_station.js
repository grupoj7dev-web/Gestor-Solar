require('dotenv').config({ path: '../.env' });
const { SolarmanClient } = require('./src/solarmanClient');

const client = new SolarmanClient(
    process.env.SOLARMAN_APP_ID,
    process.env.SOLARMAN_APP_SECRET,
    process.env.SOLARMAN_EMAIL,
    process.env.SOLARMAN_PASSWORD
);

async function run() {
    try {
        console.log('Fetching real-time data for station 15996...');
        const data = await client.stationRealTime(15996);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
