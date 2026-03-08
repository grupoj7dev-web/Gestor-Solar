const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { analyzeAllPlants, shouldCreateTicket, generateAIInsights } = require('../services/ai-vision-service');
const { generateTicketDetails } = require('../services/aiTicketGenerator');
const { generatePDFReport } = require('../services/pdf-report-service');
const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../dashboard_cache.json');
const CONFIG_FILE = path.join(__dirname, '../../ai-vision-config.json');

// Default configuration
let aiVisionConfig = {
    enabled: true,
    minSeverity: 'high',
    excludeWithOpenTickets: true,
    autoRefreshInterval: 30000, // 30 seconds
    lastUpdate: null
};

// Keep expensive AI insights cached to reduce token usage and latency
const insightsCache = {
    signature: null,
    expiresAt: 0,
    insights: null,
};

const INSIGHTS_TTL_MS = Number(process.env.AI_VISION_INSIGHTS_TTL_MS || 5 * 60 * 1000);

function getQuietHoursContext() {
    const now = new Date();
    const nowBrazil = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hour = nowBrazil.getHours();
    const isNighttime = hour >= 18 || hour < 6;

    return {
        timezone: 'America/Sao_Paulo',
        startHour: 18,
        endHour: 6,
        currentHour: hour,
        isNighttime,
        reason: isNighttime
            ? 'Silêncio noturno ativo: alertas e anomalias ficam ocultos entre 18:00 e 06:00.'
            : 'Monitoramento ativo: fora da janela de silêncio noturno.'
    };
}

function buildInsightsSignature(analysis) {
    const issueCounts = {};
    for (const anomaly of analysis.anomalies || []) {
        for (const issue of anomaly.issues || []) {
            issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        }
    }
    return JSON.stringify({
        totalPlants: analysis.totalPlants || 0,
        plantsWithIssues: analysis.plantsWithIssues || 0,
        bySeverity: {
            critical: (analysis.anomalies || []).filter((a) => a.severity === 'critical').length,
            high: (analysis.anomalies || []).filter((a) => a.severity === 'high').length,
            medium: (analysis.anomalies || []).filter((a) => a.severity === 'medium').length,
            low: (analysis.anomalies || []).filter((a) => a.severity === 'low').length,
            info: (analysis.anomalies || []).filter((a) => a.severity === 'info').length,
        },
        issueCounts,
    });
}

// Load config from disk
try {
    if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        aiVisionConfig = { ...aiVisionConfig, ...JSON.parse(raw) };
        console.log('🤖 Loaded AI Vision config from disk');
    }
} catch (err) {
    console.error('⚠️ Failed to load AI Vision config:', err.message);
}

// Save config to disk
function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(aiVisionConfig, null, 2));
    } catch (err) {
        console.error('⚠️ Failed to save AI Vision config:', err.message);
    }
}

// GET /api/ai-vision/analysis - Get current AI analysis of all plants
router.get('/analysis', authMiddleware, async (req, res) => {
    try {
        // Load cached stats data
        let statsData = null;

        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            statsData = JSON.parse(raw);
        }

        if (!statsData || !statsData.stationsDetail) {
            return res.status(503).json({
                error: 'Stats data not available yet. Please wait for initial data fetch.',
                retry: true
            });
        }

        // Run rule-based detection first (cheap)
        const analysis = await analyzeAllPlants(statsData, { includeInsights: false });

        // Use cached insights when possible to reduce token spend
        const signature = buildInsightsSignature(analysis);
        const now = Date.now();
        const canUseCached =
            insightsCache.insights &&
            insightsCache.signature === signature &&
            insightsCache.expiresAt > now;

        if (canUseCached) {
            analysis.insights = insightsCache.insights;
        } else {
            const insights = await generateAIInsights(analysis.anomalies || []);
            analysis.insights = insights;
            insightsCache.signature = signature;
            insightsCache.insights = insights;
            insightsCache.expiresAt = now + INSIGHTS_TTL_MS;
        }

        // Update last update time
        aiVisionConfig.lastUpdate = new Date().toISOString();
        saveConfig();

        res.json({
            ...analysis,
            quietHours: getQuietHoursContext(),
            config: {
                autoRefreshInterval: aiVisionConfig.autoRefreshInterval,
                enabled: aiVisionConfig.enabled
            }
        });

    } catch (error) {
        console.error('❌ Error in AI Vision analysis:', error);
        res.status(500).json({
            error: 'Failed to perform AI analysis',
            details: error.message
        });
    }
});

// GET /api/ai-vision/config - Get auto-ticket configuration
router.get('/config', authMiddleware, async (req, res) => {
    try {
        res.json(aiVisionConfig);
    } catch (error) {
        console.error('❌ Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// PUT /api/ai-vision/config - Update auto-ticket configuration
router.put('/config', authMiddleware, async (req, res) => {
    try {
        const { enabled, minSeverity, excludeWithOpenTickets, autoRefreshInterval } = req.body;

        if (enabled !== undefined) aiVisionConfig.enabled = enabled;
        if (minSeverity !== undefined) aiVisionConfig.minSeverity = minSeverity;
        if (excludeWithOpenTickets !== undefined) aiVisionConfig.excludeWithOpenTickets = excludeWithOpenTickets;
        if (autoRefreshInterval !== undefined) aiVisionConfig.autoRefreshInterval = autoRefreshInterval;

        saveConfig();

        console.log('✅ AI Vision config updated:', aiVisionConfig);

        res.json(aiVisionConfig);
    } catch (error) {
        console.error('❌ Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

// POST /api/ai-vision/create-ticket - Create ticket from anomaly
router.post('/create-ticket', authMiddleware, async (req, res) => {
    try {
        const { anomaly } = req.body;
        const userId = req.user?.userId || req.user?.id || null;
        const userName = req.user?.name || req.user?.email || 'Sistema I.A.';

        if (!anomaly || !anomaly.plantId) {
            return res.status(400).json({ error: 'Anomaly data with plantId is required' });
        }

        // Get customer ID from plant
        const { data: customerStation } = await supabase
            .from('customer_stations')
            .select('customer_id')
            .eq('station_id', anomaly.plantId)
            .single();

        if (!customerStation) {
            return res.status(404).json({
                error: 'Plant not linked to a customer',
                details: 'Please link this plant to a customer first'
            });
        }

        // Generate ticket description using AI
        const primaryIssue = anomaly.issues[0];
        const allIssues = anomaly.issues.map(i => i.message).join(', ');

        // Create a simplified alert data object for the AI
        const alertData = {
            alert_name: primaryIssue.message,
            alert_code: primaryIssue.type,
            status: anomaly.severity,
            msg: allIssues
        };

        const inverterData = {
            modelo: 'Sistema Solar',
            marca: 'Solarman',
            device_sn: anomaly.plantId
        };

        // Generate AI ticket details
        let ticketDetails;
        try {
            ticketDetails = await generateTicketDetails(alertData, inverterData);
        } catch (aiError) {
            console.error('AI generation failed, using fallback:', aiError);
            ticketDetails = {
                description: `Problema detectado automaticamente pela Visão I.A.\n\nPlanta: ${anomaly.plantName}\nProblemas: ${allIssues}\n\nDetalhes:\n${anomaly.issues.map(i => `- ${i.message}: ${i.details}`).join('\n')}`,
                priority: anomaly.severity === 'critical' ? 'high' : anomaly.severity === 'high' ? 'high' : 'medium',
                reason: primaryIssue.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            };
        }

        // Find or create reason
        let reasonId = null;
        const { data: existingReason } = await supabase
            .from('ticket_reasons')
            .select('id')
            .ilike('title', ticketDetails.reason)
            .single();

        if (existingReason) {
            reasonId = existingReason.id;
        } else {
            const { data: newReason } = await supabase
                .from('ticket_reasons')
                .insert([{
                    title: ticketDetails.reason,
                    ai_prompt: 'Gerado automaticamente pela Visão I.A.'
                }])
                .select()
                .single();

            if (newReason) reasonId = newReason.id;
        }

        // Generate ticket number
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const customerCode = customerStation.customer_id.substring(0, 6).toUpperCase();
        const random = Math.floor(1000 + Math.random() * 9000);
        const ticket_number = `${year}${month}-${customerCode}-${random}`;

        // Create ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert([{
                ticket_number,
                customer_id: customerStation.customer_id,
                origin: 'ai_vision',
                initial_attendant_id: userId || null,
                reason_id: reasonId,
                description: ticketDetails.description,
                priority: ticketDetails.priority,
                status: 'open',
                generation_status: 'not_generating',
                emotional_status: 'neutral'
            }])
            .select()
            .single();

        if (ticketError) throw ticketError;

        // Add to history
        await supabase.from('ticket_history').insert([{
            ticket_id: ticket.id,
            status: 'open',
            comment: `Chamado criado automaticamente pela Visão I.A. - ${primaryIssue.message}`,
            changed_by: userId || null,
                changed_by_name: userName
        }]);

        console.log(`✅ Auto-ticket created: ${ticket_number} for plant ${anomaly.plantName}`);

        res.status(201).json({
            success: true,
            ticket,
            message: 'Ticket created successfully'
        });

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        res.status(500).json({
            error: 'Failed to create ticket',
            details: error.message
        });
    }
});

// POST /api/ai-vision/auto-create-tickets - Analyze and auto-create tickets for all issues
router.post('/auto-create-tickets', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id || null;
        const userName = req.user?.name || req.user?.email || 'Sistema I.A.';

        // Load cached stats data
        let statsData = null;
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            statsData = JSON.parse(raw);
        }

        if (!statsData || !statsData.stationsDetail) {
            return res.status(503).json({
                error: 'Stats data not available yet',
                retry: true
            });
        }

        // Detection only; insights are not needed for automatic ticket creation
        const analysis = await analyzeAllPlants(statsData, { includeInsights: false });

        const ticketsCreated = [];
        const ticketsSkipped = [];

        // Process each anomaly
        for (const anomaly of analysis.anomalies) {
            if (shouldCreateTicket(anomaly, aiVisionConfig)) {
                try {
                    // Create ticket via internal call
                    const response = await fetch(`http://localhost:${process.env.PORT || 4001}/api/ai-vision/create-ticket`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': req.headers.authorization
                        },
                        body: JSON.stringify({ anomaly, userId, userName })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        ticketsCreated.push({
                            plantName: anomaly.plantName,
                            ticketNumber: result.ticket.ticket_number
                        });
                    } else {
                        ticketsSkipped.push({
                            plantName: anomaly.plantName,
                            reason: 'Failed to create ticket'
                        });
                    }
                } catch (err) {
                    console.error(`Failed to create ticket for ${anomaly.plantName}:`, err);
                    ticketsSkipped.push({
                        plantName: anomaly.plantName,
                        reason: err.message
                    });
                }
            } else {
                ticketsSkipped.push({
                    plantName: anomaly.plantName,
                    reason: 'Does not meet criteria for auto-ticket'
                });
            }
        }

        res.json({
            success: true,
            ticketsCreated: ticketsCreated.length,
            ticketsSkipped: ticketsSkipped.length,
            details: {
                created: ticketsCreated,
                skipped: ticketsSkipped
            }
        });

    } catch (error) {
        console.error('❌ Error in auto-create tickets:', error);
        res.status(500).json({
            error: 'Failed to auto-create tickets',
            details: error.message
        });
    }
});

// POST /api/ai-vision/generate-report - Generate PDF report
router.post('/generate-report', authMiddleware, async (req, res) => {
    try {
        console.log('📄 Generating PDF report...');

        // Load cached stats data
        let statsData = null;
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            statsData = JSON.parse(raw);
        }

        if (!statsData || !statsData.stationsDetail) {
            return res.status(503).json({
                error: 'Stats data not available yet',
                retry: true
            });
        }

        // Perform AI analysis
        const analysis = await analyzeAllPlants(statsData);

        // Generate PDF
        const pdfBuffer = await generatePDFReport(analysis);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-ai-vision-${new Date().toISOString().split('T')[0]}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

        console.log('✅ PDF report generated successfully');

    } catch (error) {
        console.error('❌ Error generating PDF report:', error);
        res.status(500).json({
            error: 'Failed to generate PDF report',
            details: error.message
        });
    }
});

module.exports = router;
