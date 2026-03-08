const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Get all branches
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single branch
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create branch
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, cnpj, cep, street, number, complement, neighborhood, city, state } = req.body;

        if (!name || !cnpj || !cep || !street || !neighborhood || !city || !state) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('branches')
            .insert([{
                name,
                cnpj,
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'CNPJ already exists' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update branch
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, cnpj, cep, street, number, complement, neighborhood, city, state } = req.body;

        const { data, error } = await supabase
            .from('branches')
            .update({
                name,
                cnpj,
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'CNPJ already exists' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete branch
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
