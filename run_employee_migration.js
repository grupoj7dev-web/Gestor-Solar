const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, 'migrations', 'add_employee_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration executed successfully!');

    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
