
const axios = require('axios');

async function testApiCall() {
    try {
        console.log('Testing GET http://localhost:4001/auth/check-first-user ...');
        const res = await axios.get('http://localhost:4001/auth/check-first-user');
        console.log('Success:', res.data);
    } catch (error) {
        console.log('Error Status:', error.response?.status);
        console.log('Error Data:', error.response?.data);
    }
}

testApiCall();
