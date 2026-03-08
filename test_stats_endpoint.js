// Test script to verify stats endpoint
const axios = require('axios');

async function testStatsEndpoint() {
    try {
        console.log('🧪 Testing /stats/dashboard endpoint...\n');

        // You'll need to get a valid token first
        const loginResponse = await axios.post('http://localhost:4001/auth/login', {
            email: 'admin@example.com', // Replace with valid credentials
            password: 'your_password'
        });

        const token = loginResponse.data.token;

        const startTime = Date.now();
        const response = await axios.get('http://localhost:4001/stats/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`✅ Request completed in ${duration}s\n`);
        console.log('=== RESPONSE ===');
        console.log(JSON.stringify(response.data, null, 2));

        console.log('\n=== SUMMARY ===');
        console.log(`Stations: ${response.data.stations.total}`);
        console.log(`Customers: ${response.data.customers.total}`);
        console.log(`Today: ${response.data.generation.today.MWh.toFixed(3)} MWh (R$ ${response.data.generation.today.gain.toFixed(2)})`);
        console.log(`Month: ${response.data.generation.month.MWh.toFixed(3)} MWh (R$ ${response.data.generation.month.gain.toFixed(2)})`);
        console.log(`Total: ${response.data.generation.total.MWh.toFixed(3)} MWh (R$ ${response.data.generation.total.gain.toFixed(2)})`);
        console.log(`\nStations fetched: ${response.data.metadata.stationsFetched}/${response.data.metadata.stationsTotal}`);
        console.log(`Failed: ${response.data.metadata.stationsFailed}`);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testStatsEndpoint();
