require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create_invoices_table.sql'),
            'utf8'
        );

        await pool.query(sql);
        console.log('✅ Tabela invoices criada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao criar tabela:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration();
