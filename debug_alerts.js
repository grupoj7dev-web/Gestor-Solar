require('dotenv').config();
const { SolarmanClient } = require('./api/src/solarmanClient');

async function checkAlerts() {
    const client = new SolarmanClient(
        process.env.SOLARMAN_APP_ID,
        process.env.SOLARMAN_APP_SECRET,
        process.env.SOLARMAN_EMAIL,
        process.env.SOLARMAN_PASSWORD
    );

    try {
        console.log('🔍 Fetching stations...');
        const { stationList } = await client.stationListAll({ size: 100 });

        console.log(`\n📊 Total stations: ${stationList.length}`);

        // Check first 10 stations for alerts
        console.log('\n🚨 Checking alerts for first 10 stations...\n');

        for (let i = 0; i < Math.min(10, stationList.length); i++) {
            const station = stationList[i];
            try {
                const alertsData = await client.stationAlarms({ stationId: station.id });
                const alertCount = alertsData.stationAlertItems?.length || 0;

                if (alertCount > 0) {
                    console.log(`✅ Station: ${station.name}`);
                    console.log(`   ID: ${station.id}`);
                    console.log(`   Alerts: ${alertCount}`);
                    console.log(`   Alert Details:`, JSON.stringify(alertsData.stationAlertItems[0], null, 2));
                    console.log('');
                }
            } catch (err) {
                console.log(`❌ Error fetching alerts for ${station.name}: ${err.message}`);
            }
        }

        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkAlerts();
