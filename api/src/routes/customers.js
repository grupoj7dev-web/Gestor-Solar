const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { validateCPF, validateCNPJ, validateEmail, validatePhone } = require('../utils/validators');
const authMiddleware = require('../middleware/auth');
const { randomUUID } = require('crypto');

function normalizeProvider(provider) {
    const value = String(provider || 'solarman').trim().toLowerCase();
    return value || 'solarman';
}

// Get all customers
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { customer_type } = req.query;

        let query = supabase
            .from('customers')
            .select(`
                *,
                customer_inverters (count),
                customer_stations (count)
            `)
            .order('created_at', { ascending: false });

        if (customer_type && ['pf', 'pj'].includes(customer_type)) {
            query = query.eq('customer_type', customer_type);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Transform data to include counts as simple properties
        const customers = data.map(c => ({
            ...c,
            inverters_count: c.customer_inverters?.[0]?.count || 0,
            stations_count: c.customer_stations?.[0]?.count || 0
        }));

        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single customer with links
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Fetch linked inverters
        const { data: inverters, error: invError } = await supabase
            .from('customer_inverters')
            .select(`
                *,
                inverter:inverters(*)
            `)
            .eq('customer_id', req.params.id);

        if (invError) throw invError;

        // Fetch linked stations
        const { data: stations, error: stError } = await supabase
            .from('customer_stations')
            .select('*')
            .eq('customer_id', req.params.id);

        if (stError) throw stError;

        // Fetch consumer units
        const { data: units, error: unitsError } = await supabase
            .from('customer_units')
            .select('*')
            .eq('customer_id', req.params.id);

        if (unitsError) throw unitsError;

        // Note: contacts are stored in the customer.contacts JSONB field, not in a separate table

        res.json({
            ...customer,
            inverters: inverters || [],
            stations: (stations || []).map((station) => ({
                ...station,
                provider: normalizeProvider(station.provider),
            })),
            consumer_units: units || []
        });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: error.message || 'Server error', details: error });
    }
});

// --- Inverter Links ---

// Link inverter
router.post('/:id/inverters', authMiddleware, async (req, res) => {
    try {
        const { inverter_id, notes } = req.body;

        const { data, error } = await supabase
            .from('customer_inverters')
            .insert([{
                customer_id: req.params.id,
                inverter_id,
                notes
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Inverter already linked' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error linking inverter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Unlink inverter
router.delete('/:id/inverters/:inverterId', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('customer_inverters')
            .delete()
            .eq('customer_id', req.params.id)
            .eq('inverter_id', req.params.inverterId);

        if (error) throw error;

        res.json({ message: 'Inverter unlinked successfully' });
    } catch (error) {
        console.error('Error unlinking inverter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Station Links ---

// Link station
router.post('/:id/stations', authMiddleware, async (req, res) => {
    try {
        const { station_id, station_name, notes } = req.body;
        const provider = normalizeProvider(req.body.provider);

        const { data, error } = await supabase
            .from('customer_stations')
            .insert([{
                customer_id: req.params.id,
                station_id,
                station_name,
                provider,
                notes
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Station already linked' });
            }
            throw error;
        }

        res.json({
            ...data,
            provider: normalizeProvider(data.provider),
        });
    } catch (error) {
        console.error('Error linking station:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Unlink station
router.delete('/:id/stations/:stationId', authMiddleware, async (req, res) => {
    try {
        const provider = req.query.provider ? normalizeProvider(req.query.provider) : null;
        let query = supabase
            .from('customer_stations')
            .delete()
            .eq('customer_id', req.params.id)
            .eq('station_id', req.params.stationId);

        if (provider) {
            query = query.eq('provider', provider);
        }

        const { error } = await query;

        if (error) throw error;

        res.json({ message: 'Station unlinked successfully' });
    } catch (error) {
        console.error('Error unlinking station:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create customer
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            customer_type,
            email,
            phone,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            additional_contact_name,
            additional_contact_phone,
            additional_contact_email,
            // PF fields
            cpf,
            rg,
            full_name,
            birth_date,
            // PJ fields
            cnpj,
            company_name,
            trade_name,
            state_registration,
            municipal_registration,
            // Additional fields
            consumer_units,
            contract_file_url,
            document_type,
            document_file_url,
            observations,
            has_different_holder,
            holder_type,
            holder_name,
            holder_document,
            holder_rg,
            holder_state_registration,
            holder_email,
            holder_phone,
            holder_zip,
            holder_address,
            holder_number,
            holder_complement,
            holder_neighborhood,
            holder_city,
            holder_state,
            holder_relationship,
            holder_relationship_other,
            // New Document Fields
            contractor_id_file_url,
            holder_id_file_url,
            plant_contract_file_url,

            other_documents,

            // Project/Utility Documents
            proxy_file_url,
            art_file_url,
            module_inmetro_file_url,
            inverter_datasheet_file_url,
            module_datasheet_file_url,
            generator_registration_file_url,
            diagram_file_url,
            memorial_file_url,
            access_request_file_url,
            other_project_documents,

            contacts,

            // Financial
            sale_total_value,
            financial_conditions,
            kit_details
        } = req.body;

        console.log('📝 [POST /customers] Received body:', {
            has_financial: !!financial_conditions,
            financial_len: financial_conditions?.length,
            has_kit: !!kit_details,
            sale_value: sale_total_value,
            contacts_len: contacts?.length,
            doc_keys: Object.keys(req.body).filter(k => k.endsWith('_url'))
        });

        // Validate customer type
        if (!customer_type || !['pf', 'pj'].includes(customer_type)) {
            return res.status(400).json({ error: 'Invalid customer type. Must be "pf" or "pj"' });
        }

        // Optional validations (only when fields are provided)
        if (email && !validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (phone && !validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone format' });
        }

        if (additional_contact_email && !validateEmail(additional_contact_email)) {
            return res.status(400).json({ error: 'Invalid additional contact email format' });
        }

        if (additional_contact_phone && !validatePhone(additional_contact_phone)) {
            return res.status(400).json({ error: 'Invalid additional contact phone format' });
        }

        // Type-specific validations (only when provided)
        if (customer_type === 'pf') {
            if (cpf && !validateCPF(cpf)) {
                return res.status(400).json({ error: 'Invalid CPF' });
            }
        } else if (customer_type === 'pj') {
            if (cnpj && !validateCNPJ(cnpj)) {
                return res.status(400).json({ error: 'Invalid CNPJ' });
            }
        }

        // Prepare data object
        const customerData = {
            customer_type,
            email: email || null,
            phone: phone ? phone.replace(/\D/g, '') : null,
            cep: cep ? cep.replace(/\D/g, '') : null,
            street: street || null,
            number: number || null,
            complement: complement || null,
            neighborhood: neighborhood || null,
            city: city || null,
            state: state || null,
            additional_contact_name,
            additional_contact_phone: additional_contact_phone ? additional_contact_phone.replace(/\D/g, '') : null,
            additional_contact_email: additional_contact_email || null,
            contract_file_url,
            document_type,
            document_file_url,
            observations,
            has_different_holder,
            holder_type,
            holder_name: holder_name || null,
            holder_document: holder_document ? holder_document.replace(/\D/g, '') : null,
            holder_rg,
            holder_state_registration,
            holder_email: holder_email || null,
            holder_phone: holder_phone ? holder_phone.replace(/\D/g, '') : null,
            holder_zip: holder_zip ? holder_zip.replace(/\D/g, '') : null,
            holder_address,
            holder_number,
            holder_complement,
            holder_neighborhood,
            holder_city,
            holder_state,
            holder_relationship,
            holder_relationship_other,
            // New Document Fields
            contractor_id_file_url,
            holder_id_file_url,
            plant_contract_file_url,
            other_documents: other_documents || [],

            contacts: contacts || [],

            // Project/Utility Documents
            proxy_file_url,
            art_file_url,
            module_inmetro_file_url,
            inverter_datasheet_file_url,
            module_datasheet_file_url,
            generator_registration_file_url,
            diagram_file_url,
            memorial_file_url,
            access_request_file_url,
            other_project_documents: other_project_documents || [],

            // Financial & Kit
            sale_total_value: sale_total_value || 0,
            financial_conditions: financial_conditions || [],
            kit_details: kit_details || {}
        };

        // Add type-specific fields
        if (customer_type === 'pf') {
            customerData.cpf = cpf ? cpf.replace(/\D/g, '') : null;
            customerData.rg = rg || null;
            customerData.full_name = full_name || null;
            customerData.birth_date = birth_date || null;
        } else {
            customerData.cnpj = cnpj ? cnpj.replace(/\D/g, '') : null;
            customerData.company_name = company_name || null;
            customerData.trade_name = trade_name || null;
            customerData.state_registration = state_registration || null;
            customerData.municipal_registration = municipal_registration || null;
        }

        const { data: customer, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Handle linked items if provided
        const { inverters, stations } = req.body;

        if (inverters && Array.isArray(inverters) && inverters.length > 0) {
            const inverterLinks = inverters.map(inv => ({
                customer_id: customer.id,
                inverter_id: inv.inverter_id,
                notes: inv.notes
            }));

            const { error: invError } = await supabase
                .from('customer_inverters')
                .insert(inverterLinks);

            if (invError) console.error('Error linking inverters:', invError);
        }

        if (stations && Array.isArray(stations) && stations.length > 0) {
            const stationLinks = stations.map(st => ({
                customer_id: customer.id,
                station_id: st.station_id,
                station_name: st.station_name,
                provider: normalizeProvider(st.provider),
                notes: st.notes
            }));

            const { error: stError } = await supabase
                .from('customer_stations')
                .insert(stationLinks);

            if (stError) console.error('Error linking stations:', stError);
        }

        // Note: contacts are stored in customer.contacts JSONB field, not in a separate table

        // Handle consumer units
        if (consumer_units && Array.isArray(consumer_units) && consumer_units.length > 0) {
            const unitsToInsert = consumer_units.map((u, index) => ({
                customer_id: customer.id,
                unit_number: typeof u === 'object' ? u.unit_number : u,
                is_primary: typeof u === 'object' ? u.is_primary : (index === 0),
                unit_type: u.unit_type || null,
                generation_kwh_month: u.generation_kwh_month || null,
                plant_power_kwp: u.plant_power_kwp || null,
                expected_rateio_kwh_month: u.expected_rateio_kwh_month || null,
                bill_file_url: u.bill_file_url || null
            }));

            const { error: unitsError } = await supabase
                .from('customer_units')
                .insert(unitsToInsert);

            if (unitsError) console.error('Error adding consumer units:', unitsError);
        }

        res.json(customer);
    } catch (error) {
        console.error('❌ Error creating customer:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Details:', error.details);
        console.error('Full error:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Update customer
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            customer_type,
            email,
            phone,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            additional_contact_name,
            additional_contact_phone,
            additional_contact_email,
            // PF fields
            cpf,
            rg,
            full_name,
            birth_date,
            // PJ fields
            cnpj,
            company_name,
            trade_name,
            state_registration,
            municipal_registration,
            // Additional fields
            consumer_units,
            contract_file_url,
            document_type,
            document_file_url,
            observations,
            has_different_holder,
            holder_type,
            holder_name,
            holder_document,
            holder_rg,
            holder_state_registration,
            holder_email,
            holder_phone,
            holder_zip,
            holder_address,
            holder_number,
            holder_complement,
            holder_neighborhood,
            holder_city,
            holder_state,
            holder_relationship,
            holder_relationship_other,
            // New Document Fields
            contractor_id_file_url,
            holder_id_file_url,
            plant_contract_file_url,
            other_documents,

            contacts,

            // Project/Utility Documents
            proxy_file_url,
            art_file_url,
            module_inmetro_file_url,
            inverter_datasheet_file_url,
            module_datasheet_file_url,
            generator_registration_file_url,
            diagram_file_url,
            memorial_file_url,
            access_request_file_url,
            other_project_documents,

            // Financial & Kit
            sale_total_value,
            financial_conditions,
            kit_details
        } = req.body;

        console.log(`📝 [PUT /customers/${req.params.id}] Received body:`, {
            has_financial: !!financial_conditions,
            financial_len: financial_conditions?.length,
            has_kit: !!kit_details,
            sale_value: sale_total_value,
            contacts_len: contacts?.length
        });

        // Validate email
        if (email && !validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate phone
        if (phone && !validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone format' });
        }

        // Validate additional contact email if provided
        if (additional_contact_email && !validateEmail(additional_contact_email)) {
            return res.status(400).json({ error: 'Invalid additional contact email format' });
        }

        // Validate additional contact phone if provided
        if (additional_contact_phone && !validatePhone(additional_contact_phone)) {
            return res.status(400).json({ error: 'Invalid additional contact phone format' });
        }

        // Type-specific validations
        if (customer_type === 'pf' && cpf && !validateCPF(cpf)) {
            return res.status(400).json({ error: 'Invalid CPF' });
        }

        if (customer_type === 'pj' && cnpj && !validateCNPJ(cnpj)) {
            return res.status(400).json({ error: 'Invalid CNPJ' });
        }

        // Prepare data object
        const customerData = {
            customer_type,
            email,
            phone: phone ? phone.replace(/\D/g, '') : undefined,
            cep: cep ? cep.replace(/\D/g, '') : undefined,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            additional_contact_name,
            additional_contact_phone: additional_contact_phone ? additional_contact_phone.replace(/\D/g, '') : null,
            additional_contact_email,
            contract_file_url,
            document_type,
            document_file_url,
            observations,
            has_different_holder,
            holder_type,
            holder_name,
            holder_document: holder_document ? holder_document.replace(/\D/g, '') : null,
            holder_rg,
            holder_state_registration,
            holder_email,
            holder_phone: holder_phone ? holder_phone.replace(/\D/g, '') : null,
            holder_zip: holder_zip ? holder_zip.replace(/\D/g, '') : null,
            holder_address,
            holder_number,
            holder_complement,
            holder_neighborhood,
            holder_city,
            holder_state,
            holder_relationship,
            holder_relationship_other,

            // New Document Fields
            contractor_id_file_url,
            holder_id_file_url,
            plant_contract_file_url,
            other_documents: other_documents || [],

            // Contacts (Array)
            contacts: contacts || [],

            // Project/Utility Documents
            proxy_file_url,
            art_file_url,
            module_inmetro_file_url,
            inverter_datasheet_file_url,
            module_datasheet_file_url,
            generator_registration_file_url,
            diagram_file_url,
            memorial_file_url,
            access_request_file_url,
            other_project_documents: other_project_documents || [],

            // Financial & Kit
            sale_total_value: sale_total_value || 0,
            financial_conditions: financial_conditions || [],
            kit_details: kit_details || {}
        };

        // Add type-specific fields
        if (customer_type === 'pf') {
            customerData.cpf = cpf ? cpf.replace(/\D/g, '') : undefined;
            customerData.rg = rg || null;
            customerData.full_name = full_name;
            customerData.birth_date = birth_date;
            // Clear PJ fields
            customerData.cnpj = null;
            customerData.company_name = null;
            customerData.trade_name = null;
            customerData.state_registration = null;
            customerData.municipal_registration = null;
        } else if (customer_type === 'pj') {
            customerData.cnpj = cnpj ? cnpj.replace(/\D/g, '') : undefined;
            customerData.company_name = company_name;
            customerData.trade_name = trade_name;
            customerData.state_registration = state_registration;
            customerData.municipal_registration = municipal_registration;
            // Clear PF fields
            customerData.cpf = null;
            customerData.rg = null;
            customerData.full_name = null;
            customerData.birth_date = null;
        }

        // Remove undefined values
        Object.keys(customerData).forEach(key =>
            customerData[key] === undefined && delete customerData[key]
        );

        const { data, error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Handle consumer units update
        if (consumer_units && Array.isArray(consumer_units)) {
            // Delete existing units
            await supabase
                .from('customer_units')
                .delete()
                .eq('customer_id', req.params.id);

            if (consumer_units.length > 0) {
                const unitsToInsert = consumer_units.map((u, index) => ({
                    customer_id: req.params.id,
                    unit_number: typeof u === 'object' ? u.unit_number : u,
                    is_primary: typeof u === 'object' ? u.is_primary : (index === 0),
                    unit_type: u.unit_type || null,
                    generation_kwh_month: u.generation_kwh_month || null,
                    plant_power_kwp: u.plant_power_kwp || null,
                    expected_rateio_kwh_month: u.expected_rateio_kwh_month || null,
                    bill_file_url: u.bill_file_url || null
                }));

                const { error: unitsError } = await supabase
                    .from('customer_units')
                    .insert(unitsToInsert);

                if (unitsError) console.error('Error updating consumer units:', unitsError);
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete customer
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const customerId = req.params.id;

        // Delete all related records first (cascade delete)
        // Only deleting from tables that exist in Supabase

        // 1. Delete customer_inverters
        await supabase
            .from('customer_inverters')
            .delete()
            .eq('customer_id', customerId);

        // 2. Delete customer_stations
        await supabase
            .from('customer_stations')
            .delete()
            .eq('customer_id', customerId);

        // 3. Delete customer_units
        await supabase
            .from('customer_units')
            .delete()
            .eq('customer_id', customerId);

        // 4. Delete tickets (if any linked to this customer)
        await supabase
            .from('tickets')
            .delete()
            .eq('customer_id', customerId);

        // 5. Finally, delete the customer
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) throw error;

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router;

