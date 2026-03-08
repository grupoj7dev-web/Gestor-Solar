require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function debugData() {
    const client = new SolarmanClient();

    try {
        console.log('\n=== BUSCANDO ESTAÇÕES ===');
        const stations = await client.stationList({ page: 1, size: 10 });
        console.log('Total de estações:', stations.stationList?.length || 0);

        if (stations.stationList && stations.stationList.length > 0) {
            const station = stations.stationList[0];
            console.log('\n=== DADOS DA ESTAÇÃO (da lista) ===');
            console.log('ID:', station.id);
            console.log('Nome:', station.name);
            console.log('totalEnergy:', station.totalEnergy);
            console.log('dayEnergy:', station.dayEnergy);
            console.log('monthEnergy:', station.monthEnergy);
            console.log('yearEnergy:', station.yearEnergy);
            console.log('generationPower:', station.generationPower);

            console.log('\n=== DADOS EM TEMPO REAL ===');
            const realtime = await client.stationRealTime(station.id);
            console.log('TODOS OS CAMPOS:');
            console.log(JSON.stringify(realtime, null, 2));

            console.log('\n=== CAMPOS DE ENERGIA (realtime) ===');
            console.log('generationPower:', realtime.generationPower);
            console.log('dayEnergy:', realtime.dayEnergy);
            console.log('generationTotal:', realtime.generationTotal);
            console.log('totalEnergy:', realtime.totalEnergy);
            console.log('monthEnergy:', realtime.monthEnergy);
            console.log('yearEnergy:', realtime.yearEnergy);
        }
    } catch (error) {
        console.error('Erro:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

debugData();
