require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugYearlyParallel() {
    const client = new SolarmanClient();

    try {
        const stations = await client.stationList({ page: 1, size: 10 });
        const station = stations.stationList[0];

        console.log('Estação:', station.name, '- ID:', station.id);

        const currentYear = new Date().getFullYear(); // 2025
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

        console.log('Anos a buscar:', years);

        const promises = years.map(async y => {
            const start = `${y}-01`;
            const end = `${y}-12`;
            console.log(`Iniciando busca para ${y} (${start} a ${end})...`);
            try {
                const res = await client.stationHistorical({
                    stationId: station.id,
                    timeType: 3, // Monthly
                    startTime: start,
                    endTime: end
                });
                const total = (res.stationDataItems || []).reduce((sum, item) => sum + (item.generationValue || 0), 0);
                return { year: y, total, items: res.stationDataItems?.length || 0 };
            } catch (e) {
                return { year: y, error: e.message };
            }
        });

        const results = await Promise.all(promises);

        console.log('\n--- Resultados ---');
        results.forEach(r => {
            console.log(`Ano ${r.year}: Total=${r.total.toFixed(3)} kWh (Items: ${r.items}) ${r.error ? '- Erro: ' + r.error : ''}`);
        });

    } catch (error) {
        console.error('Erro geral:', error.message);
    }
}

debugYearlyParallel();
