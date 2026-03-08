// Debug script to find Denilton and check status
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugDenilton() {
    const client = new SolarmanClient();

    try {
        await client.obtainToken();
        console.log('✓ Token obtained\n');

        const list = await client.stationListAll();
        const denilton = list.stationList.find(s => s.name.toLowerCase().includes('denilton'));

        if (!denilton) {
            console.log('Station "Denilton" not found!');
            return;
        }

        console.log('Station Info:');
        console.log(`  ID: ${denilton.id}`);
        console.log(`  Name: ${denilton.name}`);
        console.log(`  Network Status: ${denilton.networkStatus}`);
        console.log(`  Generation Power: ${denilton.generationPower}`);
        console.log('\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugDenilton();
