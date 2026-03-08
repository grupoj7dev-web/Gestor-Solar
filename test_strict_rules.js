const { detectAnomalies } = require('./api/src/services/ai-vision-service');

// Mock helpers
const originalDate = Date;
function setMockTime(hour) {
    global.Date = class extends originalDate {
        getHours() { return hour; }
    };
}

function resetTime() {
    global.Date = originalDate;
}

// Test Cases
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
        plant: { id: 2, name: 'Good Plant', installedCapacity: 50, generationPower: 40000 },
        expectAnomaly: false
    },
    {
        name: 'Low Generation - Removed Rule (12:00)',
        hour: 12,
        plant: { id: 3, name: 'Low Gen Plant', installedCapacity: 50, generationPower: 5000 }, // 10% eff
        expectAnomaly: false // Should NOT trigger anymore
    },
    {
        name: 'Zero Generation Day (12:00)',
        hour: 12,
        plant: { id: 4, name: 'Zero Gen Plant', installedCapacity: 50, generationPower: 0, stats: { today: 0 } },
        expectAnomaly: true,
        expectType: 'ZERO_GENERATION_DAYTIME'
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
    const typeMatch = !test.expectAnomaly || (resultType === test.expectType);

    if (isSuccess && typeMatch) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
    } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Expected: ${test.expectAnomaly ? test.expectType : 'None'}`);
        console.log(`   Got: ${resultType || 'None'}`);
    }
});

console.log(`\n--- RESULTS: ${passed}/${tests.length} PASSED ---`);
