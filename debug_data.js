// Debug script to check what data we're getting from the API
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debug() {
    const client = new SolarmanClient();

    try {
        // Get token
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        // Get all stations
        const result = await client.stationListAll();
        const stations = result.stationList || [];

        console.log(`Total stations: ${stations.length}\n`);

        // Calculate totals
        let totalCurrentPowerW = 0;
        let totalInstalledCapacitykW = 0;
        let onlineCount = 0;

        stations.forEach(s => {
            const power = s.generationPower || 0;
            const capacity = s.installedCapacity || 0;

            totalCurrentPowerW += power;
            totalInstalledCapacitykW += capacity;

            if (power > 0) onlineCount++;

            // Show first 5 stations as sample
            if (stations.indexOf(s) < 5) {
                console.log(`Station: ${s.name}`);
                console.log(`  Current: ${(power / 1000).toFixed(2)} kW`);
                console.log(`  Capacity: ${(capacity / 1000).toFixed(2)} kWp`);
                console.log(`  Online: ${power > 0 ? 'Yes' : 'No'}\n`);
            }
        });

        console.log('=== TOTALS ===');
        console.log(`Current Power: ${(totalCurrentPowerW / 1_000_000).toFixed(3)} MW`);
        console.log(`Installed Capacity: ${(totalInstalledCapacitykW / 1_000).toFixed(3)} MWp`);
        console.log(`Production %: ${((totalCurrentPowerW / 1_000) / totalInstalledCapacitykW * 100).toFixed(2)}%`);
        console.log(`Online stations: ${onlineCount} / ${stations.length}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
