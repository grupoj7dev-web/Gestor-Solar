const { callGemini } = require('./gemini-client');

/**
 * Generates ticket details using AI based on alert data
 * @param {Object} alertData - The alert data from Solarman
 * @param {Object} inverterData - The inverter information
 * @returns {Promise<Object>} - Generated ticket details (description, priority, reason)
 */
async function generateTicketDetails(alertData, inverterData) {
    try {
        const prompt = `
Analise este alerta de inversor solar e gere informações para um chamado técnico.

DADOS DO ALERTA:
- Mensagem: ${alertData.alert_name || alertData.msg || 'Erro desconhecido'}
- Código: ${alertData.alert_code || alertData.code || 'N/A'}
- Status: ${alertData.status}
- Data: ${new Date().toLocaleString('pt-BR')}

DADOS DO INVERSOR:
- Modelo: ${inverterData.modelo || 'Desconhecido'}
- Marca: ${inverterData.marca || 'Desconhecida'}
- SN: ${inverterData.device_sn}

Responda APENAS um JSON com o seguinte formato:
{
  "description": "Descrição técnica detalhada e profissional do problema em português (2-3 frases). Inclua possíveis causas e sugestões de verificação.",
  "priority": "low" | "medium" | "high",
  "reason": "Categoria Curta e Capitalizada (ex: Falha de Comunicação, Subtensão, Sobretemperatura)"
}

Critérios de Prioridade:
- High: Falhas que param a geração (ex: Falha de rede, Erro interno, Falha de isolamento)
- Medium: Alertas que reduzem eficiência mas não param (ex: Sobretemperatura, Tensão alta)
- Low: Avisos informativos ou falhas momentâneas de comunicação
`;

        return await callGemini(prompt, { expectJson: true });

    } catch (error) {
        console.error('Error generating AI ticket details:', error);
        // Fallback in case of AI failure
        return {
            description: `Alerta automático detectado: ${alertData.alert_name || 'Erro desconhecido'}. Código: ${alertData.alert_code || 'N/A'}. Verifique o equipamento.`,
            priority: 'medium',
            reason: 'Alerta Automático'
        };
    }
}

module.exports = { generateTicketDetails };
