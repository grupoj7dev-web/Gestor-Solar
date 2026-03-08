require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running auto ticket migration...');

    const sqlPath = path.join(__dirname, 'migrations', 'create_auto_ticket_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Try to run via RPC if available
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('RPC exec_sql failed:', error.message);
        console.log('Attempting to run via raw query (if supported) or please run manually.');
        // Note: Supabase JS client doesn't support raw SQL execution directly without RPC
        // We will just log the instruction
        console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('Migration completed successfully via RPC!');
    }
}

runMigration();
