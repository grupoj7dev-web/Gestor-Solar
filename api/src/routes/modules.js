const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all modules
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .order('brand', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create module
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { brand, model, power } = req.body;
        console.log('Creating module with data:', { brand, model, power, userId: req.user?.userId });

        if (!brand || !model || !power) {
            return res.status(400).json({ error: 'Missing brand, model or power' });
        }

        const { data, error } = await supabase
            .from('modules')
            .insert([{ brand, model, power, created_by: req.user.userId }])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Module created successfully:', data);
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating module:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router;
