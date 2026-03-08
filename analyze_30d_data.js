const fs = require('fs');

const cache = JSON.parse(fs.readFileSync('./api/dashboard_cache.json', 'utf8'));

let stationsWithData = 0;
let stationsWithoutData = 0;
let totalLast30d = 0;

cache.stationsDetail.forEach(station => {
    if (station.stats && station.stats.last30d > 0) {
        stationsWithData++;
        totalLast30d += station.stats.last30d;
    } else {
        stationsWithoutData++;
    }
});

console.log(`\n📊 Análise de dados de 30 dias:\n`);
console.log(`✅ Estações COM dados: ${stationsWithData}`);
console.log(`❌ Estações SEM dados: ${stationsWithoutData}`);
console.log(`📈 Total 30d: ${totalLast30d.toFixed(2)} kWh = ${(totalLast30d / 1000).toFixed(2)} MWh`);
console.log(`\n🔍 Porcentagem com dados: ${((stationsWithData / (stationsWithData + stationsWithoutData)) * 100).toFixed(1)}%`);
