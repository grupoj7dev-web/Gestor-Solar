const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const novokitInverters = require('../services/novokitInverters');
const { getRules } = require('../utils/rulesStore');

const router = express.Router();
const allowedOperators = new Set(['>', '>=', '<', '<=', '==', '!=', '=']);
const allowedSeverities = new Set(['low', 'medium', 'high', 'critical', 'info']);

function parseOptionalNonNegativeNumber(value, fieldName) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        const error = new Error(`Invalid ${fieldName}`);
        error.statusCode = 400;
        throw error;
    }
    return parsed;
}

function normalizeParameterBody(body, { partial = false } = {}) {
    const payload = body || {};

    const parameter_id = payload.parameter_id !== undefined ? String(payload.parameter_id || '').trim() : undefined;
    const parameter_name = payload.parameter_name !== undefined ? String(payload.parameter_name || '').trim() : undefined;
    const operator = payload.operator !== undefined ? String(payload.operator || '').trim() : undefined;
    const severity = payload.severity !== undefined ? String(payload.severity || '').trim().toLowerCase() : undefined;
    const rawValue = payload.value;

    if (!partial) {
        if (!parameter_id || !parameter_name || !operator || rawValue === undefined || rawValue === null || rawValue === '' || !severity) {
            const error = new Error('Missing required fields');
            error.statusCode = 400;
            throw error;
        }
    }

    const out = {};

    if (parameter_id !== undefined) {
        if (!parameter_id) {
            const error = new Error('Invalid parameter_id');
            error.statusCode = 400;
            throw error;
        }
        out.parameter_id = parameter_id;
    }

    if (parameter_name !== undefined) {
        if (!parameter_name) {
            const error = new Error('Invalid parameter_name');
            error.statusCode = 400;
            throw error;
        }
        out.parameter_name = parameter_name;
    }

    if (operator !== undefined) {
        if (!allowedOperators.has(operator)) {
            const error = new Error('Invalid operator');
            error.statusCode = 400;
            throw error;
        }
        out.operator = operator;
    }

    if (rawValue !== undefined) {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            const error = new Error('Invalid value');
            error.statusCode = 400;
            throw error;
        }
        out.value = numericValue;
    }

    if (severity !== undefined) {
        if (!allowedSeverities.has(severity)) {
            const error = new Error('Invalid severity');
            error.statusCode = 400;
            throw error;
        }
        out.severity = severity;
    }

    if (payload.is_global !== undefined) {
        out.is_global = Boolean(payload.is_global);
    } else if (!partial) {
        out.is_global = false;
    }

    if (payload.unit !== undefined) {
        out.unit = String(payload.unit || '').trim() || null;
    }

    if (payload.description !== undefined) {
        out.description = String(payload.description || '').trim();
    }

    if (payload.enabled !== undefined) {
        out.enabled = Boolean(payload.enabled);
    } else if (!partial) {
        out.enabled = true;
    }

    const delaySeconds = parseOptionalNonNegativeNumber(payload.delay_seconds, 'delay_seconds');
    if (delaySeconds !== undefined) out.delay_seconds = delaySeconds;
    else if (!partial) out.delay_seconds = 0;

    const cooldownSeconds = parseOptionalNonNegativeNumber(payload.cooldown_seconds, 'cooldown_seconds');
    if (cooldownSeconds !== undefined) out.cooldown_seconds = cooldownSeconds;
    else if (!partial) out.cooldown_seconds = 0;

    const hysteresis = parseOptionalNonNegativeNumber(payload.hysteresis, 'hysteresis');
    if (hysteresis !== undefined) out.hysteresis = hysteresis;
    else if (!partial) out.hysteresis = 0;

    if (payload.source_type !== undefined) {
        out.source_type = String(payload.source_type || '').trim() || 'specific';
    } else if (!partial) {
        out.source_type = 'specific';
    }

    return out;
}

router.get('/fornecedores/options', authMiddleware, async (req, res) => {
    try {
        if (!novokitInverters.isEnabled()) {
            return res.json([]);
        }
        const data = await novokitInverters.fetchFornecedoresOptions();
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching fornecedor options:', error?.response?.data || error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/parameters/catalog', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('inverter_parameters')
            .select('parameter_id, parameter_name, operator, value, severity, is_global, unit, description, enabled, delay_seconds, cooldown_seconds, hysteresis, source_type, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const grouped = new Map();
        (data || []).forEach((row) => {
            const key = [
                row.parameter_id,
                row.operator,
                row.value,
                row.severity,
                row.enabled !== false ? 1 : 0,
                row.delay_seconds ?? 0,
                row.cooldown_seconds ?? 0,
                row.hysteresis ?? 0,
                row.unit || ''
            ].join('|');
            if (!grouped.has(key)) {
                grouped.set(key, {
                    template_key: key,
                    parameter_id: row.parameter_id,
                    parameter_name: row.parameter_name,
                    operator: row.operator,
                    value: row.value,
                    severity: row.severity,
                    is_global: !!row.is_global,
                    unit: row.unit || null,
                    description: row.description || '',
                    enabled: row.enabled !== false,
                    delay_seconds: Number(row.delay_seconds || 0),
                    cooldown_seconds: Number(row.cooldown_seconds || 0),
                    hysteresis: Number(row.hysteresis || 0),
                    source_type: row.source_type || 'specific',
                    usage_count: 0
                });
            }
            const item = grouped.get(key);
            item.usage_count += 1;
            if (!item.description && row.description) {
                item.description = row.description;
            }
        });

        // Include global rules configured in /parameters (/api/rules)
        const globalRules = getRules();
        (globalRules || []).forEach((rule) => {
            const parameterId = String(rule?.parameter || '').trim();
            if (!parameterId) return;

            const operator = String(rule?.operator || '').trim() || '<';
            if (!allowedOperators.has(operator)) return;

            const severity = String(rule?.severity || 'medium').trim().toLowerCase();
            if (!allowedSeverities.has(severity)) return;

            const numericValue = Number(rule?.value);
            if (!Number.isFinite(numericValue)) return;

            const name = String(rule?.name || parameterId).trim() || parameterId;
            const key = [
                parameterId,
                operator,
                numericValue,
                severity,
                1,
                0,
                0,
                0,
                ''
            ].join('|');

            if (!grouped.has(key)) {
                grouped.set(key, {
                    template_key: key,
                    parameter_id: parameterId,
                    parameter_name: name,
                    operator,
                    value: numericValue,
                    severity,
                    is_global: true,
                    unit: null,
                    description: '',
                    enabled: true,
                    delay_seconds: 0,
                    cooldown_seconds: 0,
                    hysteresis: 0,
                    source_type: 'global_rule',
                    usage_count: 0
                });
            }
        });

        const catalog = Array.from(grouped.values()).sort((a, b) => {
            if (a.is_global !== b.is_global) return a.is_global ? -1 : 1;
            if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
            return String(a.parameter_name || '').localeCompare(String(b.parameter_name || ''));
        });

        res.json(catalog);
    } catch (error) {
        console.error('Error fetching parameter catalog:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all inverters
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (novokitInverters.isEnabled()) {
            const data = await novokitInverters.fetchInverters();
            return res.json(data || []);
        }

        const { data, error } = await supabase
            .from('inverters')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching inverters:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single inverter
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        if (novokitInverters.isEnabled()) {
            const data = await novokitInverters.fetchInverterById(req.params.id);
            if (!data) return res.status(404).json({ error: 'Inverter not found' });
            return res.json(data);
        }

        const { data, error } = await supabase
            .from('inverters')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Inverter not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching inverter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create inverter
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (novokitInverters.isEnabled()) {
            const data = await novokitInverters.createInverter(req.body || {});
            return res.status(201).json(data);
        }

        const {
            marca,
            modelo,
            potencia_nominal,
            tipo,
            fases,
            tensao,
            afci_integrado,
            nomenclature_config
        } = req.body;

        // Validate required fields
        if (!marca || !modelo || !potencia_nominal || !tipo || !fases || !tensao) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('inverters')
            .insert([{
                marca,
                modelo,
                potencia_nominal,
                tipo,
                fases,
                tensao,
                afci_integrado: afci_integrado || false,
                nomenclature_config: nomenclature_config || {},
                created_by: req.user.userId
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating inverter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update inverter
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (novokitInverters.isEnabled()) {
            const data = await novokitInverters.updateInverter(req.params.id, req.body || {});
            if (!data) return res.status(404).json({ error: 'Inverter not found' });
            return res.json(data);
        }

        const {
            marca,
            modelo,
            potencia_nominal,
            tipo,
            fases,
            tensao,
            afci_integrado,
            nomenclature_config
        } = req.body;

        const updateData = {};
        if (marca !== undefined) updateData.marca = marca;
        if (modelo !== undefined) updateData.modelo = modelo;
        if (potencia_nominal !== undefined) updateData.potencia_nominal = potencia_nominal;
        if (tipo !== undefined) updateData.tipo = tipo;
        if (fases !== undefined) updateData.fases = fases;
        if (tensao !== undefined) updateData.tensao = tensao;
        if (afci_integrado !== undefined) updateData.afci_integrado = afci_integrado;
        if (nomenclature_config !== undefined) updateData.nomenclature_config = nomenclature_config;

        const { data, error } = await supabase
            .from('inverters')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Inverter not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating inverter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete inverter
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (novokitInverters.isEnabled()) {
            await novokitInverters.deleteInverter(req.params.id);
            return res.json({ message: 'Inverter deleted successfully' });
        }

        const { error } = await supabase
            .from('inverters')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Inverter deleted successfully' });
    } catch (error) {
        console.error('Error deleting inverter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get inverter parameters
router.get('/:id/parameters', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('inverter_parameters')
            .select('*')
            .eq('inverter_id', req.params.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching parameters:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add parameter to inverter
router.post('/:id/parameters', authMiddleware, async (req, res) => {
    try {
        const normalized = normalizeParameterBody(req.body, { partial: false });

        const { data, error } = await supabase
            .from('inverter_parameters')
            .insert([{
                inverter_id: req.params.id,
                ...normalized
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error('Error adding parameter:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Server error' });
    }
});

// Update parameter
router.put('/:id/parameters/:paramId', authMiddleware, async (req, res) => {
    try {
        const normalized = normalizeParameterBody(req.body, { partial: true });
        if (Object.keys(normalized).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const { data, error } = await supabase
            .from('inverter_parameters')
            .update(normalized)
            .eq('id', req.params.paramId)
            .eq('inverter_id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Parameter not found' });

        res.json(data);
    } catch (error) {
        console.error('Error updating parameter:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Server error' });
    }
});

// Delete parameter
router.delete('/:id/parameters/:paramId', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('inverter_parameters')
            .delete()
            .eq('id', req.params.paramId)
            .eq('inverter_id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Parameter deleted successfully' });
    } catch (error) {
        console.error('Error deleting parameter:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
