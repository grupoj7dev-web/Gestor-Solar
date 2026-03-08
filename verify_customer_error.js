const path = require('path');
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'DEFINED' : 'UNDEFINED');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINED' : 'UNDEFINED');

const supabase = require('./api/src/config/supabase');

const customerId = 'af678466-4457-4115-9c6a-137e43ab5916';

async function diagnose() {
    console.log('Starting diagnosis for customer:', customerId);

    try {
        // 1. Fetch Customer
        console.log('1. Fetching Customer...');
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();

        if (error) {
            console.error('❌ Error fetching customer:', error);
            return;
        }
        console.log('✅ Customer found:', customer.id);

        // 2. Fetch Linked Inverters (Suspected Issue)
        console.log('2. Fetching Customer Inverters...');
        /* 
           Original Query from customers.js:
            .from('customer_inverters')
            .select(`
                *,
                inverter:inverters(*)
            `)
            .eq('customer_id', req.params.id);
        */
        const { data: inverters, error: invError } = await supabase
            .from('customer_inverters')
            .select(`
                *,
                inverter:inverters(*)
            `)
            .eq('customer_id', customerId);

        if (invError) {
            console.error('❌ Error fetching customer_inverters:', JSON.stringify(invError, null, 2));
        } else {
            console.log('✅ Customer Inverters fetched:', inverters.length);
        }

        // 3. Fetch Linked Stations
        console.log('3. Fetching Customer Stations...');

        diagnose();
