// Script to inspect station fields and find filtering criteria
const { SolarmanClient } = require('./api/src/solarmanClient');

async function inspectStations() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        const result = await client.stationListAll();
        const stations = result.stationList || [];

        console.log(`Total stations: ${stations.length}\n`);

        // Show all fields from first 3 stations
        console.log('=== SAMPLE STATIONS (first 3) ===\n');
        stations.slice(0, 3).forEach((station, idx) => {
            console.log(`\n--- Station ${idx + 1}: ${station.name} ---`);
            Object.keys(station).forEach(key => {
                console.log(`  ${key}: ${JSON.stringify(station[key])}`);
            });
        });

        // Analyze unique values for potential filter fields
        console.log('\n\n=== POTENTIAL FILTER FIELDS ===\n');

        const fields = ['type', 'status', 'state', 'orgId', 'userId', 'regionNationId', 'regionLevel1', 'regionLevel2'];

        fields.forEach(field => {
            const uniqueValues = [...new Set(stations.map(s => s[field]))];
            if (uniqueValues.length > 0 && uniqueValues.length < 20) {
                console.log(`\n${field}:`);
                uniqueValues.forEach(val => {
                    const count = stations.filter(s => s[field] === val).length;
                    const totalPower = stations
                        .filter(s => s[field] === val)
                        .reduce((sum, s) => sum + (s.generationPower || 0), 0);
                    console.log(`  ${val}: ${count} stations, ${(totalPower / 1000).toFixed(2)} kW`);
                });
            }
        });

        // Calculate power by different criteria
        console.log('\n\n=== POWER ANALYSIS ===\n');

        // Total power
        const totalPower = stations.reduce((sum, s) => sum + (s.generationPower || 0), 0);
        console.log(`Total power (all 604 stations): ${(totalPower / 1000).toFixed(2)} kW`);

        // Power from online stations only
        const onlineStations = stations.filter(s => s.generationPower > 0);
        const onlinePower = onlineStations.reduce((sum, s) => sum + s.generationPower, 0);
        console.log(`Online stations (${onlineStations.length}): ${(onlinePower / 1000).toFixed(2)} kW`);

        // Try to find subset that matches ~554 kW
        console.log('\n\nLooking for subset matching Solarman\'s 554.84 kW...');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspectStations();
