require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Checking customers table columns...');

    // Fetch one customer to see structure
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching customers:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No customers found. Cannot infer columns from data.');
        return;
    }

    const row = data[0];
    const keys = Object.keys(row);

    console.log('Existing columns found:', keys.length);

    // Check for specific columns
    const expected = [
        'kit_details',
        'financial_conditions',
        'sale_total_value',
        'contacts',
        'proxy_file_url',
        'art_file_url'
    ];

    const missing = expected.filter(k => !keys.includes(k));
    const present = expected.filter(k => keys.includes(k));

    console.log('✅ Present columns:', present);
    console.log('❌ MISSING columns:', missing);

    if (missing.length > 0) {
        console.log('\nCONCLUSION: The database MIGRATION has NOT been applied successfully.');
        console.log('Please run the SQL script in Supabase SQL Editor.');
    } else {
        console.log('\nCONCLUSION: Database looks correct. The issue is in the code.');
    }
}

checkColumns();
