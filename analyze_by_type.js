// Analyze stations by type and network status
const { SolarmanClient } = require('./api/src/solarmanClient');

async function analyzeByType() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        const result = await client.stationListAll();
        const stations = result.stationList || [];

        console.log(`Total stations: ${stations.length}\n`);

        // Group by type
        const byType = {};
        const byNetworkStatus = {};

        stations.forEach(s => {
            const type = s.type || 'UNKNOWN';
            const status = s.networkStatus || 'UNKNOWN';

            if (!byType[type]) byType[type] = [];
            if (!byNetworkStatus[status]) byNetworkStatus[status] = [];

            byType[type].push(s);
            byNetworkStatus[status].push(s);
        });

        console.log('=== BY TYPE ===\n');
        Object.keys(byType).forEach(type => {
            const list = byType[type];
            const power = list.reduce((sum, s) => sum + (s.generationPower || 0), 0);
            const capacity = list.reduce((sum, s) => sum + (s.installedCapacity || 0), 0);
            const online = list.filter(s => s.generationPower > 0).length;

            console.log(`${type}:`);
            console.log(`  Count: ${list.length} (${online} online)`);
            console.log(`  Power: ${(power / 1000).toFixed(2)} kW`);
            console.log(`  Capacity: ${(capacity / 1000).toFixed(2)} kWp`);
            console.log(`  Percent: ${capacity > 0 ? ((power / 1000) / (capacity / 1000) * 100).toFixed(2) : 0}%\n`);
        });

        console.log('\n=== BY NETWORK STATUS ===\n');
        Object.keys(byNetworkStatus).forEach(status => {
            const list = byNetworkStatus[status];
            const power = list.reduce((sum, s) => sum + (s.generationPower || 0), 0);
            const capacity = list.reduce((sum, s) => sum + (s.installedCapacity || 0), 0);
            const online = list.filter(s => s.generationPower > 0).length;

            console.log(`${status}:`);
            console.log(`  Count: ${list.length} (${online} online)`);
            console.log(`  Power: ${(power / 1000).toFixed(2)} kW`);
            console.log(`  Capacity: ${(capacity / 1000).toFixed(2)} kWp`);
            console.log(`  Percent: ${capacity > 0 ? ((power / 1000) / (capacity / 1000) * 100).toFixed(2) : 0}%\n`);
        });

        // Try to find combination that matches 554.84 kW
        console.log('\n=== LOOKING FOR 554.84 kW ===\n');

        // Check if any single type matches
        Object.keys(byType).forEach(type => {
            const power = byType[type].reduce((sum, s) => sum + (s.generationPower || 0), 0) / 1000;
            if (Math.abs(power - 554.84) < 50) {
                console.log(`✓ MATCH FOUND: ${type} = ${power.toFixed(2)} kW`);
            }
        });

        // Check combinations
        const types = Object.keys(byType);
        for (let i = 0; i < types.length; i++) {
            for (let j = i + 1; j < types.length; j++) {
                const combined = [...byType[types[i]], ...byType[types[j]]];
                const power = combined.reduce((sum, s) => sum + (s.generationPower || 0), 0) / 1000;
                if (Math.abs(power - 554.84) < 50) {
                    console.log(`✓ MATCH FOUND: ${types[i]} + ${types[j]} = ${power.toFixed(2)} kW`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

analyzeByType();
