require('dotenv').config();
const axios = require('axios');

async function testCustomerCreation() {
    try {
        // Login first to get token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:4001/auth/login', {
            email: 'jheferson@gmail.com',
            password: 'Info@123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Test customer data (similar to what the wizard sends)
        const customerData = {
            customer_type: 'pf',
            full_name: 'Danilo Soares dos Santos',
            cpf: '12345678901',
            email: 'danilosoares@gmail.com',
            phone: '62984718001',
            cep: '74000000',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'Goiânia',
            state: 'GO',
            consumer_units: [{
                unit_number: '123456789',
                is_primary: true,
                unit_type: 'geradora',
                generation_kwh_month: '',
                plant_power_kwp: '',
                expected_rateio_kwh_month: '',
                bill_file_url: ''
            }],
            kit_details: {
                inverter1: {},
                inverter2: {},
                modules: {}
            },
            financial_conditions: [],
            sale_total_value: 0
        };

        console.log('\n📤 Sending customer data...');
        console.log('Data:', JSON.stringify(customerData, null, 2));

        const response = await axios.post('http://localhost:4001/customers', customerData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Customer created successfully!');
        console.log('Response:', response.data);

    } catch (error) {
        console.error('\n❌ Error creating customer:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
        console.error('Full error:', JSON.stringify(error.response?.data, null, 2));
    }
}

testCustomerCreation();
