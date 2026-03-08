require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function checkCustomersSchema() {
    console.log('🔍 Checking customers table schema...\n');

    // Get a sample customer to see the columns
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Sample customer record:');
        console.log(JSON.stringify(data[0], null, 2));
        console.log('\n📋 Available columns:', Object.keys(data[0]));
    } else {
        console.log('⚠️ No customers found in database');
    }
}

checkCustomersSchema();
