const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais do Supabase não encontradas no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Caminho absoluto do backup (ajustado conforme descoberto)
const backupPath = 'c:\\Users\\User\\Desktop\\novokit05\\novokit09\\scripts\\backups\\inversores_backup_2025-12-12T17-33-58-112Z.json';

(async () => {
    try {
        console.log('🔌 Conectando ao Supabase...');

        // Tenta obter um ID de usuário administrativo para o campo created_by
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin') // Tenta achar um admin
            .limit(1);

        let createdBy = null;
        if (userData && userData.length > 0) {
            createdBy = userData[0].id;
        } else {
            // Fallback: pega qualquer usuário
            const { data: anyUser } = await supabase.from('users').select('id').limit(1);
            if (anyUser && anyUser.length > 0) createdBy = anyUser[0].id;
        }

        console.log(`👤 Usuário vinculado: ${createdBy || 'Nenhum'}`);

        if (fs.existsSync(backupPath)) {
            console.log(`📂 Lendo arquivo de backup: ${backupPath}`);
            const fileContent = fs.readFileSync(backupPath, 'utf8');
            const sourceData = JSON.parse(fileContent);

            console.log(`📦 Encontrados ${sourceData.length} registros para migrar.`);

            let successCount = 0;

            for (const item of sourceData) {
                // Correção de encoding comum
                let phases = item.fases || 'Monofásico';
                if (phases.includes('Ã¡')) phases = phases.replace(/Ã¡/g, 'á');
                if (phases.includes('TrifÃ¡sico')) phases = phases.replace(/TrifÃ¡sico/g, 'Trifásico');

                const payload = {
                    id: item.id,
                    marca: item.marca,
                    modelo: item.modelo, // remover espaços extras se houver
                    potencia_nominal: item.potencia_kw, // Mapeamento correto
                    tipo: item.tipo,
                    fases: phases,
                    tensao: item.tensao,
                    afci_integrado: item.afci_integrado || false,
                    nomenclature_config: { showTipo: true, showPotencia: true, showFases: true, showTensao: false, showMarca: true, showAfci: false }, // Default config
                    created_by: createdBy
                };

                // Remove created_by se for null para evitar erro de constraint (se houver, mas deixei nullable no script anterior, vamos confiar)
                if (!createdBy) delete payload.created_by;

                const { error } = await supabase
                    .from('inverters')
                    .upsert(payload, { onConflict: 'id' });

                if (error) {
                    console.error(`❌ Erro ao migrar ${item.modelo}:`, error.message);
                } else {
                    console.log(`✅ Migrado: ${item.marca} ${item.modelo} (${phases})`);
                    successCount++;
                }
            }

            console.log(`🚀 Migração finalizada! ${successCount}/${sourceData.length} registros importados.`);
        } else {
            console.error('❌ Arquivo de backup não encontrado!');
        }

    } catch (err) {
        console.error('❌ Erro fatal:', err);
    }
})();
