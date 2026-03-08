const supabase = require('../config/supabase');

/**
 * Creates a ticket automatically based on AI generated details
 * @param {Object} ticketData - The ticket data
 * @returns {Promise<Object>} - The created ticket
 */
async function createAutoTicket(ticketData) {
    const {
        customer_id,
        inverter_id,
        description,
        priority,
        reason,
        alert_reference,
        alert_type,
        alert_time
    } = ticketData;

    try {
        // 1. Get a random attendant (or specific logic if needed)
        // For now, we'll pick a random user with 'employee' role or similar, 
        // or just the first available user if roles aren't strictly defined yet.
        // We'll try to find a user who is an 'attendant' or 'admin'.
        const { data: attendants, error: attError } = await supabase
            .from('users')
            .select('id')
            .limit(10); // Get a few users to pick from

        if (attError) throw attError;

        const randomAttendant = attendants.length > 0
            ? attendants[Math.floor(Math.random() * attendants.length)].id
            : null;

        // 2. Find or create the reason ID
        // We need to map the string reason to a reason_id in the database
        const { data: reasons } = await supabase
            .from('ticket_reasons')
            .select('id, title');

        let reasonId = null;

        if (reasons && reasons.length > 0) {
            // Try to find exact or close match
            const match = reasons.find(r => r.title.toLowerCase() === reason.toLowerCase());
            if (match) {
                reasonId = match.id;
            }
        }

        // If no match found, create a new reason
        if (!reasonId) {
            console.log(`[AutoTicket] Creating new ticket reason: ${reason}`);
            const { data: newReason, error: createReasonError } = await supabase
                .from('ticket_reasons')
                .insert([{
                    title: reason,
                    ai_prompt: `Instruções automáticas para ${reason}` // Default prompt
                }])
                .select()
                .single();

            if (createReasonError) {
                console.error('Error creating new reason:', createReasonError);
                // Fallback to first existing reason if creation fails
                if (reasons && reasons.length > 0) reasonId = reasons[0].id;
            } else {
                reasonId = newReason.id;
            }
        }

        // 3. Create the ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert([{
                customer_id,
                title: `Alerta: ${reason}`,
                description,
                priority,
                status: 'open',
                origin: 'system', // We need to make sure 'system' is a valid origin or add it
                reason_id: reasonId,
                initial_attendant_id: randomAttendant,
                created_at: new Date(),
                updated_at: new Date()
            }])
            .select()
            .single();

        if (ticketError) throw ticketError;

        // 4. Record the mapping to prevent duplication
        const { error: mappingError } = await supabase
            .from('alert_ticket_mapping')
            .insert([{
                alert_id: alert_reference,
                ticket_id: ticket.id,
                inverter_id,
                customer_id,
                alert_type,
                alert_time
            }]);

        if (mappingError) {
            console.error('Error creating alert mapping:', mappingError);
            // We don't throw here to avoid rolling back the ticket if mapping fails (though it shouldn't)
        }

        return ticket;

    } catch (error) {
        console.error('Error creating auto ticket:', error);
        throw error;
    }
}

module.exports = { createAutoTicket };
