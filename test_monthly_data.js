require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function testMonthlyData() {
    const client = new SolarmanClient();

    // Test station ID (use one that has data)
    const testStationId = 15996;

    console.log('🔍 Testing different timeType values for monthly data...\n');

    // Current date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    console.log(`📅 Testing for month: ${monthStr}\n`);

    // Test timeType 3 (monthly)
    try {
        console.log('Testing timeType: 3 (monthly)...');
        const monthlyData = await client.stationHistorical({
            stationId: testStationId,
            timeType: 3,
            startTime: monthStr,
            endTime: monthStr
        });

        console.log('✅ Monthly data (timeType 3):');
        console.log(JSON.stringify(monthlyData, null, 2));

        if (monthlyData.stationDataItems && monthlyData.stationDataItems.length > 0) {
            const monthValue = monthlyData.stationDataItems[0].generationValue;
            console.log(`\n📊 Month generation: ${monthValue} kWh`);
        }
    } catch (error) {
        console.error('❌ Error with timeType 3:', error.message);
    }

    console.log('\n---\n');

    // Test timeType 4 (yearly) for comparison
    try {
        console.log('Testing timeType: 4 (yearly)...');
        const yearlyData = await client.stationHistorical({
            stationId: testStationId,
            timeType: 4,
            startTime: String(year),
            endTime: String(year)
        });

        console.log('✅ Yearly data (timeType 4):');
        if (yearlyData.stationDataItems && yearlyData.stationDataItems.length > 0) {
            const yearValue = yearlyData.stationDataItems[0].generationValue;
            console.log(`📊 Year generation: ${yearValue} kWh`);
        }
    } catch (error) {
        console.error('❌ Error with timeType 4:', error.message);
    }
}

testMonthlyData().catch(console.error);
