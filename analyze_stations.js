// Script to analyze station fields and find filtering criteria
const { SolarmanClient } = require('./api/src/solarmanClient');

async function analyzeStations() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        const result = await client.stationListAll();
        const stations = result.stationList || [];

        console.log(`Total stations: ${stations.length}\n`);

        // Show all fields from first station
        console.log('=== SAMPLE STATION (first one) ===');
        console.log(JSON.stringify(stations[0], null, 2));
        console.log('\n');

        // Analyze unique values for potential filter fields
        const orgIds = new Set();
        const types = new Set();
        const statuses = new Set();
        const locationTypes = new Set();

        let totalPower = 0;
        let totalCapacity = 0;

        stations.forEach(s => {
            if (s.orgId) orgIds.add(s.orgId);
            if (s.type) types.add(s.type);
            if (s.status) statuses.add(s.status);
            if (s.locationType) locationTypes.add(s.locationType);

            totalPower += (s.generationPower || 0);
            totalCapacity += (s.installedCapacity || 0);
        });

        console.log('=== UNIQUE VALUES ===');
        console.log(`OrgIds (${orgIds.size}):`, Array.from(orgIds));
        console.log(`Types (${types.size}):`, Array.from(types));
        console.log(`Statuses (${statuses.size}):`, Array.from(statuses));
        console.log(`LocationTypes (${locationTypes.size}):`, Array.from(locationTypes));

        console.log('\n=== TOTALS ===');
        console.log(`Total Power: ${(totalPower / 1_000_000).toFixed(3)} MW`);
        console.log(`Total Capacity: ${(totalCapacity / 1_000).toFixed(3)} MWp`);

        // Try filtering by orgId if it exists
        if (orgIds.size > 1) {
            console.log('\n=== FILTERING BY ORG_ID ===');
            orgIds.forEach(orgId => {
                const filtered = stations.filter(s => s.orgId === orgId);
                const power = filtered.reduce((sum, s) => sum + (s.generationPower || 0), 0);
                const capacity = filtered.reduce((sum, s) => sum + (s.installedCapacity || 0), 0);

                console.log(`\nOrgId ${orgId}:`);
                console.log(`  Stations: ${filtered.length}`);
                console.log(`  Power: ${(power / 1_000).toFixed(2)} kW`);
                console.log(`  Capacity: ${(capacity / 1_000).toFixed(2)} kWp`);
                console.log(`  Percent: ${((power / 1_000) / (capacity / 1_000) * 100).toFixed(2)}%`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

analyzeStations();
