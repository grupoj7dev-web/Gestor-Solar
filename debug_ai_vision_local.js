const fs = require('fs');
const path = require('path');

// Load the service
const { analyzeAllPlants, detectAnomalies } = require('./api/src/services/ai-vision-service');

async function debugAIVision() {
    console.log('🔍 Debugging AI Vision Detection...\n');

    // Load cache
    const CACHE_FILE = path.join(__dirname, 'api/dashboard_cache.json');

    if (!fs.existsSync(CACHE_FILE)) {
        console.error('❌ Cache file not found:', CACHE_FILE);
        return;
    }

    const statsData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const plants = statsData.stationsDetail || [];

    console.log(`📊 Total plants in cache: ${plants.length}\n`);

    // Sample first 10 plants
    console.log('🔬 Analyzing first 10 plants:\n');

    plants.slice(0, 10).forEach((plant, idx) => {
        console.log(`\n--- Plant ${idx + 1}: ${plant.name} ---`);
        console.log(`  ID: ${plant.id}`);
        console.log(`  Network Status: ${plant.networkStatus}`);
        console.log(`  Generation Power: ${plant.generationPower}W`);
        console.log(`  Today Generation: ${plant.stats?.today || 0} kWh`);
        console.log(`  Alert Count: ${plant.alertCount || 0}`);
        console.log(`  Installed Capacity: ${plant.installedCapacity} kW`);

        const anomaly = detectAnomalies(plant);
        if (anomaly) {
            console.log(`  ⚠️  ANOMALY DETECTED:`);
            console.log(`    Severity: ${anomaly.severity}`);
            console.log(`    Issues: ${anomaly.issues.map(i => i.message).join(', ')}`);
        } else {
            console.log(`  ✅ No anomalies`);
        }
    });

    // Run full analysis
    console.log('\n\n🤖 Running full AI analysis...\n');
    const analysis = await analyzeAllPlants(statsData);

    console.log(`\n📈 RESULTS:`);
    console.log(`  Total Plants: ${analysis.totalPlants}`);
    console.log(`  Healthy Plants: ${analysis.healthyPlants}`);
    console.log(`  Plants with Issues: ${analysis.plantsWithIssues}`);
    console.log(`  Health Score: ${analysis.insights.healthScore}%`);

    if (analysis.anomalies.length > 0) {
        console.log(`\n⚠️  ANOMALIES FOUND (${analysis.anomalies.length}):`);
        analysis.anomalies.slice(0, 5).forEach((a, idx) => {
            console.log(`\n  ${idx + 1}. ${a.plantName}`);
            console.log(`     Severity: ${a.severity}`);
            console.log(`     Issues: ${a.issues.map(i => i.message).join(', ')}`);
        });
    } else {
        console.log('\n✅ No anomalies detected');
    }
}

debugAIVision().catch(console.error);
