require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { SolarmanClient } = require('./api/src/solarmanClient');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CUSTOMER_ID = '8d37142d-4d3b-46cf-8b5f-e6041e142668';

async function debug() {
    try {
        console.log(`Searching for station for customer: ${CUSTOMER_ID}`);
        const { data: link, error } = await supabase
            .from('customer_stations')
            .select('station_id')
            .eq('customer_id', CUSTOMER_ID)
        if (error || !link || link.length === 0) {
            console.error('Customer station not found in DB:', error);
            return;
        }

        console.log(`Found ${link.length} stations.`);
        const client = new SolarmanClient();
        await client.obtainToken();

        for (const l of link) {
            const stationId = l.station_id;
            console.log(`\n=== Station ID: ${stationId} ===`);

            try {
                // 1. Realtime Data
                const realtime = await client.stationRealTime(stationId);
                console.log('Realtime Data:');
                console.log(`  Generation Power: ${realtime.generationPower} W`);
                console.log(`  Last Update: ${realtime.lastUpdateTime} (${new Date(realtime.lastUpdateTime * 1000).toLocaleString()})`);
                console.log(`  Day Energy (Realtime): ${realtime.dayEnergy}`);
                console.log(`  Total Energy: ${realtime.generationTotal}`);

                // 2. Historical Data (Today)
                const today = new Date().toISOString().split('T')[0];
                const history = await client.stationHistorical({
                    stationId: stationId,
                    timeType: 2,
                    startTime: today,
                    endTime: today
                });

                let dayEnergy = 0;
                if (history.stationDataItems && history.stationDataItems.length > 0) {
                    dayEnergy = history.stationDataItems[0].generationValue;
                }
                console.log(`  Day Energy (History): ${dayEnergy}`);

            } catch (e) {
                console.error(`  Error fetching data for station ${stationId}:`, e.message);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

debug();
