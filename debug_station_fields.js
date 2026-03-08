// Debug script to check station fields
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugStationFields() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // Get first station
        const list = await client.stationListAll({ size: 5 });
        const stations = list.stationList || [];

        console.log(`Found ${stations.length} stations\n`);

        if (stations.length > 0) {
            const station = stations[0];
            console.log('=== STATION FIELDS ===');
            console.log(JSON.stringify(station, null, 2));
            console.log('\n=== KEY FIELDS ===');
            console.log('ID:', station.id);
            console.log('Name:', station.name);
            console.log('generationPower:', station.generationPower);
            console.log('installedCapacity:', station.installedCapacity);
            console.log('cumulativeEnergy:', station.cumulativeEnergy);
            console.log('totalEnergy:', station.totalEnergy);
            console.log('panelCount:', station.panelCount);
            console.log('moduleCount:', station.moduleCount);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugStationFields();
