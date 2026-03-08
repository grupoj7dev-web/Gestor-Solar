const OpenAI = require('openai');
const supabase = require('../config/supabase');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Get current system context for AI
 */
async function getSystemContext() {
    try {
        // Get recent tickets (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: tickets } = await supabase
            .from('tickets')
            .select(`
                id,
                ticket_number,
                description,
                status,
                priority,
                created_at,
                customer:customers(full_name, company_name)
            `)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10);

        // Note: We don't have plants/alerts tables in Supabase, so we'll return empty arrays
        // These would need to be fetched from Solarman API or a different source

        return {
            tickets: tickets || [],
            plantsWithIssues: [], // Would need to fetch from Solarman API
            alerts: [], // Would need to fetch from Solarman API
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting system context:', error);
        return {
            tickets: [],
            plantsWithIssues: [],
            alerts: [],
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Available functions for the AI to call
 */
const functions = [
    {
        name: 'get_ticket_details',
        description: 'Obtém detalhes de um chamado específico',
        parameters: {
            type: 'object',
            properties: {
                ticket_id: {
                    type: 'string',
                    description: 'ID do chamado (UUID)'
                }
            },
            required: ['ticket_id']
        }
    },
    {
        name: 'update_ticket_status',
        description: 'Atualiza o status de um chamado',
        parameters: {
            type: 'object',
            properties: {
                ticket_id: {
                    type: 'string',
                    description: 'ID do chamado (UUID)'
                },
                status: {
                    type: 'string',
                    enum: ['open', 'in_opening', 'in_execution', 'visit_scheduled', 'concessionaria', 'delayed', 'warranty', 'closed'],
                    description: 'Novo status do chamado'
                }
            },
            required: ['ticket_id', 'status']
        }
    },
    {
        name: 'add_ticket_response',
        description: 'Adiciona uma resposta inicial a um chamado',
        parameters: {
            type: 'object',
            properties: {
                ticket_id: {
                    type: 'string',
                    description: 'ID do chamado (UUID)'
                },
                message: {
                    type: 'string',
                    description: 'Mensagem de resposta'
                }
            },
            required: ['ticket_id', 'message']
        }
    },
    {
        name: 'list_recent_tickets',
        description: 'Lista os chamados recentes',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'integer',
                    description: 'Número máximo de chamados a retornar',
                    default: 10
                }
            }
        }
    }
];

/**
 * Execute a function called by the AI
 */
async function executeFunction(functionName, args) {
    try {
        switch (functionName) {
            case 'get_ticket_details':
                const { data: ticket } = await supabase
                    .from('tickets')
                    .select(`
                        *,
                        customer:customers(id, full_name, company_name, phone),
                        initial_attendant:users!tickets_initial_attendant_id_fkey(id, name),
                        reason:ticket_reasons(id, title)
                    `)
                    .eq('id', args.ticket_id)
                    .single();
                return ticket || null;

            case 'update_ticket_status':
                const { data: updatedTicket, error } = await supabase
                    .from('tickets')
                    .update({
                        status: args.status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', args.ticket_id)
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, message: `Status do chamado atualizado para ${args.status}` };

            case 'add_ticket_response':
                const { error: updateError } = await supabase
                    .from('tickets')
                    .update({
                        initial_response: args.message,
                        initial_response_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', args.ticket_id);

                if (updateError) throw updateError;
                return { success: true, message: 'Resposta adicionada ao chamado' };

            case 'list_recent_tickets':
                const { data: recentTickets } = await supabase
                    .from('tickets')
                    .select(`
                        id,
                        ticket_number,
                        description,
                        status,
                        priority,
                        created_at,
                        customer:customers(full_name, company_name)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(args.limit || 10);

                return recentTickets || [];

            default:
                return { error: 'Função não encontrada' };
        }
    } catch (error) {
        console.error(`Error executing function ${functionName}:`, error);
        return { error: error.message };
    }
}

/**
 * Process a chat message with GPT-4
 */
async function processChat(messages, context) {
    try {
        const systemPrompt = `Você é o Super Jota, um assistente de voz inteligente para monitoramento de usinas solares.

Contexto atual do sistema:
- ${context.tickets.length} chamados nas últimas 24h

Você deve:
1. Responder de forma natural e conversacional em português brasileiro
2. Ser proativo e sugerir ações quando identificar problemas
3. Usar as funções disponíveis para obter informações detalhadas
4. Ser conciso mas informativo
5. Avisar sobre problemas críticos imediatamente

Dados recentes:
${JSON.stringify(context, null, 2)}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            functions: functions,
            function_call: 'auto',
            temperature: 0.7,
            max_tokens: 500
        });

        const message = response.choices[0].message;

        // If AI wants to call a function
        if (message.function_call) {
            const functionName = message.function_call.name;
            const functionArgs = JSON.parse(message.function_call.arguments);

            const functionResult = await executeFunction(functionName, functionArgs);

            // Call GPT again with the function result
            const secondResponse = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                    message,
                    {
                        role: 'function',
                        name: functionName,
                        content: JSON.stringify(functionResult)
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return {
                message: secondResponse.choices[0].message.content,
                functionCalled: functionName,
                functionResult
            };
        }

        return {
            message: message.content,
            functionCalled: null,
            functionResult: null
        };
    } catch (error) {
        console.error('Error processing chat:', error);
        throw error;
    }
}

/**
 * Transcribe audio using Whisper
 */
async function transcribeAudio(audioBuffer) {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: audioBuffer,
            model: 'whisper-1',
            language: 'pt'
        });

        return transcription.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
}

/**
 * Generate speech from text
 */
async function generateSpeech(text) {
    try {
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'nova', // Female voice, clear and natural
            input: text,
            speed: 1.0
        });

        return Buffer.from(await mp3.arrayBuffer());
    } catch (error) {
        console.error('Error generating speech:', error);
        throw error;
    }
}

/**
 * Check for new events that require notification
 */
async function checkForNotifications(lastCheckTime) {
    try {
        // Check for new tickets
        const { data: newTickets } = await supabase
            .from('tickets')
            .select(`
                id,
                ticket_number,
                description,
                priority,
                customer:customers(full_name, company_name)
            `)
            .gte('created_at', lastCheckTime)
            .order('created_at', { ascending: false });

        const notifications = [];

        if (newTickets && newTickets.length > 0) {
            for (const ticket of newTickets) {
                const customerName = ticket.customer?.full_name || ticket.customer?.company_name || 'Cliente não identificado';
                notifications.push({
                    type: 'new_ticket',
                    priority: ticket.priority,
                    message: `Novo chamado #${ticket.ticket_number}: ${ticket.description.substring(0, 50)}... - Cliente: ${customerName}`,
                    data: ticket
                });
            }
        }

        return notifications;
    } catch (error) {
        console.error('Error checking for notifications:', error);
        return [];
    }
}

module.exports = {
    getSystemContext,
    processChat,
    transcribeAudio,
    generateSpeech,
    checkForNotifications,
    executeFunction
};
