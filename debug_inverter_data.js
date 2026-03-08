const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugInverterData() {
    const client = new SolarmanClient();
    const deviceSn = '1911094059';

    try {
        await client.obtainToken();
        console.log('✓ Token obtained');

        console.log(`Fetching data for inverter ${deviceSn}...`);
        const data = await client.deviceCurrentDataBySn(deviceSn);

        console.log('\n--- Inverter Data ---');
        console.log(JSON.stringify(data, null, 2));

        // Extract keys from dataList if available
        if (data.dataList) {
            console.log('\n--- Available Parameters ---');
            data.dataList.forEach(item => {
                console.log(`${item.key}: ${item.value} ${item.unit || ''} (${item.name || ''})`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugInverterData();
