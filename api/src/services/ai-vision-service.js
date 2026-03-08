const supabase = require('../config/supabase');
const { SolarmanClient } = require('../solarmanClient');
const { callGemini } = require('./gemini-client');

const client = new SolarmanClient();

/**
 * Calculate expected generation based on installed capacity and time of day
 * @param {Object} plant - Plant data with installedCapacity
 * @returns {number} Expected power in Watts
 */
function calculateExpectedGeneration(plant) {
    const now = new Date();
    const hour = now.getHours();

    // Solar generation curve (simplified)
    // Peak hours: 11:00 - 14:00 (80-100% capacity)
    // Morning/Afternoon: 7:00-11:00, 14:00-17:00 (30-80% capacity)
    // Early/Late: 6:00-7:00, 17:00-18:00 (10-30% capacity)
    // Night: 18:00-6:00 (0% capacity)

    const installedCapacityW = (plant.installedCapacity || 0) * 1000; // Convert kW to W

    if (hour >= 18 || hour < 6) return 0; // Night
    if (hour >= 6 && hour < 7) return installedCapacityW * 0.10; // Early morning
    if (hour >= 7 && hour < 9) return installedCapacityW * 0.30; // Morning
    if (hour >= 9 && hour < 11) return installedCapacityW * 0.60; // Late morning
    if (hour >= 11 && hour < 14) return installedCapacityW * 0.80; // Peak
    if (hour >= 14 && hour < 16) return installedCapacityW * 0.60; // Afternoon
    if (hour >= 16 && hour < 17) return installedCapacityW * 0.40; // Late afternoon
    if (hour >= 17 && hour < 18) return installedCapacityW * 0.15; // Evening

    return 0;
}

/**
 * Define monitoring rules
 */
const MONITORING_RULES = {
    // Rule 1: Plant completely offline
    PLANT_OFFLINE: {
        id: 'PLANT_OFFLINE',
        name: 'Planta Offline',
        description: 'Planta completamente offline (sem comunicação)',
        severity: 'critical',
        check: (plant, context) => {
            return plant.networkStatus === 'ALL_OFFLINE' || plant.networkStatus === 'NO_DEVICE';
        }
    },


    // Rule 2: No generation today (total daily generation = 0)
    NO_GENERATION_TODAY: {
        id: 'NO_GENERATION_TODAY',
        name: 'Sem Geração Hoje',
        description: 'Planta não gerou energia hoje (geração diária = 0 kWh)',
        severity: 'high',
        check: (plant, context) => {
            const todayGeneration = plant.stats?.today || 0;
            // Check during daytime hours (6am-6pm)
            return todayGeneration === 0 && context.isDaytime;
        }
    }
};

/**
 * Detect anomalies in plant data using rule-based system
 * @param {Object} plant - Plant data from stats service
 * @returns {Object|null} Anomaly object or null if no issues
 */
function detectAnomalies(plant) {
    // Use Brazilian time (UTC-3)
    const now = new Date();
    const brazilianTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hour = brazilianTime.getHours();

    // NIGHTTIME SILENCE: 18:00 to 06:00 (Brazilian time)
    // User requested strict silence: Ignore ALL alerts/issues at night
    const isNighttime = hour >= 18 || hour < 6;

    if (isNighttime) {
        return null;
    }

    const isDaytime = !isNighttime;

    // Calculate expected power and efficiency
    const expectedPower = calculateExpectedGeneration(plant);
    const actualPower = plant.generationPower || 0;
    const efficiency = expectedPower > 0 ? (actualPower / expectedPower) * 100 : 100;

    // Context for rule evaluation
    const context = {
        isDaytime,
        hour,
        expectedPower,
        actualPower,
        efficiency
    };

    const issues = [];
    const rulesViolated = [];

    // Check each rule
    Object.values(MONITORING_RULES).forEach(rule => {
        // Since we return early for nighttime above, we don't need the check here anymore

        const triggered = rule.check(plant, context);
        if (triggered) {
            console.log(`[AI Vision] Anomaly detected for ${plant.name}: ${rule.name} (Value: ${plant.stats?.today})`);

            const issue = {
                type: rule.id,
                severity: rule.severity,
                message: rule.name,
                details: rule.description,
                rule: {
                    id: rule.id,
                    name: rule.name,
                    description: rule.description
                }
            };

            // Add specific details based on rule type
            if (rule.id === 'NO_GENERATION_TODAY') {
                issue.details = `${rule.description} - Verificado após as 12:00`;
            } else if (rule.id === 'DEVICE_ALERTS') {
                issue.details = `${rule.description} - Quantidade: ${plant.alertCount || (plant.alerts?.length || 0)}`;
            }

            issues.push(issue);
            rulesViolated.push(rule.name);
        }
    });

    // NOTE: We no longer check for active alerts here
    // Alerts are only informational and don't trigger anomalies

    // Check for existing open tickets (informational only)
    if (plant.openTicketCount > 0) {
        issues.push({
            type: 'open_tickets',
            severity: 'info',
            message: `${plant.openTicketCount} chamado(s) aberto(s)`,
            details: `Já existem chamados em andamento para esta planta`,
            rule: null
        });
    }

    if (issues.length === 0) return null;

    // Determine overall severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    const maxSeverity = issues.reduce((max, issue) => {
        return severityOrder[issue.severity] > severityOrder[max] ? issue.severity : max;
    }, 'info');

    return {
        plantId: plant.id,
        plantName: plant.name,
        owner: plant.owner,
        city: plant.city,
        severity: maxSeverity,
        issues,
        rulesViolated,
        timestamp: new Date().toISOString(),
        expectedPower: expectedPower,
        actualPower: actualPower,
        installedCapacity: plant.installedCapacity,
        todayGeneration: plant.stats?.today || 0,
        // Added details for frontend modal
        stats: plant.stats || {},
        alertCount: plant.alertCount || 0,
        lastUpdateTime: plant.lastUpdateTime,
        networkStatus: plant.networkStatus
    };
}


/**
 * Determine if an anomaly should trigger automatic ticket creation
 * @param {Object} anomaly - Anomaly object
 * @param {Object} config - Auto-ticket configuration
 * @returns {boolean} True if ticket should be created
 */
function shouldCreateTicket(anomaly, config = {}) {
    // Default config
    const {
        enabled = true,
        minSeverity = 'high',
        excludeWithOpenTickets = true
    } = config;

    if (!enabled) return false;

    // Don't create if there are already open tickets
    if (excludeWithOpenTickets) {
        const hasOpenTickets = anomaly.issues.some(issue => issue.type === 'open_tickets');
        if (hasOpenTickets) return false;
    }

    // Check severity threshold
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    const minSeverityLevel = severityOrder[minSeverity] || 3;
    const anomalySeverityLevel = severityOrder[anomaly.severity] || 0;

    return anomalySeverityLevel >= minSeverityLevel;
}

/**
 * Generate AI insights from all anomalies
 * @param {Array} anomalies - Array of anomaly objects
 * @returns {Promise<Object>} AI-generated insights
 */
async function generateAIInsights(anomalies) {
    try {
        if (!anomalies || anomalies.length === 0) {
            return {
                summary: 'Todas as plantas estão operando normalmente! ✅',
                recommendations: [],
                trend: 'stable',
                healthScore: 100
            };
        }

        // Prepare data for AI
        const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
        const highCount = anomalies.filter(a => a.severity === 'high').length;
        const mediumCount = anomalies.filter(a => a.severity === 'medium').length;

        const issueTypes = {};
        anomalies.forEach(anomaly => {
            anomaly.issues.forEach(issue => {
                issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
            });
        });

        const prompt = `
Você é um especialista em monitoramento de usinas solares. Analise os seguintes dados e forneça insights acionáveis.

RESUMO DOS PROBLEMAS:
- Total de plantas com problemas: ${anomalies.length}
- Críticos: ${criticalCount}
- Altos: ${highCount}
- Médios: ${mediumCount}

TIPOS DE PROBLEMAS:
${Object.entries(issueTypes).map(([type, count]) => `- ${type}: ${count} ocorrências`).join('\n')}

EXEMPLOS DE PLANTAS AFETADAS:
${anomalies.slice(0, 5).map(a => `- ${a.plantName} (${a.city}): ${a.issues.map(i => i.message).join(', ')}`).join('\n')}

Responda APENAS um JSON com o seguinte formato:
{
  "summary": "Resumo executivo em 1-2 frases sobre a situação geral",
  "recommendations": ["Recomendação 1", "Recomendação 2", "Recomendação 3"],
  "trend": "improving" | "stable" | "degrading",
  "priority_actions": ["Ação prioritária 1", "Ação prioritária 2"]
}

Seja objetivo, técnico e focado em ações práticas.
`;

        const insights = await callGemini(prompt, { expectJson: true });

        // Calculate health score
        const totalPlants = anomalies.length + 100; // Approximate total (should come from stats)
        const healthScore = Math.max(0, Math.min(100, 100 - (anomalies.length / totalPlants * 100)));

        return {
            ...insights,
            healthScore: Math.round(healthScore),
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error generating AI insights:', error);
        return {
            summary: `${anomalies.length} plantas com problemas detectados. Análise detalhada indisponível.`,
            recommendations: ['Verificar plantas offline', 'Analisar alertas ativos', 'Revisar geração baixa'],
            trend: 'stable',
            healthScore: 75,
            error: error.message
        };
    }
}

/**
 * Analyze all plants and detect issues
 * @param {Object} statsData - Data from stats service
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeAllPlants(statsData, options = {}) {
    try {
        const { includeInsights = true } = options;
        const plants = statsData.stationsDetail || [];
        const anomalies = [];

        // Detect anomalies in each plant
        plants.forEach(plant => {
            const anomaly = detectAnomalies(plant);
            if (anomaly) {
                anomalies.push(anomaly);
            }
        });

        // Sort by severity
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        anomalies.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

        // Generate AI insights (optional for cost/performance control)
        const insights = includeInsights
            ? await generateAIInsights(anomalies)
            : {
                summary: 'Insights de I.A. não processados nesta atualização.',
                recommendations: [],
                trend: 'stable',
                healthScore: 0,
            };

        return {
            totalPlants: plants.length,
            healthyPlants: plants.length - anomalies.length,
            plantsWithIssues: anomalies.length,
            anomalies,
            insights,
            monitoringRules: Object.values(MONITORING_RULES).map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                severity: r.severity,
                threshold: r.threshold
            })),
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error analyzing plants:', error);
        throw error;
    }
}

module.exports = {
    analyzeAllPlants,
    detectAnomalies,
    generateAIInsights,
    shouldCreateTicket,
    calculateExpectedGeneration,
    MONITORING_RULES
};
