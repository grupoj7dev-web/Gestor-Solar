require('dotenv').config();
const supabase = require('./api/src/config/supabase');

async function checkRG() {
    const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, rg')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('RG column exists! Data:', data);
    }
}

checkRG();
