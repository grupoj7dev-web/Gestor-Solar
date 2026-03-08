require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testYearlyDailyData() {
    const client = new SolarmanClient();

    try {
        const stations = await client.stationList({ page: 1, size: 10 });
        const station = stations.stationList[0];

        console.log('Estação:', station.name, '- ID:', station.id);

        // Tenta buscar dados DIÁRIOS (timeType: 2) para o ano todo de 2025
        console.log('\n' + '='.repeat(60));
        console.log('TESTE: Dados DIÁRIOS de 2025 (timeType: 2) para agregação');
        console.log('='.repeat(60));

        try {
            const daily = await client.stationHistorical({
                stationId: station.id,
                timeType: 2,
                startTime: '2025-11-01',
                endTime: '2025-11-29'
            });

            if (daily.stationDataItems && daily.stationDataItems.length > 0) {
                console.log(`✅ Total de dias retornados: ${daily.stationDataItems.length}`);

                // Agrega por mês para ver se bate
                const monthlyData = {};
                daily.stationDataItems.forEach(item => {
                    const monthKey = `${item.year}-${item.month}`;
                    if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
                    monthlyData[monthKey] += (item.generationValue || 0);
                });

                console.log('\nAgregação Mensal (simulada):');
                Object.keys(monthlyData).sort().forEach(key => {
                    console.log(`  ${key}: ${monthlyData[key].toFixed(2)} kWh`);
                });

            } else {
                console.log('❌ Nenhum dado diário retornado para o ano todo');
            }
        } catch (err) {
            console.log('❌ ERRO:', err.message);
        }

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

testYearlyDailyData();
