require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugMonthlyType() {
    const client = new SolarmanClient();

    try {
        const stations = await client.stationList({ page: 1, size: 10 });
        const station = stations.stationList[0];

        console.log('Estação:', station.name, '- ID:', station.id);

        // Teste timeType: 3 (Monthly) para o ano de 2024
        console.log('\n--- Teste: timeType 3 (2024 Full Year) ---');
        try {
            const monthly2024 = await client.stationHistorical({
                stationId: station.id,
                timeType: 3,
                startTime: '2024-01',
                endTime: '2024-12'
            });
            console.log('Items retornados:', monthly2024.stationDataItems?.length || 0);
            if (monthly2024.stationDataItems) {
                monthly2024.stationDataItems.forEach(item => {
                    console.log(`  ${item.year}-${item.month}: ${item.generationValue} kWh`);
                });
            }
        } catch (e) {
            console.log('Erro timeType 3:', e.message);
        }

    } catch (error) {
        console.error('Erro geral:', error.message);
    }
}

debugMonthlyType();
