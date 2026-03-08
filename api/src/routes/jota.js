const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const supabase = require('../config/supabase');
const { SolarmanClient } = require('../solarmanClient');
const authMiddleware = require('../middleware/auth');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const solarmanClient = new SolarmanClient();

// --- Helper Functions ---

async function queryDatabase(sql) {
    try {
        console.log(`🔍 Executing SQL: ${sql}`);
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('❌ Database Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function getSolarmanData(endpoint, params = {}) {
    try {
        console.log(`☀️ Calling Solarman API: ${endpoint}`, params);
        let data;
        switch (endpoint) {
            case 'stations':
                data = await solarmanClient.stationListAll({ size: 100 });
                break;
            case 'station_realtime':
                data = await solarmanClient.stationRealTime(params.stationId);
                break;
            case 'station_devices':
                data = await solarmanClient.stationDevices(params);
                break;
            case 'station_alerts':
                data = await solarmanClient.stationAlarms(params);
                break;
            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
        return { success: true, data };
    } catch (error) {
        console.error('❌ Solarman API Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function getSystemStatus() {
    try {
        console.log('📊 Fetching System Status...');
        const stations = await solarmanClient.stationListAll({ size: 100 });
        const stationList = stations.stationList || [];
        const online = stationList.filter(s => s.generationPower > 0).length;
        const offline = stationList.length - online;

        const { data: tickets } = await supabase
            .from('tickets')
            .select('status')
            .order('created_at', { ascending: false })
            .limit(100);

        const openTickets = tickets?.filter(t => t.status === 'open').length || 0;

        return {
            success: true,
            data: {
                stations: { total: stationList.length, online, offline },
                tickets: { open: openTickets, total: tickets?.length || 0 }
            }
        };
    } catch (error) {
        console.error('❌ System Status Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function getAlerts(params = {}) {
    try {
        console.log('🚨 Fetching Alerts from Solarman API...', params);

        if (params.stationId) {
            // Get alerts for specific station
            const result = await solarmanClient.stationAlarms({
                stationId: params.stationId,
                page: 1,
                size: 50
            });
            return { success: true, data: result.alarmList || [] };
        } else {
            // Get alerts from ALL stations
            const stations = await solarmanClient.stationListAll({ size: 200 });
            const stationList = stations.stationList || [];

            const allAlerts = [];

            // Fetch alarms for each station (limit to first 20 stations to avoid timeout)
            const stationsToCheck = stationList.slice(0, 20);

            for (const station of stationsToCheck) {
                try {
                    const result = await solarmanClient.stationAlarms({
                        stationId: station.id,
                        page: 1,
                        size: 10
                    });

                    if (result.alarmList && result.alarmList.length > 0) {
                        // Add station name to each alert
                        result.alarmList.forEach(alarm => {
                            allAlerts.push({
                                ...alarm,
                                stationName: station.name,
                                stationId: station.id
                            });
                        });
                    }
                } catch (err) {
                    console.log(`⚠️ Could not fetch alarms for station ${station.id}:`, err.message);
                }
            }

            // Sort by time (most recent first)
            allAlerts.sort((a, b) => new Date(b.alarmTime || 0) - new Date(a.alarmTime || 0));

            return {
                success: true,
                data: allAlerts.slice(0, params.limit || 20)
            };
        }
    } catch (error) {
        console.error('❌ Alerts Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function getCustomers(params = {}) {
    try {
        console.log('👥 Fetching Customers...', params);

        let query = supabase
            .from('customers')
            .select('id, name, email, phone, cpf_cnpj, created_at');

        if (params.search) {
            query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
        }

        if (params.id) {
            query = query.eq('id', params.id);
        }

        query = query.limit(params.limit || 10);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('❌ Customers Error:', error.message);
        return { success: false, error: error.message };
    }
}

// Helper: Normalize text for fuzzy matching
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

// Helper: Calculate similarity between two strings (0-1)
function similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;

    const editDistance = (s1, s2) => {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };

    return (longer.length - editDistance(longer, shorter)) / longer.length;
}

async function getStationDetails(params) {
    try {
        console.log('⚡ Fetching Station Details...', params);

        let stationId = params.stationId;

        if (!stationId || isNaN(stationId)) {
            const searchTerm = params.name || params.stationId;
            if (!searchTerm) throw new Error('Station ID or Name is required');

            console.log(`🔍 Searching for station with name: "${searchTerm}"...`);

            const normalizedSearch = normalizeText(searchTerm);
            const allStations = await solarmanClient.stationListAll({ size: 200 });

            let bestMatch = null;
            let bestScore = 0;

            for (const station of allStations.stationList) {
                if (!station.name) continue;

                const normalizedName = normalizeText(station.name);

                if (normalizedName.includes(normalizedSearch)) {
                    bestMatch = station;
                    bestScore = 1.0;
                    break;
                }

                const score = similarity(normalizedSearch, normalizedName);
                if (score > bestScore && score > 0.6) {
                    bestScore = score;
                    bestMatch = station;
                }
            }

            if (bestMatch) {
                stationId = bestMatch.id;
                console.log(`✅ Found station: ${bestMatch.name} (ID: ${stationId}, Score: ${(bestScore * 100).toFixed(0)}%)`);
            } else {
                return { success: false, error: `Não encontrei nenhuma usina parecida com "${searchTerm}"` };
            }
        }

        const realtime = await solarmanClient.stationRealTime(stationId);
        const devicesResult = await solarmanClient.stationDevices({
            stationId: stationId,
            page: 1,
            size: 50
        });

        // Filter only inverters (exclude meters, collectors, etc.)
        const allDevices = devicesResult.deviceListItems || [];
        const inverters = allDevices.filter(device => {
            const type = String(device.deviceType || '').toUpperCase();
            return type.includes('INVERTER') || type.includes('INV');
        });

        console.log(`📊 Found ${allDevices.length} total devices, ${inverters.length} inverters`);

        const { data: dbStation } = await supabase
            .from('stations')
            .select('*')
            .eq('solarman_id', stationId)
            .single();

        return {
            success: true,
            data: {
                realtime,
                devices: inverters, // Only return inverters
                allDevicesCount: allDevices.length,
                dbInfo: dbStation
            }
        };
    } catch (error) {
        console.error('❌ Station Details Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function getOfflineStations() {
    try {
        console.log('🔴 Fetching Offline Stations...');

        const stations = await solarmanClient.stationListAll({ size: 200 });
        const stationList = stations.stationList || [];

        const offline = stationList.filter(s => s.generationPower === 0 || s.generationPower === null);

        return {
            success: true,
            data: {
                count: offline.length,
                stations: offline.map(s => ({
                    id: s.id,
                    name: s.name,
                    status: s.networkStatus,
                    lastUpdate: s.lastUpdateTime
                }))
            }
        };
    } catch (error) {
        console.error('❌ Offline Stations Error:', error.message);
        return { success: false, error: error.message };
    }
}

async function getOperationalPanel() {
    try {
        console.log('📈 Fetching Operational Panel Data...');

        const stations = await solarmanClient.stationListAll({ size: 100 });
        const stationList = stations.stationList || [];

        const total = stationList.length;
        const online = stationList.filter(s => s.generationPower > 0).length;
        const offline = total - online;

        const totalPower = stationList.reduce((acc, curr) => acc + (curr.generationPower || 0), 0);

        return {
            success: true,
            data: {
                summary: {
                    total,
                    generating: online,
                    connected: stationList.filter(s => s.networkStatus === 'NORMAL').length,
                    offline,
                    totalProduction: (totalPower / 1000).toFixed(2)
                }
            }
        };
    } catch (error) {
        console.error('❌ Operational Panel Error:', error.message);
        return { success: false, error: error.message };
    }
}

router.post('/chat', authMiddleware, async (req, res) => {
    const { message, conversationHistory = [] } = req.body;
    console.log(`\n💬 New Message Received: "${message}"`);

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const messages = [
            {
                role: 'system',
                content: `Você é Jota, assistente de energia solar. Seja DIRETO, RÁPIDO e VISUAL.

REGRAS DE OURO:
1. SEMPRE mostre dados quando pedirem (use as ferramentas!)
2. Respostas CURTAS - máximo 1 frase
3. SEM enrolação, SEM repetir info óbvia
4. Fale como um colega técnico casual

QUANDO USAR FERRAMENTAS:
- "tem problema/alerta/offline" → getOfflineStations OU getAlerts
- "mostra/lista" → SEMPRE use ferramenta visual
- "quantas" → só responda o número
- "como tá" + nome → getStationDetails (mostra inversores!)
- "inversores" + nome → getStationDetails
- "painel/visão geral" → getOperationalPanel
- "alertas" → getAlerts (busca da API Solarman)

EXEMPLOS:
User: "A gente tem alguma usina com problema"
Jota: *chama getOfflineStations* "Ó, essas aqui."

User: "você consegue me mostrar quais são"
Jota: *chama getOfflineStations ou getAlerts* "Tá na tela."

User: "me mostra os inversores do João"
Jota: *chama getStationDetails* "Ó, 2 inversores aqui."

User: "quantas offline?"
Jota: "33."

User: "me passa os alertas"
Jota: *chama getAlerts* "Esses aqui tão com alerta."

NUNCA:
- Falar sem mostrar quando pedirem lista
- Dar explicações longas
- Repetir números que já disse`
            },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        const tools = [
            {
                type: 'function',
                function: {
                    name: 'queryDatabase',
                    description: 'Executa uma query SQL read-only no banco de dados.',
                    parameters: {
                        type: 'object',
                        properties: { sql: { type: 'string', description: 'Query SQL (apenas SELECT)' } },
                        required: ['sql']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getSolarmanData',
                    description: 'Busca dados da API Solarman',
                    parameters: {
                        type: 'object',
                        properties: {
                            endpoint: { type: 'string', enum: ['stations', 'station_realtime', 'station_devices', 'station_alerts'] },
                            params: { type: 'object' }
                        },
                        required: ['endpoint']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getSystemStatus',
                    description: 'Retorna resumo do status do sistema',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getAlerts',
                    description: 'Busca alertas ativos do sistema. Use quando perguntarem especificamente sobre ALERTAS (não offline). Mostra lista visual.',
                    parameters: {
                        type: 'object',
                        properties: {
                            stationId: { type: 'number', description: 'ID da usina (opcional)' },
                            status: { type: 'string', description: 'Status do alerta: active, resolved (opcional)' },
                            limit: { type: 'number', description: 'Limite de resultados (padrão: 20)' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getCustomers',
                    description: 'Busca clientes no sistema. Pode buscar por nome, email ou ID.',
                    parameters: {
                        type: 'object',
                        properties: {
                            search: { type: 'string', description: 'Termo de busca (nome ou email)' },
                            id: { type: 'number', description: 'ID específico do cliente' },
                            limit: { type: 'number', description: 'Limite de resultados (padrão: 10)' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getStationDetails',
                    description: 'Busca detalhes completos de uma usina. Pode buscar pelo ID numérico ou pelo NOME da usina.',
                    parameters: {
                        type: 'object',
                        properties: {
                            stationId: { type: 'string', description: 'ID ou NOME da usina' }
                        },
                        required: ['stationId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getOfflineStations',
                    description: 'OBRIGATÓRIO usar quando perguntarem sobre usinas com problema/offline/alerta ou pedirem para mostrar/listar. Retorna lista visual completa.',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'getOperationalPanel',
                    description: 'Retorna dados do painel de operação: usinas gerando, conectadas, offline, produção total.',
                    parameters: { type: 'object', properties: {} }
                }
            }
        ];

        console.log('🤖 Sending request to OpenAI...');
        let response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 150 // Limit response length for speed
        });

        let assistantMessage = response.choices[0].message;

        // Track tool calls data for visualization
        const toolCallsData = [];

        while (assistantMessage.tool_calls) {
            messages.push(assistantMessage);

            for (const toolCall of assistantMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`🛠️ Jota calling tool: ${functionName}`, functionArgs);

                let functionResult;
                switch (functionName) {
                    case 'queryDatabase':
                        functionResult = await queryDatabase(functionArgs.sql);
                        break;
                    case 'getSolarmanData':
                        functionResult = await getSolarmanData(functionArgs.endpoint, functionArgs.params);
                        break;
                    case 'getSystemStatus':
                        functionResult = await getSystemStatus();
                        break;
                    case 'getAlerts':
                        functionResult = await getAlerts(functionArgs);
                        break;
                    case 'getCustomers':
                        functionResult = await getCustomers(functionArgs);
                        break;
                    case 'getStationDetails':
                        functionResult = await getStationDetails(functionArgs);
                        break;
                    case 'getOperationalPanel':
                        functionResult = await getOperationalPanel();
                        break;
                    case 'getOfflineStations':
                        functionResult = await getOfflineStations();
                        break;
                    default:
                        functionResult = { success: false, error: 'Unknown function' };
                }

                // Store data for visualization
                if (functionResult.success && functionResult.data) {
                    toolCallsData.push({
                        type: functionName,
                        data: functionResult.data
                    });
                }

                // Send summarized result to OpenAI to save tokens
                let summarizedResult = functionResult;
                if (functionResult.success && functionResult.data) {
                    switch (functionName) {
                        case 'getSystemStatus':
                            summarizedResult = {
                                success: true,
                                summary: `${functionResult.data.stations.total} usinas total, ${functionResult.data.stations.online} online, ${functionResult.data.stations.offline} offline, ${functionResult.data.tickets.open} tickets abertos`
                            };
                            break;
                        case 'getOperationalPanel':
                            summarizedResult = {
                                success: true,
                                summary: `${functionResult.data.summary.generating} gerando, ${functionResult.data.summary.connected} conectadas, ${functionResult.data.summary.offline} offline, produção total: ${functionResult.data.summary.totalProduction} kW`
                            };
                            break;
                        case 'getAlerts':
                            const alertCount = Array.isArray(functionResult.data) ? functionResult.data.length : 0;
                            summarizedResult = {
                                success: true,
                                summary: `${alertCount} alertas encontrados`
                            };
                            break;
                        case 'getCustomers':
                            const customerCount = Array.isArray(functionResult.data) ? functionResult.data.length : 0;
                            summarizedResult = {
                                success: true,
                                summary: `${customerCount} clientes encontrados`
                            };
                            break;
                        case 'getStationDetails':
                            const inverterCount = functionResult.data.devices?.length || 0;
                            const power = functionResult.data.realtime?.generationPower || 0;
                            summarizedResult = {
                                success: true,
                                summary: `${inverterCount} inversores, gerando ${power} kW`
                            };
                            break;
                        case 'getOfflineStations':
                            summarizedResult = {
                                success: true,
                                summary: `${functionResult.data.count} usinas offline encontradas`
                            };
                            break;
                    }
                }

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(summarizedResult)
                });
            }

            response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                tools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 150
            });

            assistantMessage = response.choices[0].message;
        }
        const textResponse = assistantMessage.content;
        console.log(`🤖 AI Response: "${textResponse}"`);

        // --- ElevenLabs Integration ---
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        const VOICE_ID = 'xWdpADtEio43ew1zGxUQ';

        if (!ELEVENLABS_API_KEY) {
            console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
            return res.status(500).json({ error: 'ELEVENLABS_API_KEY não configurada' });
        }

        console.log(`🎤 calling ElevenLabs TTS...`);
        console.log(`   - Voice ID: ${VOICE_ID}`);
        console.log(`   - Model: eleven_multilingual_v2`);
        console.log(`   - Text Length: ${textResponse.length}`);

        try {
            const elevenLabsResponse = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
                {
                    text: textResponse,
                    model_id: 'eleven_turbo_v2_5',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true
                    }
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY
                    },
                    responseType: 'arraybuffer',
                    timeout: 60000 // 60 seconds timeout
                }
            );

            console.log('✅ ElevenLabs TTS Success!');
            console.log(`   - Status: ${elevenLabsResponse.status}`);
            console.log(`   - Data Size: ${elevenLabsResponse.data.byteLength} bytes`);

            const buffer = Buffer.from(elevenLabsResponse.data);
            const audioBase64 = buffer.toString('base64');

            res.json({
                text: textResponse,
                audio: audioBase64,
                toolCallsData, // NEW: Include data for visualization
                conversationHistory: [
                    ...conversationHistory,
                    { role: 'user', content: message },
                    { role: 'assistant', content: textResponse }
                ]
            });

        } catch (elevenLabsError) {
            console.error('❌ ElevenLabs API FAILED');

            let errorMessage = 'Erro na geração de voz (ElevenLabs)';
            let errorDetails = elevenLabsError.message;

            if (elevenLabsError.response) {
                console.error(`   - Status: ${elevenLabsError.response.status}`);
                console.error(`   - Headers:`, elevenLabsError.response.headers);

                try {
                    const errorData = Buffer.from(elevenLabsError.response.data).toString('utf8');
                    console.error(`   - Data: ${errorData}`);
                    const parsedError = JSON.parse(errorData);
                    errorDetails = parsedError.detail?.message || parsedError.message || errorData;
                } catch (e) {
                    console.error(`   - Data: (Could not parse error data)`);
                }
            } else if (elevenLabsError.request) {
                console.error('   - No response received from ElevenLabs');
                errorDetails = 'Sem resposta da ElevenLabs';
            }

            res.status(500).json({
                error: errorMessage,
                details: errorDetails
            });
        }

    } catch (error) {
        console.error('🔥 CRITICAL ERROR in /chat:', error);
        res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
    }
});

module.exports = router;
