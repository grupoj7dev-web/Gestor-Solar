
// --- COPY OF LOGIC FROM ai-vision-service.js ---

function calculateExpectedGeneration(plant) {
    const now = new Date();
    const hour = now.getHours();

    const installedCapacityW = (plant.installedCapacity || 0) * 1000; // Convert kW to W

    if (hour >= 18 || hour < 6) return 0; // Night
    if (hour >= 6 && hour < 7) return installedCapacityW * 0.10; // Early morning
    if (hour >= 7 && hour < 9) return installedCapacityW * 0.30; // Morning
    if (hour >= 9 && hour < 11) return installedCapacityW * 0.60; // Late morning
    if (hour >= 11 && hour < 14) return installedCapacityW * 0.80; // Peak
    if (hour >= 14 && hour < 16) return installedCapacityW * 0.60; // Afternoon
    if (hour >= 16 && hour < 17) return installedCapacityW * 0.40; // Late afternoon
    if (hour >= 17 && hour < 18) return installedCapacityW * 0.15; // Evening

    return 0;
}

const MONITORING_RULES = {
    // Rule 1: Plant completely offline
    PLANT_OFFLINE: {
        id: 'PLANT_OFFLINE',
        name: 'Planta Offline',
        description: 'Planta completamente offline (sem comunicação)',
        severity: 'critical',
        check: (plant, context) => {
            return plant.networkStatus === 'ALL_OFFLINE' || plant.networkStatus === 'NO_DEVICE';
        }
    },


    // Rule 3: No generation today (total daily generation = 0)
    NO_GENERATION_TODAY: {
        id: 'NO_GENERATION_TODAY',
        name: 'Sem Geração Hoje',
        description: 'Planta não gerou energia hoje (geração diária = 0 kWh)',
        severity: 'high',
        check: (plant, context) => {
            const todayGeneration = plant.stats?.today || 0;
            // Strict rule: only check if it is 12:00 or later
            return todayGeneration === 0 && context.hour >= 12;
        }
    },

    // Rule 4: Device Alerts
    DEVICE_ALERTS: {
        id: 'DEVICE_ALERTS',
        name: 'Alertas de Dispositivo',
        description: 'Inversor reportando alertas ativos',
        severity: 'high',
        check: (plant, context) => {
            // Assuming alertCount or similar property exists on plant object, or derived from status
            return plant.alertCount > 0 || (plant.alerts && plant.alerts.length > 0);
        }
    }
};

function detectAnomalies(plant) {
    const now = new Date();
    const hour = now.getHours();

    // STRICT NIGHTTIME SILENCE: 18:00 to 06:00
    // Ignore ALL alerts/anomalies during this period
    if (hour >= 18 || hour < 6) return null;

    const isDaytime = true; // Since we returned above, it is essentially daytime logic window

    // Calculate expected power and efficiency
    const expectedPower = calculateExpectedGeneration(plant);
    const actualPower = plant.generationPower || 0;
    const efficiency = expectedPower > 0 ? (actualPower / expectedPower) * 100 : 100;

    // Context for rule evaluation
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
                type: rule.id
            });
        }
    });

    if (issues.length > 0) return { issues };
    return null;
}

// --- TEST RUNNER ---

const originalDate = Date;
function setMockTime(hour) {
    global.Date = class extends originalDate {
        getHours() { return hour; }
    };
}

function resetTime() {
    global.Date = originalDate;
}

const tests = [
    {
        name: 'Nighttime Silence (19:00)',
        hour: 19,
        plant: { id: 1, name: 'Night Plant', installedCapacity: 50, generationPower: 0, networkStatus: 'ALL_OFFLINE' },
        expectAnomaly: false
    },
    {
        name: 'Daytime Normal (12:00)',
        hour: 12,
        plant: { id: 2, name: 'Good Plant', installedCapacity: 50, generationPower: 40000, stats: { today: 200 } },
        expectAnomaly: false
    },
    {
        name: 'Low Generation - Removed Rule (12:00)',
        hour: 12,
        plant: { id: 3, name: 'Low Gen Plant', installedCapacity: 50, generationPower: 5000, stats: { today: 50 } }, // 10% eff but has generation
        expectAnomaly: false // Should NOT trigger anymore
    },
    {
        name: 'Zero Generation Day (12:00) - Removed Rule',
        hour: 12,
        plant: { id: 4, name: 'Zero Gen Plant', installedCapacity: 50, generationPower: 0, stats: { today: 200 } }, // Has daily gen to pass NO_GENERATION_TODAY, but 0 instant
        expectAnomaly: false, // Rule Removed
    },
    {
        name: 'No Daily Gen - Before Noon (10:00)',
        hour: 10,
        plant: { id: 5, name: 'Morning lazy', installedCapacity: 50, generationPower: 1000, stats: { today: 0 } },
        expectAnomaly: false // Should NOT trigger before 12h
    },
    {
        name: 'No Daily Gen - After Noon (13:00)',
        hour: 13,
        plant: { id: 6, name: 'Noon lazy', installedCapacity: 50, generationPower: 1000, stats: { today: 0 } },
        expectAnomaly: true,
        expectType: 'NO_GENERATION_TODAY'
    },
    {
        name: 'Plant Offline (Day)',
        hour: 12,
        plant: { id: 7, name: 'Offline Plant', installedCapacity: 50, generationPower: 0, networkStatus: 'ALL_OFFLINE' },
        expectAnomaly: true,
        expectType: 'PLANT_OFFLINE'
    },
    {
        name: 'Device Alerts (Day)',
        hour: 12,
        plant: { id: 8, name: 'Alert Plant', installedCapacity: 50, generationPower: 40000, alertCount: 2 },
        expectAnomaly: true,
        expectType: 'DEVICE_ALERTS'
    }
];

console.log('--- STARTING TESTS ---\n');

let passed = 0;
tests.forEach(test => {
    setMockTime(test.hour);
    const result = detectAnomalies(test.plant);
    resetTime();

    const resultType = result ? result.issues[0].type : null;
    const isSuccess = (test.expectAnomaly && result) || (!test.expectAnomaly && !result);
    // Note: detectAnomalies might return multiple issues, we check if the expected one is present or if it matches the first one
    const typeMatch = !test.expectAnomaly || (result && result.issues.some(i => i.type === test.expectType));

    if (isSuccess && typeMatch) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
    } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Expected: ${test.expectAnomaly ? test.expectType : 'None'}`);
        console.log(`   Got: ${result ? result.issues.map(i => i.type).join(', ') : 'None'}`);
    }
});

console.log(`\n--- RESULTS: ${passed}/${tests.length} PASSED ---`);
