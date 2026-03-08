const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const supabase = require('./api/src/config/supabase');

async function checkColumns() {
    console.log('Checking employees table columns...');

    // Try to select all columns from a single row
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching employees:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in existing row:', Object.keys(data[0]));
    } else {
        console.log('No rows found, trying to insert dummy to check schema or assuming empty.');
        // If empty, we can't easily check columns with just select * on empty table via JS client without metadata API
        // But we can try to insert a row with the new columns and see if it fails
    }
}

checkColumns();
