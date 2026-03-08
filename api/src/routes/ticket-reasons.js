const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Get all ticket reasons
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ticket_reasons')
            .select('*')
            .order('title', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching ticket reasons:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get reason by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ticket_reasons')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Reason not found' });

        res.json(data);
    } catch (error) {
        console.error('Error fetching reason:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create reason
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, ai_prompt } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const { data, error } = await supabase
            .from('ticket_reasons')
            .insert([{ title, ai_prompt }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating reason:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update reason
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, ai_prompt } = req.body;

        const { data, error } = await supabase
            .from('ticket_reasons')
            .update({ title, ai_prompt })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Reason not found' });

        res.json(data);
    } catch (error) {
        console.error('Error updating reason:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete reason
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('ticket_reasons')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            // Check for foreign key constraint violation (Postgres error code 23503)
            if (error.code === '23503') {
                return res.status(400).json({
                    error: 'Não é possível excluir este motivo pois ele está sendo usado por chamados existentes.'
                });
            }
            throw error;
        }
        res.json({ message: 'Reason deleted successfully' });
    } catch (error) {
        console.error('Error deleting reason:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
