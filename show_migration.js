require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('🔄 Running migration: add_customer_documents.sql\n');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', 'add_customer_documents.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Migration SQL:');
        console.log(migrationSQL);
        console.log('\n');

        // For Supabase, we need to execute this via the SQL Editor or use individual queries
        // Let's execute each ALTER TABLE command separately

        const commands = [
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS contractor_id_file_url TEXT`,
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS holder_id_file_url TEXT`,
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS plant_contract_file_url TEXT`,
            `ALTER TABLE customers ADD COLUMN IF NOT EXISTS other_documents JSONB DEFAULT '[]'::jsonb`
        ];

        for (const cmd of commands) {
            console.log(`Executing: ${cmd}`);
            const { error } = await supabase.from('customers').select('id').limit(0); // Dummy query to test connection

            if (error && error.code !== 'PGRST116') {
                console.error('Connection error:', error);
                throw error;
            }
        }

        console.log('\n⚠️  Note: Supabase client cannot execute DDL commands directly.');
        console.log('Please run the following SQL in the Supabase SQL Editor:\n');
        console.log(migrationSQL);
        console.log('\nOr use the Supabase dashboard: https://supabase.com/dashboard/project/[your-project]/sql');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

runMigration();
