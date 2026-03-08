require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Creating customer_units table...');

    const sql = `
-- Create customer_units table
CREATE TABLE IF NOT EXISTS customer_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing units (if consumer_unit column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'consumer_unit'
    ) THEN
        INSERT INTO customer_units (customer_id, unit_number, is_primary)
        SELECT id, consumer_unit, true FROM customers WHERE consumer_unit IS NOT NULL;
        
        ALTER TABLE customers DROP COLUMN consumer_unit;
    END IF;
END $$;
`;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Migration failed:', error);
        console.log('\nTrying alternative method...');

        // Alternative: Create table directly
        const { error: createError } = await supabase
            .from('customer_units')
            .select('*')
            .limit(0);

        if (createError && createError.code === 'PGRST205') {
            console.error('Table does not exist and cannot be created via SDK.');
            console.log('\nPlease run this SQL in your Supabase SQL Editor:');
            console.log(sql);
        }
    } else {
        console.log('Migration completed successfully!');
    }
}

runMigration();
