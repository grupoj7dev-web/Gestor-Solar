const express = require('express');
const router = express.Router();
const { SolarmanClient } = require('../solarmanClient');
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');

const client = new SolarmanClient();

function normalizeProvider(provider) {
    const value = String(provider || 'solarman').trim().toLowerCase();
    return value || 'solarman';
}

// Get all available stations from Solarman
router.get('/available', authMiddleware, async (req, res) => {
    try {
        const size = Number(req.query.size || 100);
        // Using stationListAll to fetch all stations
        const data = await client.stationListAll({ size });

        // Map to simplified format
        const stations = (data.stationList || []).map(s => ({
            id: String(s.id),
            name: s.name,
            location: s.location,
            status: s.generationPower > 0 ? 'online' : 'offline',
            capacity: s.installedCapacity
        }));

        res.json(stations);
    } catch (error) {
        console.error('Error fetching available stations:', error);
        res.status(500).json({ error: 'Failed to fetch stations from Solarman' });
    }
});

// Get all linked stations
router.get('/linked', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customer_stations')
            .select(`
                *,
                customer:customers(id, full_name, company_name, customer_type)
            `);

        if (error) throw error;

        res.json((data || []).map((item) => ({
            ...item,
            provider: normalizeProvider(item.provider),
        })));
    } catch (error) {
        console.error('Error fetching linked stations:', error);
        res.status(500).json({ error: 'Failed to fetch linked stations' });
    }
});

// Get customer linked to a specific station
router.get('/:id/customer', authMiddleware, async (req, res) => {
    try {
        const stationId = req.params.id;
        const provider = normalizeProvider(req.query.provider);

        const { data, error } = await supabase
            .from('customer_stations')
            .select(`
                customer_id,
                station_id,
                station_name,
                provider,
                notes,
                customer:customers(id, full_name, company_name, customer_type)
            `)
            .eq('station_id', stationId)
            .eq('provider', provider)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return res.status(404).json({ error: 'No customer linked to this station' });
            }
            throw error;
        }

        res.json({
            ...data,
            provider: normalizeProvider(data.provider),
        });
    } catch (error) {
        console.error('Error fetching station customer:', error);
        res.status(500).json({ error: 'Failed to fetch station customer' });
    }
});


// Get station realtime data
router.get('/:id/realtime', authMiddleware, async (req, res) => {
    try {
        const stationId = req.params.id;
        const data = await client.stationRealTime(Number(stationId));
        res.json(data);
    } catch (error) {
        console.error('Error fetching station realtime data:', error);
        res.status(500).json({ error: 'Failed to fetch realtime data' });
    }
});

// Get station devices realtime data (detailed)
router.get('/:id/devices/realtime', authMiddleware, async (req, res) => {
    try {
        const stationId = req.params.id;
        // Fetch detailed data for Inverters (deviceType: 'INVERTER')
        // You might want to make deviceType optional or fetch all
        const data = await client.stationDevicesRealtime({
            stationId: Number(stationId),
            deviceType: 'INVERTER'
        });
        res.json(data);
    } catch (error) {
        console.error('Error fetching station devices realtime data:', error);
        res.status(500).json({ error: 'Failed to fetch devices realtime data' });
    }
});

// Get station today's data (includes peak power)
router.get('/:id/today', authMiddleware, async (req, res) => {
    try {
        const stationId = req.params.id;
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        // Fetch today's intraday data (timeType: 1 = frame dimension)
        const data = await client.stationHistorical({
            stationId: Number(stationId),
            timeType: 1,
            startTime: dateStr,
            endTime: dateStr
        });

        let peakPower = 0;
        if (data.stationDataItems && data.stationDataItems.length > 0) {
            // Calculate max power from the list
            peakPower = data.stationDataItems.reduce((max, item) => {
                const power = item.generationPower || item.power || 0;
                return power > max ? power : max;
            }, 0);
        }

        res.json({ peakPower });
    } catch (error) {
        console.error('Error fetching station today data:', error);
        res.status(500).json({ error: 'Failed to fetch today data' });
    }
});

// Get station alerts
router.get('/:id/alerts', authMiddleware, async (req, res) => {
    try {
        const stationId = req.params.id;
        const { page = 1, size = 20, startTime, endTime } = req.query;

        // Default to last 30 days if no dates provided
        let start = startTime;
        let end = endTime;

        if (!start || !end) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            start = startDate.toISOString().split('T')[0];
            end = endDate.toISOString().split('T')[0];
        }

        const data = await client.stationAlarms({
            stationId: Number(stationId),
            startTime: start,
            endTime: end,
            page: Number(page),
            size: Number(size)
        });

        console.log('Alerts Response:', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        console.error('Error fetching station alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Get station reports (KPIs)
router.get('/:id/reports', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { period = 'month' } = req.query;

        // 1. Determine Date Range
        const endTime = new Date();
        const startTime = new Date();
        let timeType = 2; // Default to Daily

        if (period === 'month') {
            startTime.setDate(startTime.getDate() - 30);
        } else if (period === 'quarter') {
            startTime.setDate(startTime.getDate() - 90);
        } else if (period === 'year') {
            startTime.setFullYear(startTime.getFullYear() - 1);
            timeType = 3; // Monthly
        }

        const formatDate = (d) => d.toISOString().split('T')[0];

        // 2. Fetch Solarman Data in Parallel
        const [stationData, historicalRes, alarmsRes] = await Promise.all([
            client.getStationById(id),
            client.stationHistorical({
                stationId: id,
                timeType,
                startTime: formatDate(startTime),
                endTime: formatDate(endTime)
            }),
            client.stationAlarms({
                stationId: id,
                startTime: formatDate(startTime),
                endTime: formatDate(endTime)
            })
        ]);

        // 3. Fetch Customer & Tickets
        let tickets = [];
        const { data: link } = await supabase
            .from('customer_stations')
            .select('customer_id')
            .eq('station_id', id)
            .eq('provider', 'solarman')
            .single();

        if (link?.customer_id) {
            const { data: ticketsData } = await supabase
                .from('tickets')
                .select('*')
                .eq('customer_id', link.customer_id)
                .gte('created_at', startTime.toISOString());
            tickets = ticketsData || [];
        }

        // 4. Calculate KPIs

        // Availability & PR & kWh/kWp
        const capacity = stationData?.capacity || 0; // in kW
        // Use stationDataItems for daily data (timeType 2)
        const generationList = historicalRes.stationDataItems || historicalRes.stationHistoryItems || [];
        let totalGeneration = 0;
        let daysWithGeneration = 0;

        generationList.forEach(item => {
            const val = parseFloat(item.generationValue || item.value || 0);
            if (val > 0) {
                totalGeneration += val;
                daysWithGeneration++;
            }
        });

        const totalDays = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
        let availability = totalDays > 0 ? (daysWithGeneration / totalDays) * 100 : 0;
        if (availability > 100) availability = 100;

        const kwhPerKwp = capacity > 0 ? totalGeneration / capacity : 0;

        // Estimated PR (Simplified: Actual / (Capacity * AvgIrradiance * Days))
        // Assuming Avg Irradiance ~ 4.5 kWh/m2/day
        const theoreticalMax = capacity * 4.5 * totalDays;
        const pr = theoreticalMax > 0 ? (totalGeneration / theoreticalMax) * 100 : 0;

        // Alarms
        const alarms = { critical: 0, warning: 0, info: 0 };
        const alarmList = alarmsRes.stationAlertItems || alarmsRes.alertList || [];
        alarmList.forEach(a => {
            const level = String(a.level);
            if (level === '1') alarms.critical++;
            else if (level === '2') alarms.warning++;
            else alarms.info++;
        });

        // Tickets & SLA
        const totalTickets = tickets.length;
        const openTickets = tickets.filter(t => t.status !== 'closed').length;
        const closedTickets = tickets.filter(t => t.status === 'closed').length;

        // Calculate MTTA (Time to Initial Response)
        let totalResponseTime = 0;
        let responseCount = 0;
        tickets.forEach(t => {
            if (t.initial_response_at && t.created_at) {
                const diff = (new Date(t.initial_response_at) - new Date(t.created_at)) / (1000 * 60 * 60); // hours
                totalResponseTime += diff;
                responseCount++;
            }
        });
        const mtta = responseCount > 0 ? totalResponseTime / responseCount : 0;

        // Calculate MTTR (Time to Resolution)
        let totalResolutionTime = 0;
        let resolutionCount = 0;
        tickets.forEach(t => {
            if (t.closed_at && t.created_at) {
                const diff = (new Date(t.closed_at) - new Date(t.created_at)) / (1000 * 60 * 60); // hours
                totalResolutionTime += diff;
                resolutionCount++;
            }
        });
        const mttr = resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0;

        // SLA Compliance
        let compliantTickets = 0;
        let ticketsWithSLA = 0;
        tickets.forEach(t => {
            if (t.closed_at && t.expected_execution_time) {
                ticketsWithSLA++;
                if (new Date(t.closed_at) <= new Date(t.expected_execution_time)) {
                    compliantTickets++;
                }
            }
        });
        const slaCompliance = ticketsWithSLA > 0 ? (compliantTickets / ticketsWithSLA) * 100 : 100;

        res.json({
            availability: parseFloat(availability.toFixed(1)),
            pr: parseFloat(pr.toFixed(1)),
            kwhPerKwp: parseFloat(kwhPerKwp.toFixed(1)),
            alarms,
            tickets: {
                total: totalTickets,
                open: openTickets,
                closed: closedTickets,
                avgResolutionTime: parseFloat(mttr.toFixed(1))
            },
            sla: {
                compliance: parseFloat(slaCompliance.toFixed(1)),
                mtta: parseFloat(mtta.toFixed(1)),
                mttr: parseFloat(mttr.toFixed(1))
            }
        });

    } catch (error) {
        console.error('Error fetching station reports:', error);
        res.status(500).json({ error: 'Server error fetching reports' });
    }
});

module.exports = router;
