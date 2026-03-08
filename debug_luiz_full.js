// Debug script to dump full object for Luiz Alberto Trindade
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugLuizFull() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        const list = await client.stationListAll();
        const luiz = list.stationList.find(s => s.name.toLowerCase().includes('luiz alberto'));

        if (luiz) {
            console.log(JSON.stringify(luiz, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugLuizFull();
