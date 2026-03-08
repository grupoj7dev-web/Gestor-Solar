require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMigration() {
    console.log('🔍 Verificando se a migração foi executada...\n');

    try {
        // Try to select new columns
        const { data, error } = await supabase
            .from('tickets')
            .select('id, initial_response, execution_deadline, closed_at')
            .limit(1);

        if (error) {
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                console.error('❌ COLUNAS NÃO EXISTEM!');
                console.log('\n⚠️  A migração NÃO foi executada!');
                console.log('📋 Execute o arquivo migrations/update_tickets_management.sql no Supabase SQL Editor\n');
                console.log('Erro:', error.message);
                return;
            }
            console.error('❌ Erro:', error.message);
            return;
        }

        console.log('✅ Colunas novas encontradas na tabela tickets!');

        // Check ticket_history table
        const { error: historyError } = await supabase
            .from('ticket_history')
            .select('id')
            .limit(1);

        if (historyError) {
            if (historyError.message.includes('does not exist')) {
                console.error('❌ Tabela ticket_history NÃO existe!');
                console.log('\n⚠️  A migração NÃO foi executada completamente!\n');
                return;
            }
            console.error('❌ Erro ao verificar ticket_history:', historyError.message);
            return;
        }

        console.log('✅ Tabela ticket_history existe!');
        console.log('\n🎉 MIGRAÇÃO EXECUTADA COM SUCESSO!\n');
        console.log('Agora você pode usar todas as funcionalidades de gerenciamento de chamados! ✨\n');

    } catch (error) {
        console.error('❌ Erro ao verificar migração:', error.message);
    }
}

checkMigration();
