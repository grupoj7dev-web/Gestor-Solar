require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const supabase = require('./api/src/config/supabase');

async function runMigration() {
    try {
        const migrationFile = path.join(__dirname, 'migrations', 'unify_users_employees.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Running migration: unify_users_employees.sql');

        // Split by semicolon to run statements individually (Supabase client might not support multi-statement)
        // But for complex migrations with temp tables, it's better to run as one block if supported, 
        // or use a transaction. The JS client usually runs one statement.
        // Let's try running it as a single RPC call if possible, or just use the text.
        // Since we don't have direct SQL access via client usually, we might rely on the fact that 
        // the previous `run_migration.js` likely used a specific method.
        // Let's check how `run_migration.js` works first, but for now I'll assume I can just execute SQL 
        // if I had a direct connection. 
        // Wait, the supabase-js client doesn't support raw SQL execution directly unless enabled via RPC.
        // I should check `run_migration.js` to see how it was done before.

        // Actually, let's just use the existing `run_migration.js` pattern if possible.
        // But I'll write a new one to be safe and simple.

        // WARNING: supabase-js client does NOT support running raw SQL from the client side 
        // unless you have a specific RPC function set up for it.
        // However, I see `run_migration.js` in the file list. Let's see how it works.

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error running migration via RPC:', error);
            // Fallback: if exec_sql doesn't exist, we might be stuck unless we have another way.
            // Let's hope the user has the exec_sql function or similar.
        } else {
            console.log('Migration executed successfully via RPC');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

runMigration();
