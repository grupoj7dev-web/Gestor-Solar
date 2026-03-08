require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        const sqlPath = path.join(__dirname, 'migrations', 'add_financial_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration from:', sqlPath);
        await client.query(sql);

        console.log('Migration executed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
