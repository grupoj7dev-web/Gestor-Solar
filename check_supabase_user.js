require('dotenv').config();
const supabase = require('./api/src/config/supabase');
const bcrypt = require('bcryptjs');

async function checkUser() {
    try {
        const email = 'jheferson@gmail.com';
        const password = 'Info@123';

        console.log('🔍 Procurando usuário:', email);
        console.log('');

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            console.log('❌ Erro ao buscar usuário:', error.message);
            console.log('');
            console.log('📋 Listando todos os usuários:');
            const { data: allUsers } = await supabase
                .from('users')
                .select('id, email, role, is_active');
            console.table(allUsers);
            return;
        }

        if (!user) {
            console.log('❌ Usuário não encontrado no banco de dados');
            return;
        }

        console.log('✅ Usuário encontrado:');
        console.log('  ID:', user.id);
        console.log('  Email:', user.email);
        console.log('  Nome:', user.name);
        console.log('  Role:', user.role);
        console.log('  Ativo:', user.is_active);
        console.log('  Hash armazenado:', user.password_hash ? 'Existe' : '❌ AUSENTE');
        console.log('');

        if (!user.password_hash) {
            console.log('⚠️  PROBLEMA IDENTIFICADO: O campo password_hash está vazio!');
            console.log('');
            console.log('🔧 Gerando novo hash para a senha:', password);
            const newHash = await bcrypt.hash(password, 10);
            console.log('   Novo hash:', newHash);
            console.log('');
            console.log('💾 Atualizando usuário no banco...');

            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: newHash })
                .eq('email', email);

            if (updateError) {
                console.log('❌ Erro ao atualizar:', updateError.message);
            } else {
                console.log('✅ Senha atualizada com sucesso!');
                console.log('   Agora você pode fazer login com: Info@123');
            }
        } else {
            // Test password comparison
            console.log('🔐 Testando senha...');
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log('   Senha testada:', password);
            console.log('   Resultado:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');

            if (!isValid) {
                console.log('');
                console.log('🔧 A senha está incorreta. Deseja resetar para Info@123? (Executando...)');
                const newHash = await bcrypt.hash(password, 10);

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ password_hash: newHash })
                    .eq('email', email);

                if (updateError) {
                    console.log('❌ Erro ao atualizar:', updateError.message);
                } else {
                    console.log('✅ Senha resetada com sucesso para: Info@123');
                }
            }
        }

    } catch (error) {
        console.error('💥 Erro:', error.message);
    }
}

checkUser();
