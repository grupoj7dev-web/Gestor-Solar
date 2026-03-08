require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkUser() {
    try {
        const email = 'jheferson@gmail.com';
        const password = 'Info@123';

        console.log('Procurando usuário:', email);

        const result = await pool.query(
            'SELECT id, email, password, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            console.log('❌ Usuário não encontrado no banco de dados');
            console.log('\nListando todos os usuários:');
            const allUsers = await pool.query('SELECT id, email, role FROM users');
            console.table(allUsers.rows);
        } else {
            const user = result.rows[0];
            console.log('✅ Usuário encontrado:');
            console.log('  ID:', user.id);
            console.log('  Email:', user.email);
            console.log('  Role:', user.role);
            console.log('  Hash armazenado:', user.password);

            // Test password comparison
            const isValid = await bcrypt.compare(password, user.password);
            console.log('\nTeste de senha:');
            console.log('  Senha testada:', password);
            console.log('  Resultado:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');

            // Generate new hash for comparison
            const newHash = await bcrypt.hash(password, 10);
            console.log('\nNovo hash gerado para a mesma senha:', newHash);
        }

        await pool.end();
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

checkUser();
