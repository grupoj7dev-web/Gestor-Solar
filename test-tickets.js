const axios = require('axios');

async function testTickets() {
    try {
        // Login first to get token (assuming you have a test user, or we can bypass auth for test if possible, but better to simulate real flow)
        // For now, let's try to hit the endpoint. If it needs auth, it will fail with 401.
        // If you have a token, paste it here. Otherwise we might need to login.

        // Actually, let's just try to read from supabase directly using the service key if available, 
        // or just use the same logic as the backend to see if it works.

        // Better yet, let's just use the existing backend code structure but run it as a script.

        console.log('Testing GET /tickets endpoint...');
        const response = await axios.get('http://localhost:3000/tickets');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testTickets();
