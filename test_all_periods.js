require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testCorrectPeriods() {
    const client = new SolarmanClient();

    try {
        const stations = await client.stationList({ page: 1, size: 10 });
        const station = stations.stationList[0];

        console.log('Estação:', station.name, '- ID:', station.id);

        // Teste 1: Dados MENSAIS do ano inteiro (2025)
        console.log('\n' + '='.repeat(60));
        console.log('TESTE 1: Dados MENSAIS de 2025 (timeType: 3)');
        console.log('='.repeat(60));

        try {
            const monthly = await client.stationHistorical({
                stationId: station.id,
                timeType: 3,
                startTime: '2025-01-01',
                endTime: '2025-12-31'
            });

            if (monthly.stationDataItems && monthly.stationDataItems.length > 0) {
                console.log(`✅ Total de meses: ${monthly.stationDataItems.length}`);
                console.log('\nPrimeiros 3 meses:');
                monthly.stationDataItems.slice(0, 3).forEach((item, idx) => {
                    console.log(`  Mês ${idx + 1}: year=${item.year}, month=${item.month}, energia=${item.generationValue} kWh`);
                });
            } else {
                console.log('❌ Nenhum dado mensal retornado');
            }
        } catch (err) {
            console.log('❌ ERRO:', err.message);
        }

        // Teste 2: Dados ANUAIS (últimos 5 anos)
        console.log('\n' + '='.repeat(60));
        console.log('TESTE 2: Dados ANUAIS 2020-2025 (timeType: 4)');
        console.log('='.repeat(60));

        try {
            const yearly = await client.stationHistorical({
                stationId: station.id,
                timeType: 4,
                startTime: '2020-01-01',
                endTime: '2025-12-31'
            });

            if (yearly.stationDataItems && yearly.stationDataItems.length > 0) {
                console.log(`✅ Total de anos: ${yearly.stationDataItems.length}`);
                console.log('\nTodos os anos:');
                yearly.stationDataItems.forEach((item, idx) => {
                    console.log(`  Ano ${idx + 1}: year=${item.year}, energia=${item.generationValue} kWh`);
                });
            } else {
                console.log('❌ Nenhum dado anual retornado');
            }
        } catch (err) {
            console.log('❌ ERRO:', err.message);
        }

        // Teste 3: Confirmar dados DIÁRIOS de outubro
        console.log('\n' + '='.repeat(60));
        console.log('TESTE 3: Dados DIÁRIOS de Outubro 2025 (timeType: 2)');
        console.log('='.repeat(60));

        try {
            const daily = await client.stationHistorical({
                stationId: station.id,
                timeType: 2,
                startTime: '2024-10-01',
                endTime: '2024-10-31'
            });

            if (daily.stationDataItems && daily.stationDataItems.length > 0) {
                console.log(`✅ Total de dias: ${daily.stationDataItems.length}`);
                const total = daily.stationDataItems.reduce((sum, item) => sum + (item.generationValue || 0), 0);
                console.log(`Total do mês: ${total.toFixed(1)} kWh`);
            } else {
                console.log('❌ Nenhum dado diário retornado para outubro');
            }
        } catch (err) {
            console.log('❌ ERRO:', err.message);
        }

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

testCorrectPeriods();
