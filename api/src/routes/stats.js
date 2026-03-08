const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { SolarmanClient } = require('../solarmanClient');
const fs = require('fs');
const path = require('path');

const client = new SolarmanClient();
const CACHE_FILE = path.join(__dirname, '../../dashboard_cache.json');

// --- IN-MEMORY CACHE ---
let cachedStats = null;
let lastFetchTime = 0;
let isFetching = false;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load cache from disk on startup
try {
    if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        cachedStats = JSON.parse(raw);
        if (cachedStats.metadata && cachedStats.metadata.fetchedAt) {
            lastFetchTime = Date.parse(cachedStats.metadata.fetchedAt);
        }
        console.log('💾 Loaded stats from disk cache');
    }
} catch (err) {
    console.error('⚠️ Failed to load disk cache:', err.message);
}

// Helper to extract city from address
function extractCity(customer, station) {
    if (customer?.city) return customer.city;

    // Try to extract from address
    const address = customer?.address || station?.locationAddress || station?.location || '';

    // Common patterns for Brazilian addresses
    const cityPatterns = [
        /[-–]\s*([A-ZÇÃÕÁÉÍÓÚ][a-zçãõáéíóúâêôà]+(?:\s+[a-zçãõáéíóúâêôà]+)*)\s*[-–]\s*[A-Z]{2}/i, // "- Cidade - GO"
        /,\s*([A-ZÇÃÕÁÉÍÓÚ][a-zçãõáéíóúâêôà]+(?:\s+[a-zçãõáéíóúâêôà]+)*)\s*[-–]\s*[A-Z]{2}/i, // ", Cidade - GO"
        /([A-ZÇÃÕÁÉÍÓÚ][a-zçãõáéíóúâêôà]+(?:\s+[a-zçãõáéíóúâêôà]+)*)\s*[-–]\s*GO/i, // "Cidade - GO"
    ];

    for (const pattern of cityPatterns) {
        const match = address.match(pattern);
        if (match) return match[1].trim();
    }

    // Fallback: look for known cities
    const knownCities = ['Goiânia', 'Aparecida de Goiânia', 'Senador Canedo', 'Trindade', 'Anápolis', 'Itapaci', 'Caldas Novas'];
    for (const city of knownCities) {
        if (address.includes(city)) return city;
    }

    return '-';
}

// Function to fetch stats in the background
const updateStatsInBackground = async () => {
    if (isFetching) return;
    isFetching = true;
    console.log('🔄 Background update: Starting stats refresh...');

    try {
        // 1. Get all stations from Solarman
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];
        console.log(`Found ${stations.length} stations`);

        // 2. Database stats & Customer Info
        const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        const { data: allTickets } = await supabase
            .from('tickets')
            .select('status, created_at, expected_execution_time, customer_id');

        console.log(`🎫 DEBUG: Found ${allTickets?.length} tickets total.`);
        if (allTickets?.length > 0) {
            console.log('🎫 DEBUG Sample Ticket:', JSON.stringify(allTickets[0]));
        }

        // Fetch Customer Mapping
        const { data: customerStations } = await supabase
            .from('customer_stations')
            .select('station_id, customer_id');

        const { data: customers } = await supabase
            .from('customers')
            .select('id, customer_type, full_name, company_name, city');

        // Create Map: StationID -> Customer Info
        const stationCustomerMap = {};
        if (customerStations && customers) {
            customerStations.forEach(link => {
                const customer = customers.find(c => c.id === link.customer_id);
                if (customer) {
                    // Map name based on type
                    const name = customer.customer_type === 'pj' ? customer.company_name : customer.full_name;
                    stationCustomerMap[link.station_id] = { ...customer, name };
                }
            });
        }
        console.log(`🎫 DEBUG: stationCustomerMap size: ${Object.keys(stationCustomerMap).length}`);
        if (Object.keys(stationCustomerMap).length > 0) {
            console.log(`🎫 DEBUG: Sample Map Key: ${Object.keys(stationCustomerMap)[0]}`);
        }

        const now = new Date();
        const ticketStats = {
            total: allTickets?.length || 0,
            untreated: allTickets?.filter(t => t.status === 'open' || t.status === 'in_opening').length || 0,
            in_execution: allTickets?.filter(t => t.status === 'in_execution' || t.status === 'visit_scheduled').length || 0,
            delayed: allTickets?.filter(t => {
                if (!t.expected_execution_time) return false;
                return new Date(t.expected_execution_time) < now && t.status !== 'closed';
            }).length || 0
        };

        // 3. Aggregate basic station data
        let currentPowerW = 0;
        let installedCapacitykW = 0;
        stations.forEach(s => {
            const isOffline = s.networkStatus === 'ALL_OFFLINE' || s.networkStatus === 'NO_DEVICE';
            const cleanPower = isOffline ? 0 : (s.generationPower || 0);
            currentPowerW += cleanPower;
            installedCapacitykW += (s.installedCapacity || 0);
        });

        const currentPowerMW = currentPowerW / 1_000_000;
        const installedCapacityMWp = installedCapacitykW / 1_000;
        const productionPercent = installedCapacitykW > 0 ? ((currentPowerW / 1_000) / installedCapacitykW) * 100 : 0;

        // 4. Fetch Historical Data
        // const now = new Date(); // Removed duplicate declaration
        // Adjust for Brazil Time (UTC-3) manually to ensure consistency
        const brazilTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);

        const todayStr = brazilTime.toISOString().split('T')[0];
        const yearStr = `${brazilTime.getFullYear()}`;

        // Previous Month Calculation
        const prevMonthDate = new Date(brazilTime);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        // Current Month String
        const currentMonthStr = `${brazilTime.getFullYear()}-${String(brazilTime.getMonth() + 1).padStart(2, '0')}`;

        // Calculate 30 days ago for daily data (still useful for charts/tables if needed)
        const thirtyDaysAgo = new Date(brazilTime);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // ROBUST SETTINGS: Batch 5 + 200ms delay
        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_BATCHES = 200;

        let todayGenerationkWh = 0;
        let monthGenerationkWh = 0;
        let yearGenerationkWh = 0;
        let totalGenerationkWh = 0;
        let successCount = 0;
        let failCount = 0;

        const stationsDetail = [];

        const fetchWithRetry = async (fn, retries = 2) => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await fn();
                } catch (err) {
                    if (i === retries - 1) throw err;
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        };

        const processBatch = async (batch) => {
            const batchPromises = batch.map(async (station) => {
                try {
                    const promises = [
                        fetchWithRetry(() => client.stationHistorical({ stationId: station.id, timeType: 2, startTime: todayStr, endTime: todayStr }))
                            .catch(e => ({ stationDataItems: [] })),
                        // Use timeType 3 for Monthly data (fetching Current Month)
                        fetchWithRetry(() => client.stationHistorical({ stationId: station.id, timeType: 3, startTime: currentMonthStr, endTime: currentMonthStr }))
                            .catch(e => ({ stationDataItems: [] })),
                        fetchWithRetry(() => client.stationHistorical({ stationId: station.id, timeType: 2, startTime: thirtyDaysAgoStr, endTime: todayStr }))
                            .catch(e => ({ stationDataItems: [] })),
                        fetchWithRetry(() => client.stationHistorical({ stationId: station.id, timeType: 4, startTime: yearStr, endTime: yearStr }))
                            .catch(e => ({ stationDataItems: [] })),
                        fetchWithRetry(() => client.stationRealTime(station.id))
                            .catch(e => ({})),
                        // Fetch alerts for ALL stations (online and offline) - last 30 days
                        fetchWithRetry(() => client.stationAlarms({
                            stationId: station.id,
                            startTime: thirtyDaysAgoStr,
                            endTime: todayStr
                        }))
                            .catch(e => ({ stationAlertItems: [] }))
                    ];

                    const results = await Promise.all(promises);
                    const [todayData, monthData, dailyData, yearData, realTimeData, alertsData] = results;

                    const todayVal = todayData.stationDataItems?.[0]?.generationValue || 0;
                    const monthVal = monthData.stationDataItems?.[0]?.generationValue || 0;
                    const yearVal = yearData.stationDataItems?.[0]?.generationValue || 0;
                    const totalVal = realTimeData.generationTotal || 0;
                    const alertCount = alertsData?.stationAlertItems?.length || 0;

                    // Log if alerts found (DEBUG)
                    if (alertCount > 0) {
                        console.log(`🚨 Alert found for station ${station.name} (${station.id}): ${alertCount}`);
                    }

                    // Calculate 15d and 30d from daily data (keep for table display if needed)
                    const dailyItems = dailyData.stationDataItems || [];
                    let last15dVal = 0;
                    let last30dVal = 0;

                    if (dailyItems.length > 0) {
                        // Sum all days for 30d
                        last30dVal = dailyItems.reduce((sum, item) => sum + (item.generationValue || 0), 0);

                        // Sum last 15 days for 15d
                        const last15Items = dailyItems.slice(-15);
                        last15dVal = last15Items.reduce((sum, item) => sum + (item.generationValue || 0), 0);
                    }

                    const customer = stationCustomerMap[station.id];
                    const city = extractCity(customer, station);

                    // Calculate Open Tickets for this station's customer
                    let openTicketCount = 0;
                    if (customer && allTickets) {
                        const customerTickets = allTickets.filter(t => t.customer_id === customer.id);
                        const openTickets = customerTickets.filter(t =>
                            t.status === 'open' || t.status === 'in_opening' || t.status === 'in_execution' || t.status === 'visit_scheduled'
                        );
                        openTicketCount = openTickets.length;

                        if (openTicketCount > 0) {
                            console.log(`🎫 DEBUG: Station ${station.name} (CustID: ${customer.id}) has ${openTicketCount} open tickets.`);
                        }
                    }

                    return {
                        id: station.id,
                        name: station.name,
                        location: station.location,
                        latitude: station.locationLat,
                        longitude: station.locationLng,
                        status: station.generationPower > 0 ? 'online' : 'offline',
                        networkStatus: station.networkStatus,
                        installedCapacity: station.installedCapacity,
                        generationPower: station.generationPower,
                        lastUpdateTime: realTimeData.lastUpdateTime || station.lastUpdateTime,
                        owner: customer ? customer.name : (station.ownerName || '-'),
                        city: city,
                        customerId: customer?.id || null,
                        alertCount: alertCount,
                        openTicketCount: openTicketCount,
                        stats: {
                            today: todayVal,
                            month: monthVal, // Using Previous Month Value
                            last15d: last15dVal,
                            last30d: last30dVal,
                            year: yearVal,
                            total: totalVal
                        }
                    };
                } catch (err) {
                    return { error: true, id: station.id };
                }
            });
            return await Promise.all(batchPromises);
        };

        for (let i = 0; i < stations.length; i += BATCH_SIZE) {
            const batch = stations.slice(i, i + BATCH_SIZE);
            const results = await processBatch(batch);

            results.forEach((data) => {
                if (!data.error) {
                    todayGenerationkWh += data.stats.today;
                    monthGenerationkWh += data.stats.month;
                    yearGenerationkWh += data.stats.year;
                    totalGenerationkWh += data.stats.total;
                    stationsDetail.push(data);
                    successCount++;
                } else {
                    failCount++;
                }
            });

            if (i + BATCH_SIZE < stations.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }

            if ((i + BATCH_SIZE) % 100 === 0) {
                console.log(`🔄 Progress: ${Math.min(i + BATCH_SIZE, stations.length)}/${stations.length} stations...`);
            }
        }

        // Calculate final values
        const todayGenerationMWh = todayGenerationkWh / 1000;
        const monthGenerationMWh = monthGenerationkWh / 1000;
        const yearGenerationMWh = yearGenerationkWh / 1000;
        const yearGenerationGWh = yearGenerationkWh / 1000000;

        const totalGenerationMWh = totalGenerationkWh / 1000;
        const totalGenerationGWh = totalGenerationkWh / 1000000;

        const tariffPerKWh = 0.75;

        // Update Cache
        cachedStats = {
            stations: {
                total: stations.length,
                online: stations.filter(s => s.generationPower > 0).length,
                offline: stations.filter(s => s.generationPower === 0).length
            },
            customers: { total: customersCount || 0 },
            power: {
                currentW: currentPowerW,
                currentKW: currentPowerW / 1000,
                currentMW: currentPowerMW,
                installedKWp: installedCapacitykW,
                installedMWp: installedCapacityMWp,
                productionPercent: productionPercent
            },
            modules: { total: 0 },
            tickets: ticketStats,
            generation: {
                today: { kWh: todayGenerationkWh, MWh: todayGenerationMWh, gain: todayGenerationkWh * tariffPerKWh },
                month: { kWh: monthGenerationkWh, MWh: monthGenerationMWh, gain: monthGenerationkWh * tariffPerKWh },
                year: { kWh: yearGenerationkWh, MWh: yearGenerationMWh, GWh: yearGenerationGWh, gain: yearGenerationkWh * tariffPerKWh },
                total: { kWh: totalGenerationkWh, MWh: totalGenerationMWh, GWh: totalGenerationGWh, gain: totalGenerationkWh * tariffPerKWh }
            },
            stationsDetail: stationsDetail,
            metadata: {
                fetchedAt: new Date().toISOString(),
                stationsFetched: successCount,
                stationsTotal: stations.length,
                stationsFailed: failCount,
                isPartialData: failCount > 0
            }
        };

        // Save to disk
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedStats, null, 2));
        console.log('💾 Saved stats to disk cache');

        lastFetchTime = Date.now();
        isFetching = false;
        console.log(`✅ Stats updated! Today: ${todayGenerationMWh.toFixed(2)} MWh, Total: ${totalGenerationGWh.toFixed(3)} GWh`);

    } catch (error) {
        console.error('❌ Background update failed:', error);
        isFetching = false;
    }
};

// Start initial fetch
updateStatsInBackground();

// GET /stats/dashboard - Get aggregated dashboard statistics
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        if (cachedStats) {
            if (Date.now() - lastFetchTime > CACHE_DURATION) {
                updateStatsInBackground();
            }
            return res.json(cachedStats);
        }

        if (isFetching) {
            console.log('⏳ Waiting for initial stats fetch...');
            let attempts = 0;
            while (isFetching && attempts < 60) {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
                if (cachedStats) return res.json(cachedStats);
            }
        }

        if (!cachedStats) {
            await updateStatsInBackground();
            return res.json(cachedStats);
        }

        res.json(cachedStats);

    } catch (error) {
        console.error('❌ Error fetching dashboard statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics',
            details: error.message
        });
    }
});

// PUT /stats/station/:id/customer - Update station owner and city
router.put('/station/:id/customer', authMiddleware, async (req, res) => {
    try {
        const stationId = req.params.id;
        const { name, city } = req.body;

        console.log(`📝 Updating station ${stationId}: name="${name}", city="${city}"`);

        if (!name && !city) {
            return res.status(400).json({ error: 'At least name or city is required' });
        }

        // Check if station is already linked to a customer
        const { data: existingLink, error: linkQueryError } = await supabase
            .from('customer_stations')
            .select(`
                customer_id,
                customers (
                    customer_type
                )
            `)
            .eq('station_id', stationId)
            .single();

        let customerId;

        if (existingLink && !linkQueryError) {
            // Update existing customer
            customerId = existingLink.customer_id;
            const customerType = existingLink.customers?.customer_type || 'pf';

            const updateData = {};
            if (name) {
                // Use full_name for PF, company_name for PJ
                if (customerType === 'pf') {
                    updateData.full_name = name;
                } else {
                    updateData.company_name = name;
                }
            }
            if (city) updateData.city = city;

            const { error: updateError } = await supabase
                .from('customers')
                .update(updateData)
                .eq('id', customerId);

            if (updateError) throw updateError;
        } else {
            // Create new customer (default to PF type)
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    customer_type: 'pf',
                    full_name: name || '-',
                    cpf: '00000000000', // Dummy CPF to satisfy constraint
                    city: city || '-',
                    email: `station-${stationId}@temp.com`,
                    phone: '00000000000',
                    cep: '00000000',
                    street: '-',
                    neighborhood: '-',
                    state: 'GO'
                })
                .select()
                .single();

            if (createError) throw createError;
            customerId = newCustomer.id;

            // Link station to customer
            const { error: linkError } = await supabase
                .from('customer_stations')
                .insert({ station_id: stationId, customer_id: customerId });

            if (linkError) throw linkError;
        }

        // Update cache immediately
        if (cachedStats && cachedStats.stationsDetail) {
            const stationIndex = cachedStats.stationsDetail.findIndex(s => s.id == stationId);
            if (stationIndex !== -1) {
                if (name) cachedStats.stationsDetail[stationIndex].owner = name;
                if (city) cachedStats.stationsDetail[stationIndex].city = city;
                cachedStats.stationsDetail[stationIndex].customerId = customerId;

                // Save updated cache to disk
                fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedStats, null, 2));
            }
        }

        res.json({ success: true, customerId });

    } catch (error) {
        console.error('❌ Error updating station customer:', error);
        res.status(500).json({
            error: 'Failed to update station customer',
            details: error.message
        });
    }
});

module.exports = router;
