require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugMonthHistory() {
    const client = new SolarmanClient();

    try {
        console.log('\n=== BUSCANDO ESTAÇÕES ===');
        const stations = await client.stationList({ page: 1, size: 10 });

        if (stations.stationList && stations.stationList.length > 0) {
            const station = stations.stationList[0];
            console.log('Estação:', station.name, '- ID:', station.id);

            // Mês atual
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);

            const startTime = firstDay.toISOString().split('T')[0];
            const endTime = lastDay.toISOString().split('T')[0];

            console.log('\n=== HISTÓRICO DO MÊS (timeType: 2) ===');
            console.log('Período:', startTime, 'até', endTime);

            const history = await client.stationHistorical({
                stationId: station.id,
                timeType: 2, // 2 = day dimension
                startTime,
                endTime
            });

            console.log('\nRESPOSTA COMPLETA:');
            console.log(JSON.stringify(history, null, 2));

            if (history.stationDataItems) {
                console.log('\n=== PRIMEIROS 5 ITENS ===');
                history.stationDataItems.slice(0, 5).forEach((item, idx) => {
                    console.log(`\nItem ${idx + 1}:`);
                    console.log('  dateTime:', item.dateTime);
                    console.log('  date:', item.date);
                    console.log('  generationValue:', item.generationValue);
                    console.log('  dayEnergy:', item.dayEnergy);
                });

                console.log('\n=== TOTAL DE ITENS ===');
                console.log('Total:', history.stationDataItems.length);
            }
        }
    } catch (error) {
        console.error('Erro:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

debugMonthHistory();
