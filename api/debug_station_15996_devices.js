const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { SolarmanClient } = require('./src/solarmanClient');

async function debug() {
    const client = new SolarmanClient();
    const stationId = 15996;

    console.log('--- Fetching ALL devices for station 15996 ---');
    try {
        const allDevices = await client.stationDevices({ stationId, size: 100 });
        console.log('All Devices Count:', allDevices.deviceListItems ? allDevices.deviceListItems.length : (allDevices.deviceList ? allDevices.deviceList.length : 0));
        console.log('All Devices:', JSON.stringify(allDevices, null, 2));
    } catch (e) {
        console.error('Error fetching all devices:', e.message);
    }

    console.log('\n--- Fetching INVERTER devices for station 15996 ---');
    try {
        const inverterDevices = await client.stationDevices({ stationId, size: 100, deviceType: 'INVERTER' });
        console.log('Inverter Devices Count:', inverterDevices.deviceListItems ? inverterDevices.deviceListItems.length : (inverterDevices.deviceList ? inverterDevices.deviceList.length : 0));
        console.log('Inverter Devices:', JSON.stringify(inverterDevices, null, 2));
    } catch (e) {
        console.error('Error fetching inverter devices:', e.message);
    }
}

debug();
