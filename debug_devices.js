const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDevices() {
    const client = new SolarmanClient();
    const stationId = 15996;

    console.log('Testing stationDevicesRealtime for station:', stationId);

    try {
        const devices = await client.stationDevicesRealtime({
            stationId: stationId,
            deviceType: 'INVERTER'
        });

        console.log('\n=== DEVICE COUNT ===');
        console.log('devices count:', devices.devices?.length);

        if (devices.devices && devices.devices[0]) {
            const device = devices.devices[0];
            console.log('\n=== FIRST DEVICE ===');
            console.log('deviceSn:', device.deviceSn);
            console.log('name:', device.name);

            if (device.currentData) {
                const dataList = device.currentData.dataList || [];

                const statusData = dataList.find(d => d.key === 'INV_ST1');
                console.log('\nStatus (INV_ST1):', statusData);

                // Show ALL power-related fields
                const powerFields = dataList.filter(d =>
                    d.name?.toLowerCase().includes('power') ||
                    d.key?.includes('P') ||
                    d.key?.includes('Pac')
                );
                console.log('\n=== ALL POWER FIELDS ===');
                powerFields.forEach(p => {
                    console.log(`${p.key}: ${p.value} ${p.unit} (${p.name})`);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugDevices();
