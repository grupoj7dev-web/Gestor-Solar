
// Logic copied from ai-vision-service.js for testing
function calculateExpectedGeneration(plant) {
    const now = new Date();
    const hour = now.getHours();

    // Copy of the curve
    const installedCapacityW = (plant.installedCapacity || 0) * 1000;

    if (hour >= 18 || hour < 6) return 0;
    if (hour >= 6 && hour < 7) return installedCapacityW * 0.15;
    if (hour >= 7 && hour < 9) return installedCapacityW * 0.45;
    if (hour >= 9 && hour < 11) return installedCapacityW * 0.70;
    if (hour >= 11 && hour < 14) return installedCapacityW * 0.90;
    if (hour >= 14 && hour < 16) return installedCapacityW * 0.75;
    if (hour >= 16 && hour < 17) return installedCapacityW * 0.50;
    if (hour >= 17 && hour < 18) return installedCapacityW * 0.20;

    return 0;
}

const MONITORING_RULES = {
    LOW_GENERATION: {
        id: 'LOW_GENERATION',
        name: 'Geração Abaixo do Esperado',
        description: 'Geração atual está abaixo de 50% do esperado para o horário',
        severity: 'medium',
        threshold: 50,
        check: (plant, context) => {
            const { isDaytime, expectedPower, efficiency } = context;
            // The problematic rule
            return isDaytime && plant.generationPower > 0 && efficiency < 50 && expectedPower > 100;
        }
    }
};

function detectAnomalies(plant) {
    const now = new Date();
    const hour = now.getHours();
    const isDaytime = hour >= 6 && hour < 18;

    const expectedPower = calculateExpectedGeneration(plant);
    const actualPower = plant.generationPower || 0;
    const efficiency = expectedPower > 0 ? (actualPower / expectedPower) * 100 : 100;

    const context = {
        isDaytime,
        hour,
        expectedPower,
        actualPower,
        efficiency
    };

    const issues = [];
    Object.values(MONITORING_RULES).forEach(rule => {
        if (rule.check(plant, context)) {
            issues.push({
                message: rule.name,
                severity: rule.severity,
                details: `${rule.description} (Atual: ${efficiency.toFixed(1)}%, Limite: ${rule.threshold}%)`
            });
        }
    });

    if (issues.length > 0) return { expectedPower, actualPower, issues };
    return null;
}

// --- TEST CASE ---
const mockPlant = {
    id: 1,
    name: 'Teste Usina',
    installedCapacity: 50, // 50kW
    generationPower: 15000, // 15kW - simulating a cloudy day
};

console.log('--- Current Time Simulation ---');
console.log('Time:', new Date().toLocaleTimeString());
console.log('Hour:', new Date().getHours());
console.log('Installed Capacity:', mockPlant.installedCapacity, 'kW');
console.log('Current Generation:', mockPlant.generationPower / 1000, 'kW');

const anomaly = detectAnomalies(mockPlant);

if (anomaly) {
    console.log('\nAnomaly Detected:');
    console.log('Expected Power:', (anomaly.expectedPower / 1000).toFixed(2), 'kW');
    const eff = (anomaly.actualPower / anomaly.expectedPower * 100);
    console.log('Efficiency:', eff.toFixed(2), '%');
    console.log('Message:', anomaly.issues[0].message);
    console.log('Details:', anomaly.issues[0].details);
} else {
    console.log('\nNo anomalies detected.');
}
