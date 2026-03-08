const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { SolarmanClient } = require('../solarmanClient');

// GET /customers/:customerId/invoices - List invoices with filters
router.get('/:customerId/invoices', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { month, year, status } = req.query;

        let query = supabase
            .from('invoices')
            .select('*')
            .eq('customer_id', customerId);

        if (month) {
            query = query.eq('reference_month', parseInt(month));
        }

        if (year) {
            query = query.eq('reference_year', parseInt(year));
        }

        if (status) {
            query = query.eq('status', status);
        }

        query = query.order('reference_year', { ascending: false })
            .order('reference_month', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /invoices/:id - Get single invoice
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /customers/:customerId/invoices - Create invoice
router.post('/:customerId/invoices', async (req, res) => {
    try {
        const { customerId } = req.params;
        const {
            reference_month,
            reference_year,
            reading_previous,
            reading_current,
            consumption_kwh,
            storage_kwh,
            amount,
            due_date,
            status,
            pdf_url,
            notes
        } = req.body;

        const { data, error } = await supabase
            .from('invoices')
            .insert({
                customer_id: customerId,
                reference_month,
                reference_year,
                reading_previous,
                reading_current,
                consumption_kwh,
                storage_kwh: storage_kwh || 0,
                amount,
                due_date,
                status: status || 'pending',
                pdf_url,
                notes
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Invoice for this month/year already exists' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /invoices/:id - Update invoice
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};

        // Only include fields that are provided
        const fields = [
            'reference_month', 'reference_year', 'reading_previous', 'reading_current',
            'consumption_kwh', 'storage_kwh', 'amount', 'due_date', 'status',
            'paid_at', 'pdf_url', 'notes'
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const { data, error } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /invoices/:id - Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            throw error;
        }

        res.json({ success: true, deleted: data });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /invoices/:id/comparison - Compare invoice with actual generation
router.get('/:id/comparison', async (req, res) => {
    try {
        const { id } = req.params;

        // Get invoice data with customer stations
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
                *,
                customers!inner (
                    id,
                    stations
                )
            `)
            .eq('id', id)
            .single();

        if (invoiceError) {
            if (invoiceError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            throw invoiceError;
        }

        // Get generation data from Solarman
        let actualGeneration = 0;

        if (invoice.customers?.stations && invoice.customers.stations.length > 0) {
            const client = new SolarmanClient();
            const station = invoice.customers.stations[0];

            try {
                const startTime = `${invoice.reference_year}-${String(invoice.reference_month).padStart(2, '0')}`;
                const endTime = startTime;

                const historyData = await client.stationHistorical({
                    stationId: station.station_id,
                    timeType: 3, // Monthly
                    startTime,
                    endTime
                });

                if (historyData.stationDataItems && historyData.stationDataItems.length > 0) {
                    actualGeneration = historyData.stationDataItems.reduce(
                        (sum, item) => sum + (item.generationValue || 0),
                        0
                    );
                }
            } catch (error) {
                console.error('Error fetching generation data:', error);
            }
        }

        // Calculate comparison metrics
        const comparison = {
            invoice: {
                month: invoice.reference_month,
                year: invoice.reference_year,
                consumption: invoice.consumption_kwh,
                storage: invoice.storage_kwh,
                amount: invoice.amount
            },
            generation: {
                actual: actualGeneration,
                difference: actualGeneration - invoice.consumption_kwh,
                savings_percentage: invoice.consumption_kwh > 0
                    ? ((actualGeneration / invoice.consumption_kwh) * 100).toFixed(2)
                    : 0
            }
        };

        res.json(comparison);
    } catch (error) {
        console.error('Error generating comparison:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
