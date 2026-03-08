require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugYearly() {
    const client = new SolarmanClient();

    try {
        const stations = await client.stationList({ page: 1, size: 10 });
        const station = stations.stationList[0];

        console.log('Estação:', station.name, '- ID:', station.id);

        // 1. Teste timeType: 4 (Yearly) para os últimos 5 anos
        console.log('\n--- Teste 1: timeType 4 (2021-2025) ---');
        try {
            const yearly = await client.stationHistorical({
                stationId: station.id,
                timeType: 4,
                startTime: '2021-01-01',
                endTime: '2025-12-31'
            });
            console.log('Items retornados:', yearly.stationDataItems?.length || 0);
            if (yearly.stationDataItems) {
                yearly.stationDataItems.forEach(item => {
                    console.log(`  Ano ${item.year}: ${item.generationValue} kWh`);
                });
            }
        } catch (e) {
            console.log('Erro timeType 4:', e.message);
        }

        // 2. Teste timeType: 2 (Daily) para Dezembro 2024 (para ver se existia)
        console.log('\n--- Teste 2: timeType 2 (Dez 2024) ---');
        try {
            const daily2024 = await client.stationHistorical({
                stationId: station.id,
                timeType: 2,
                startTime: '2024-12-01',
                endTime: '2024-12-31'
            });
            console.log('Items retornados (Dez 2024):', daily2024.stationDataItems?.length || 0);
        } catch (e) {
            console.log('Erro timeType 2 (2024):', e.message);
        }

    } catch (error) {
        console.error('Erro geral:', error.message);
    }
}

debugYearly();
