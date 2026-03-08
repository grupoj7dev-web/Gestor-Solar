require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('🔄 Running migration: add_customer_documents.sql\n');

        const migration = `
-- Add document-related columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS contractor_id_file_url TEXT,
ADD COLUMN IF NOT EXISTS holder_id_file_url TEXT,
ADD COLUMN IF NOT EXISTS plant_contract_file_url TEXT,
ADD COLUMN IF NOT EXISTS other_documents JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN customers.contractor_id_file_url IS 'URL of the Contractor Identity/CNH document';
COMMENT ON COLUMN customers.holder_id_file_url IS 'URL of the Installation Holder Identity/CNH document';
COMMENT ON COLUMN customers.plant_contract_file_url IS 'URL of the Plant Contract document';
COMMENT ON COLUMN customers.other_documents IS 'Array of other document objects with name and url';
        `;

        // Execute the migration using raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: migration });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration completed successfully!');
        console.log('Added columns:');
        console.log('  - contractor_id_file_url');
        console.log('  - holder_id_file_url');
        console.log('  - plant_contract_file_url');
        console.log('  - other_documents');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runMigration();
