require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function checkStationListFields() {
    const client = new SolarmanClient();

    try {
        console.log('🔍 Checking stationListAll fields...\n');
        const stationsData = await client.stationListAll({ size: 10 });
        const station = stationsData.stationList[0];

        console.log('First station:', station.name);
        console.log('\nAll fields:');
        console.log(JSON.stringify(station, null, 2));

        console.log('\n\n📊 Checking for today generation field...');
        Object.keys(station).forEach(key => {
            if (key.toLowerCase().includes('generation') || key.toLowerCase().includes('today')) {
                console.log(`${key}:`, station[key]);
            }
        });

        // Sum all today generation from stationList
        console.log('\n\n🔋 Summing generation from stationList...');
        let totalFromList = 0;
        stationsData.stationList.forEach(s => {
            if (s.generationToday) {
                totalFromList += s.generationToday;
                console.log(`${s.name}: ${s.generationToday} kWh`);
            }
        });
        console.log(`\nTotal from first 10 stations: ${totalFromList} kWh`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkStationListFields();
