require('dotenv').config({ path: './.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrationPg() {
    console.log('Running migration: unify_users_employees.sql via direct PostgreSQL connection...');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        return;
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();

        const sqlPath = path.join(__dirname, 'migrations', 'unify_users_employees.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('Migration completed successfully via pg client!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigrationPg();
