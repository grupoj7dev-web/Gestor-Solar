const axios = require('axios');

async function testDashboardEndpoint() {
    try {
        console.log('🔍 Testing /stats/dashboard endpoint...\n');

        const response = await axios.get('http://localhost:4001/stats/dashboard', {
            headers: {
                'Authorization': 'Bearer test-token'
            }
        });

        const data = response.data;

        console.log('📊 DASHBOARD RESPONSE:');
        console.log('='.repeat(60));
        console.log('\n🏭 Stations:', data.stations);
        console.log('\n⚡ Power:', data.power);
        console.log('\n🔋 Generation:');
        console.log('  Today:', data.generation?.today);
        console.log('  Month:', data.generation?.month);
        console.log('  Year:', data.generation?.year);
        console.log('  Total:', data.generation?.total);
        console.log('\n📝 Metadata:', data.metadata);

        console.log('\n' + '='.repeat(60));
        console.log('🎯 KEY VALUES:');
        console.log('='.repeat(60));
        console.log(`Today Generation: ${data.generation?.today?.kWh} kWh = ${data.generation?.today?.MWh} MWh`);
        console.log(`Today Gain: R$ ${data.generation?.today?.gain?.toFixed(2)}`);
        console.log(`Stations fetched: ${data.metadata?.stationsFetched}/${data.metadata?.stationsTotal}`);
        console.log(`Failed: ${data.metadata?.stationsFailed}`);

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testDashboardEndpoint();
