require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testTimeTypes() {
    const client = new SolarmanClient();

    try {
        const stations = await client.stationList({ page: 1, size: 10 });
        const station = stations.stationList[0];

        console.log('Estação:', station.name, '- ID:', station.id);

        // Testa diferentes timeTypes
        const timeTypes = [
            { type: 1, name: 'Frame dimension (intraday)' },
            { type: 2, name: 'Day dimension' },
            { type: 3, name: 'Month dimension' },
            { type: 4, name: 'Year dimension' }
        ];

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        for (const tt of timeTypes) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`timeType: ${tt.type} - ${tt.name}`);
            console.log(`Período: ${startOfMonth} até ${endOfMonth}`);
            console.log('='.repeat(60));

            try {
                const result = await client.stationHistorical({
                    stationId: station.id,
                    timeType: tt.type,
                    startTime: startOfMonth,
                    endTime: endOfMonth
                });

                if (result.stationDataItems && result.stationDataItems.length > 0) {
                    console.log(`Total de itens: ${result.stationDataItems.length}`);
                    console.log('\nPrimeiros 3 itens:');
                    result.stationDataItems.slice(0, 3).forEach((item, idx) => {
                        console.log(`\nItem ${idx + 1}:`);
                        console.log('  year:', item.year);
                        console.log('  month:', item.month);
                        console.log('  day:', item.day);
                        console.log('  dateTime:', item.dateTime);
                        console.log('  generationValue:', item.generationValue);
                    });
                } else {
                    console.log('Nenhum dado retornado');
                }
            } catch (err) {
                console.log('ERRO:', err.message);
            }
        }
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

testTimeTypes();
