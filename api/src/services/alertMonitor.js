const cron = require('node-cron');
const { SolarmanClient } = require('../solarmanClient');
const supabase = require('../config/supabase');
const { generateTicketDetails } = require('./aiTicketGenerator');
const { createAutoTicket } = require('./autoTicketCreator');

const solarman = new SolarmanClient();

// Cache to avoid hitting DB too often for mapping
const deviceCustomerCache = new Map();

async function updateDeviceCustomerCache() {
    try {
        const { data, error } = await supabase
            .from('customer_stations')
            .select('customer_id, station_id');

        if (error) throw error;

        if (data) {
            // For now, we'll use station-based mapping since customer_inverters doesn't have device_sn
            // We'll need to fetch devices from stations later
            data.forEach(item => {
                if (item.station_id) {
                    deviceCustomerCache.set(item.station_id, {
                        customerId: item.customer_id,
                        stationId: item.station_id
                    });
                }
            });
        }

        console.log(`[AlertMonitor] Cached ${deviceCustomerCache.size} station-customer mappings`);
    } catch (error) {
        console.error('Error updating device cache:', error);
    }
}

async function checkAlerts() {
    const now = new Date();
    const hour = now.getHours();

    // Time restriction: Don't generate tickets between 18:00 and 05:00
    // 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4
    if (hour >= 18 || hour < 5) {
        console.log(`[AlertMonitor] Skipping checks due to time restriction (${hour}h).`);
        return;
    }

    console.log('[AlertMonitor] Checking for new alerts...');

    try {
        // Ensure cache is populated
        if (deviceCustomerCache.size === 0) {
            await updateDeviceCustomerCache();
        }

        // Fetch active alerts from Solarman
        const { stationList } = await solarman.stationListAll();

        for (const station of stationList) {
            try {
                // Check if this station belongs to a customer
                const mapping = deviceCustomerCache.get(String(station.id));
                if (!mapping) {
                    continue; // Skip stations not linked to customers
                }

                // Fetch alerts for this station
                const alertsData = await solarman.stationAlarms({ stationId: station.id });
                const alerts = alertsData.stationAlertList || alertsData.list || [];

                for (const alert of alerts) {
                    const alertId = alert.alertId || alert.id;

                    // 1. Check if already processed
                    const { data: existing } = await supabase
                        .from('alert_ticket_mapping')
                        .select('id')
                        .eq('alert_id', String(alertId))
                        .single();

                    if (existing) continue; // Already processed

                    console.log(`[AlertMonitor] New alert found for station ${station.id}: ${alert.alertName || alert.msg}`);

                    // 3. Generate AI Details
                    const inverterData = {
                        modelo: alert.deviceType || 'Inversor',
                        marca: 'Solarman',
                        device_sn: alert.deviceSn || station.id
                    };

                    const aiDetails = await generateTicketDetails(alert, inverterData);

                    // 4. Create Ticket
                    await createAutoTicket({
                        customer_id: mapping.customerId,
                        inverter_id: null, // We don't have inverter_id in this flow
                        description: aiDetails.description,
                        priority: aiDetails.priority,
                        reason: aiDetails.reason,
                        alert_reference: String(alertId),
                        alert_type: alert.alertName || alert.msg || alert.code,
                        alert_time: new Date(alert.startTime || Date.now())
                    });

                    console.log(`[AlertMonitor] Ticket created for alert ${alertId}`);
                }
            } catch (err) {
                console.error(`Error checking station ${station.id}:`, err.message);
            }
        }

    } catch (error) {
        console.error('[AlertMonitor] Error in checkAlerts:', error);
    }
}

function startMonitoring() {
    // Run every minute for near real-time detection
    cron.schedule('* * * * *', checkAlerts);
    console.log('[AlertMonitor] Monitoring started (every 1 min).');

    // Initial check
    setTimeout(checkAlerts, 5000);
}

module.exports = { startMonitoring };
