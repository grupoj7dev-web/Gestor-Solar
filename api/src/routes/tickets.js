const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Helper function to generate ticket number
async function generateTicketNumber(customerId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    let customerCode = 'EXT'; // Default for non-customers

    if (customerId) {
        // Get customer to extract a code
        const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('id', customerId)
            .single();

        if (customer) {
            // Use first 6 chars of UUID as customer code
            customerCode = customer.id.substring(0, 6).toUpperCase();
        }
    }

    // Random 4-digit number
    const random = Math.floor(1000 + Math.random() * 9000);

    return `${year}${month}-${customerCode}-${random}`;
}

// --- Kanban Column Management Routes ---

// Get all columns
router.get('/columns', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('kanban_columns')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching columns:', error);
        res.status(500).json({ error: 'Server error fetching columns' });
    }
});

// Create a new column
router.post('/columns', authMiddleware, async (req, res) => {
    try {
        const { title, status_key, color, order_index } = req.body;

        const { data, error } = await supabase
            .from('kanban_columns')
            .insert([{ title, status_key, color, order_index }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating column:', error);
        res.status(500).json({ error: 'Server error creating column', details: error.message });
    }
});

// Update a column
router.put('/columns/:id', authMiddleware, async (req, res) => {
    try {
        const { title, status_key, color, order_index } = req.body;

        const { data, error } = await supabase
            .from('kanban_columns')
            .update({ title, status_key, color, order_index })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating column:', error);
        res.status(500).json({ error: 'Server error updating column' });
    }
});

// Delete a column
router.delete('/columns/:id', authMiddleware, async (req, res) => {
    try {
        // Check if there are tickets with this status
        const { data: column } = await supabase
            .from('kanban_columns')
            .select('status_key')
            .eq('id', req.params.id)
            .single();

        if (column) {
            const { count } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', column.status_key);

            if (count > 0) {
                return res.status(400).json({
                    error: 'Cannot delete column with existing tickets. Move them first.'
                });
            }
        }

        const { error } = await supabase
            .from('kanban_columns')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Column deleted successfully' });
    } catch (error) {
        console.error('Error deleting column:', error);
        res.status(500).json({ error: 'Server error deleting column' });
    }
});

// --- End Kanban Routes ---

// Get all tickets
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, priority, customer_id } = req.query;

        let query = supabase
            .from('tickets')
            .select(`
                *,
                customer:customers(id, full_name, company_name, customer_type, phone),
                initial_attendant:users!tickets_initial_attendant_id_fkey(id, name, department),
                reason:ticket_reasons(id, title)
            `)
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (priority) query = query.eq('priority', priority);
        if (customer_id) query = query.eq('customer_id', customer_id);

        const { data, error } = await query;

        if (error) {
            console.error('Supabase error fetching tickets:', error);
            throw error;
        }

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message,
            hint: error.hint
        });
    }
});

// Get ticket by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                customer:customers(id, full_name, company_name, customer_type, cpf, cnpj, phone),
                initial_attendant:users!tickets_initial_attendant_id_fkey(id, name, department),
                reason:ticket_reasons(id, title, ai_prompt),
                attachments:ticket_attachments(id, file_url, file_type, file_name, created_at)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) {
            console.error('Supabase error fetching ticket:', error);
            throw error;
        }
        if (!data) return res.status(404).json({ error: 'Ticket not found' });

        res.json(data);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message,
            hint: error.hint
        });
    }
});

// Create ticket
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            customer_id,
            non_customer_name,
            non_customer_phone,
            uc_number,
            origin,
            initial_attendant_id,
            reason_id,
            description,
            generation_status,
            emotional_status,
            expected_response_time,
            expected_execution_time,
            priority,
            attachments
        } = req.body;


        console.log('🎟️ Creating ticket with payload:', JSON.stringify(req.body, null, 2));

        // Sanitize UUIDs (convert empty strings to null)
        const sanitizedCustomerId = customer_id || null;
        const sanitizedAttendantId = initial_attendant_id || null;
        const sanitizedReasonId = reason_id || null;

        // Validate required fields
        if (!origin || !description || !priority) {
            return res.status(400).json({
                error: 'Origin, description, and priority are required'
            });
        }

        // If not a customer, require non_customer_name and phone
        if (!sanitizedCustomerId && (!non_customer_name || !non_customer_phone)) {
            return res.status(400).json({
                error: 'Non-customer name and phone are required for external tickets'
            });
        }

        // Validate initial_attendant_id if provided
        if (sanitizedAttendantId) {
            const { data: employee } = await supabase
                .from('users')
                .select('id')
                .eq('id', sanitizedAttendantId)
                .maybeSingle();

            if (!employee) {
                return res.status(400).json({
                    error: 'Atendente inicial inválido ou inexistente'
                });
            }
        }

        // Validate reason_id if provided
        if (sanitizedReasonId) {
            const { data: reason } = await supabase
                .from('ticket_reasons')
                .select('id')
                .eq('id', sanitizedReasonId)
                .maybeSingle();

            if (!reason) {
                return res.status(400).json({
                    error: 'Motivo do chamado inválido ou inexistente'
                });
            }
        }


        // Generate ticket number
        const ticket_number = await generateTicketNumber(sanitizedCustomerId);

        // Create ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert([{
                ticket_number,
                customer_id: sanitizedCustomerId,
                non_customer_name,
                non_customer_phone,
                uc_number,
                origin,
                initial_attendant_id: sanitizedAttendantId,
                reason_id: sanitizedReasonId,
                description,
                generation_status,
                emotional_status,
                expected_response_time,
                expected_execution_time,
                priority,
                status: 'open'
            }])
            .select()
            .single();

        if (ticketError) throw ticketError;

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
            const attachmentData = attachments.map(att => ({
                ticket_id: ticket.id,
                file_url: att.file_url,
                file_type: att.file_type,
                file_name: att.file_name
            }));

            const { error: attachmentError } = await supabase
                .from('ticket_attachments')
                .insert(attachmentData);

            if (attachmentError) {
                console.error('Error adding attachments:', attachmentError);
            }
        }

        res.status(201).json(ticket);
    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });

        // Handle specific database errors
        if (error.code === '23503') {
            // Foreign key violation
            if (error.message.includes('initial_attendant_id')) {
                return res.status(400).json({
                    error: 'Atendente inicial inválido ou inexistente'
                });
            }
            if (error.message.includes('reason_id')) {
                return res.status(400).json({
                    error: 'Motivo do chamado inválido ou inexistente'
                });
            }
            if (error.message.includes('customer_id')) {
                return res.status(400).json({
                    error: 'Cliente inválido ou inexistente'
                });
            }
            return res.status(400).json({
                error: 'Referência inválida no chamado'
            });
        }

        res.status(500).json({
            error: 'Erro interno ao criar ticket',
            details: error.message,
            code: error.code
        });
    }
});

// Update ticket
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const {
            status,
            priority,
            description,
            expected_response_time,
            expected_execution_time,
            generation_status,
            emotional_status
        } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (description) updateData.description = description;
        if (expected_response_time) updateData.expected_response_time = expected_response_time;
        if (expected_execution_time) updateData.expected_execution_time = expected_execution_time;
        if (generation_status) updateData.generation_status = generation_status;
        if (emotional_status) updateData.emotional_status = emotional_status;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Ticket not found' });

        res.json(data);
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete ticket
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add initial response
router.put('/:id/initial-response', authMiddleware, async (req, res) => {
    try {
        const { initial_response, initial_response_by, changed_by_name } = req.body;

        console.log('📝 Adding initial response:', {
            ticketId: req.params.id,
            hasResponse: !!initial_response,
            responseBy: initial_response_by
        });

        if (!initial_response) {
            return res.status(400).json({ error: 'Initial response is required' });
        }

        const { data, error } = await supabase
            .from('tickets')
            .update({
                initial_response,
                initial_response_by,
                initial_response_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase error updating ticket:', error);
            throw error;
        }
        if (!data) return res.status(404).json({ error: 'Ticket not found' });

        console.log('✅ Ticket updated, adding to history...');

        // Add to history with the actual response
        const { error: historyError } = await supabase.from('ticket_history').insert([{
            ticket_id: req.params.id,
            status: 'initial_response_added',
            comment: `Resposta inicial: "${initial_response}"`,
            changed_by: initial_response_by,
            changed_by_name: changed_by_name || 'Sistema'
        }]);

        if (historyError) {
            console.error('⚠️  Warning: Could not add to history:', historyError);
        }

        console.log('✅ Initial response added successfully');
        res.json(data);
    } catch (error) {
        console.error('❌ Error adding initial response:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message,
            hint: error.hint
        });
    }
});

// Update ticket status
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const {
            status,
            visit_scheduled_at,
            visit_responsible_id,
            concessionaria_substatus,
            execution_deadline,
            changed_by,
            changed_by_name,
            comment
        } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Validate that the status exists in kanban_columns
        const { data: columnExists, error: columnError } = await supabase
            .from('kanban_columns')
            .select('id, title')
            .eq('status_key', status)
            .single();

        if (columnError || !columnExists) {
            console.error('Invalid status_key:', status, columnError);
            return res.status(400).json({
                error: 'Status inválido',
                details: `O status '${status}' não existe nas colunas do Kanban`
            });
        }

        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };

        // Add conditional fields based on status
        if (status === 'visit_scheduled') {
            if (visit_scheduled_at) updateData.visit_scheduled_at = visit_scheduled_at;
            if (visit_responsible_id) updateData.visit_responsible_id = visit_responsible_id;
        }

        if (status === 'concessionaria' && concessionaria_substatus) {
            updateData.concessionaria_substatus = concessionaria_substatus;
        }

        if (execution_deadline) {
            updateData.execution_deadline = execution_deadline;
        }

        const { data, error } = await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Ticket not found' });

        // Status translations
        const statusLabels = {
            'open': 'Aberto',
            'in_opening': 'Em Abertura',
            'in_execution': 'Em Execução',
            'visit_scheduled': 'Visita Agendada',
            'concessionaria': 'Concessionária',
            'delayed': 'Atrasado',
            'warranty': 'Garantia',
            'closed': 'Encerrado'
        };

        // Add to history with detailed information
        const statusLabel = statusLabels[status] || status;
        let historyComment = `Status alterado para: ${statusLabel}`;
        if (comment) {
            historyComment += ` - ${comment}`;
        }
        if (status === 'visit_scheduled' && visit_scheduled_at) {
            historyComment += ` (Visita agendada para ${new Date(visit_scheduled_at).toLocaleString('pt-BR')})`;
        }
        if (execution_deadline) {
            historyComment += ` (Prazo: ${new Date(execution_deadline).toLocaleString('pt-BR')})`;
        }

        await supabase.from('ticket_history').insert([{
            ticket_id: req.params.id,
            status,
            comment: historyComment,
            changed_by,
            changed_by_name: changed_by_name || 'Sistema'
        }]);

        res.json(data);
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Close ticket
router.put('/:id/close', authMiddleware, async (req, res) => {
    try {
        const {
            closing_response,
            closing_status,
            attendant_rating,
            closed_by,
            changed_by_name
        } = req.body;

        console.log('🔒 Closing ticket:', {
            ticketId: req.params.id,
            closing_response,
            closing_status,
            attendant_rating,
            closed_by,
            changed_by_name
        });

        if (!closing_response || !closing_status) {
            return res.status(400).json({
                error: 'Closing response and status are required'
            });
        }

        const updatePayload = {
            status: 'closed',
            closing_response,
            closing_status,
            attendant_rating,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Only add closed_by if it's provided and valid
        // Note: closed_by must be an employee_id, not a user_id
        if (closed_by) {
            updatePayload.closed_by = closed_by;
        }

        const { data, error } = await supabase
            .from('tickets')
            .update(updatePayload)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase error updating ticket:', error);
            throw error;
        }
        if (!data) return res.status(404).json({ error: 'Ticket not found' });

        console.log('✅ Ticket updated, adding to history...');

        // Add to history with closing details
        const closingComment = `Chamado encerrado - ${closing_status === 'attended' ? 'Demanda Atendida' : 'Demanda Não Atendida'}. Resposta: "${closing_response}"`;

        const { error: historyError } = await supabase.from('ticket_history').insert([{
            ticket_id: req.params.id,
            status: 'closed',
            comment: closingComment,
            changed_by: closed_by,
            changed_by_name: changed_by_name || 'Sistema'
        }]);

        if (historyError) {
            console.error('⚠️  Warning: Could not add to history:', historyError);
        }

        console.log('✅ Ticket closed successfully');
        res.json(data);
    } catch (error) {
        console.error('❌ Error closing ticket:', error);
        console.error('Error details:', error.message, error.hint, error.details);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Get ticket history
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ticket_history')
            .select(`
                *,
                changed_by_user:users(id, name, department)
            `)
            .eq('ticket_id', req.params.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send WhatsApp message (placeholder - requires WhatsApp API integration)
router.post('/:id/send-whatsapp', authMiddleware, async (req, res) => {
    try {
        const { message, phone } = req.body;

        if (!message || !phone) {
            return res.status(400).json({ error: 'Message and phone are required' });
        }

        // TODO: Integrate with WhatsApp API (e.g., Twilio, WhatsApp Business API)
        console.log(`Sending WhatsApp to ${phone}: ${message}`);

        // For now, just return success
        res.json({
            success: true,
            message: 'WhatsApp message queued (integration pending)'
        });
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send satisfaction survey (placeholder)
router.post('/:id/send-satisfaction-survey', authMiddleware, async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone is required' });
        }

        // TODO: Send satisfaction survey via WhatsApp
        const surveyMessage = `Olá! Seu chamado foi encerrado. Por favor, avalie nosso atendimento de 1 a 5 estrelas.`;
        console.log(`Sending survey to ${phone}: ${surveyMessage}`);

        res.json({
            success: true,
            message: 'Survey sent (integration pending)'
        });
    } catch (error) {
        console.error('Error sending survey:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
