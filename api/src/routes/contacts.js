const express = require('express');
const router = express.Router({ mergeParams: true }); // Merge params to get :id from parent router
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Note: This router is expected to be mounted at /customers/:id/contacts

// Verify/Update a specific contact field
router.patch('/:contactId/verify', authMiddleware, async (req, res) => {
    try {
        const { contactId } = req.params;
        const { field, action } = req.body; // field: 'phone' | 'email', action: 'confirm' | 'correct'

        if (!['phone', 'email'].includes(field)) {
            return res.status(400).json({ error: 'Invalid field. Must be phone or email' });
        }

        if (!['confirm', 'correct'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Must be confirm or correct' });
        }

        const updateData = {};
        const timestampField = `${field}_verified_at`;

        if (action === 'confirm') {
            updateData[timestampField] = new Date().toISOString();
        } else {
            // 'correct' might just reset the verification or update it if value changed? 
            // The requirement says: "Sempre que for confirmado ou corrigido, aparecer a data da última Atualização"
            // So if 'corrected', we also update the timestamp.
            updateData[timestampField] = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('customer_contacts')
            .update(updateData)
            .eq('id', contactId)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error verifying contact:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
