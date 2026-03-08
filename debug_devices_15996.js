require('dotenv').config({ path: 'api/.env' });
const { SolarmanClient } = require('./api/src/solarmanClient');

// Instantiate without arguments (it reads from config)
const client = new SolarmanClient();

async function debugDevices() {
    try {
        await client.ensureToken();
        console.log('Authenticated');

        const stationId = 15996; // Duparma Aroldo
        console.log(`Fetching devices for station ${stationId}...`);

        const types = ['INVERTER', 'MicroInverter', 'HybridInverter', 'Meter', 'Logger', 'Module', null];

        for (const type of types) {
            console.log(`\n--- Trying deviceType: ${type} ---`);
            try {
                // If type is null, don't pass it (if API supports fetching all)
                const params = { stationId: stationId };
                if (type) params.deviceType = type;

                const data = await client.stationDevicesRealtime(params);

                if (data && data.deviceListItems && data.deviceListItems.length > 0) {
                    console.log(`FOUND ${data.deviceListItems.length} devices of type ${type}:`);
                    data.deviceListItems.forEach(d => {
                        console.log(`- [${d.deviceType}] ${d.deviceName} (SN: ${d.deviceSn}) - Power: ${d.generationPower}`);
                    });
                } else {
                    console.log('No devices found.');
                }
            } catch (e) {
                console.log(`Error fetching ${type}:`, e.message);
            }
        }

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

debugDevices();
