const fs = require('fs');
const path = require('path');

try {
    const cachePath = path.join(__dirname, 'dashboard_cache.json');
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const stations = cache.stationsDetail;

    const now = Date.now() / 1000;

    // Anomalies: Online (power > 0) AND Recent Update (< 24h) AND Zero Daily Generation
    const anomalies = stations.filter(s => {
        const isOnline = s.generationPower > 0;
        const hasZeroToday = s.stats.today === 0;
        const isRecent = s.lastUpdateTime && (now - s.lastUpdateTime) < 86400;

        return isOnline && hasZeroToday && isRecent;
    });

    console.log(`Total Stations: ${stations.length}`);
    console.log(`Anomalies Found: ${anomalies.length}`);

    if (anomalies.length > 0) {
        console.log('First 3 Anomalies:');
        console.log(JSON.stringify(anomalies.slice(0, 3), null, 2));
    }
} catch (e) {
    console.error(e);
}
