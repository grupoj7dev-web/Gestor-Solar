require('dotenv').config();
const supabase = require('./api/src/config/supabase');

async function listCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, email')
        .limit(5);

    if (error) {
        console.error('Error listing customers:', error);
        return;
    }

    console.log('Customers:', data);
}

listCustomers();
