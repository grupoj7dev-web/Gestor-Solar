require('dotenv').config();
const axios = require('axios');

async function testWithActualPayload() {
    try {
        // Login first
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:4001/auth/login', {
            email: 'jheferson@gmail.com',
            password: 'Info@123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Use the EXACT payload from the user's console
        const payload = {
            "email": "danilosoares@gmail.com",
            "phone": "62984718001",
            "cep": "74330010",
            "street": "Avenida Berlim",
            "number": "150",
            "complement": "casa",
            "neighborhood": "Jardim Europa",
            "city": "Goiânia",
            "state": "GO",
            "cpf": "71013737121",
            "full_name": "Danilo Soares dos Santos",
            "birth_date": "2001-12-06",
            "customer_type": "pf",
            "has_different_holder": true,
            "holder_type": "pf",
            "holder_name": "Danilo Soares",
            "holder_document": "",
            "holder_relationship": "filho",
            "consumer_units": [{
                "unit_number": "222991",
                "is_primary": true,
                "unit_type": "beneficiaria",
                "expected_rateio_kwh_month": "333"
            }]
        };

        console.log('📤 Sending customer data...\n');

        const response = await axios.post('http://localhost:4001/customers', payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Customer created successfully!');
        console.log('Response:', response.data);

    } catch (error) {
        console.error('\n❌ Error creating customer:');
        console.error('Status:', error.response?.status);
        console.error('Error message:', error.response?.data?.error);
        console.error('\nFull error response:', JSON.stringify(error.response?.data, null, 2));
    }
}

testWithActualPayload();
