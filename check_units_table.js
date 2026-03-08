require('dotenv').config();
const supabase = require('./api/src/config/supabase');

async function checkTable() {
    const { data, error } = await supabase
        .from('customer_units')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Table exists! Sample data:', data);
    }
}

checkTable();
