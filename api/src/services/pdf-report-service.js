const PDFDocument = require('pdfkit');
const { callGemini } = require('./gemini-client');

/**
 * Generate AI-powered solution for a plant's problem
 */
async function generateSolution(anomaly) {
    try {
        const problemDescription = anomaly.issues.map(i => `${i.message}: ${i.details}`).join('\n');

        const prompt = `Você é um especialista em sistemas fotovoltaicos. Analise o seguinte problema em uma usina solar e forneça uma solução detalhada.

PLANTA: ${anomaly.plantName}
PROBLEMAS DETECTADOS:
${problemDescription}

DADOS TÉCNICOS:
- Potência Atual: ${(anomaly.actualPower / 1000).toFixed(2)} kW
- Potência Esperada: ${(anomaly.expectedPower / 1000).toFixed(2)} kW
- Geração Hoje: ${anomaly.todayGeneration} kWh
- Capacidade Instalada: ${anomaly.installedCapacity} kW
- Status de Rede: ${anomaly.networkStatus}

Forneça uma resposta em JSON com o seguinte formato:
{
  "diagnostico": "Diagnóstico técnico do problema",
  "causa_provavel": "Causa mais provável do problema",
  "solucao": "Solução detalhada passo a passo",
  "urgencia": "baixa" | "media" | "alta" | "critica",
  "tempo_estimado": "Tempo estimado para resolução"
}

Seja técnico, objetivo e prático.`;

        return await callGemini(prompt, { expectJson: true });
    } catch (error) {
        console.error('Error generating AI solution:', error);
        return {
            diagnostico: 'Análise automática indisponível',
            causa_provavel: anomaly.issues[0]?.message || 'Problema não especificado',
            solucao: 'Verificar manualmente a planta e seus equipamentos.',
            urgencia: anomaly.severity === 'critical' ? 'critica' : 'alta',
            tempo_estimado: '1-2 horas'
        };
    }
}

function fallbackSolution(anomaly) {
    return {
        diagnostico: 'Análise automática resumida',
        causa_provavel: anomaly.issues?.[0]?.message || 'Problema não especificado',
        solucao: 'Validar comunicação, estado dos inversores e parâmetros elétricos da usina no local.',
        urgencia: anomaly.severity === 'critical' ? 'critica' : 'alta',
        tempo_estimado: '1-2 horas',
    };
}

async function mapWithConcurrency(items, concurrency, fn) {
    const results = new Array(items.length);
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const current = index++;
            results[current] = await fn(items[current], current);
        }
    }

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
    await Promise.all(workers);
    return results;
}

/**
 * Generate PDF report for all anomalies
 */
async function generatePDFReport(analysis) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('📄 Starting PDF generation...');
            console.log(`📊 Total plants: ${analysis.totalPlants}, Problems: ${analysis.plantsWithIssues}`);

            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                console.log('✅ PDF generation completed successfully!');
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', reject);

            console.log('📝 Writing PDF header...');
            // Header
            doc.fontSize(24)
                .fillColor('#2563eb')
                .text('Relatório de Análise I.A.', { align: 'center' });

            doc.fontSize(12)
                .fillColor('#666')
                .text('Sistema de Monitoramento Solar', { align: 'center' })
                .moveDown();

            doc.fontSize(10)
                .fillColor('#999')
                .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
                .moveDown(2);

            console.log('📊 Writing executive summary...');
            // Summary
            doc.fontSize(16)
                .fillColor('#000')
                .text('Resumo Executivo', { underline: true })
                .moveDown(0.5);

            doc.fontSize(11)
                .fillColor('#333')
                .text(`Total de Plantas: ${analysis.totalPlants}`)
                .text(`Plantas Saudáveis: ${analysis.healthyPlants}`)
                .text(`Plantas com Problemas: ${analysis.plantsWithIssues}`)
                .text(`Score de Saúde: ${analysis.insights.healthScore}%`)
                .moveDown(2);

            // Anomalies
            if (analysis.anomalies && analysis.anomalies.length > 0) {
                console.log(`🤖 Generating AI solutions for ${analysis.anomalies.length} plants in parallel...`);
                doc.fontSize(16)
                    .fillColor('#000')
                    .text('Plantas com Problemas Detectados', { underline: true })
                    .moveDown(1);

                // Control token usage: only top-N anomalies get full AI solution
                const maxAiSolutions = Number(process.env.AI_VISION_PDF_AI_LIMIT || 20);
                const aiConcurrency = Number(process.env.AI_VISION_PDF_AI_CONCURRENCY || 3);
                const anomaliesForAi = analysis.anomalies.slice(0, maxAiSolutions);

                // Generate AI solutions with limited concurrency
                const startTime = Date.now();
                const aiSolutions = await mapWithConcurrency(anomaliesForAi, aiConcurrency, async (anomaly, index) => {
                    console.log(`  ⏳ [${index + 1}/${analysis.anomalies.length}] Analyzing: ${anomaly.plantName}`);
                    return generateSolution(anomaly);
                });
                const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`✅ All AI solutions generated in ${elapsedTime}s!`);

                console.log('📄 Writing plant details to PDF...');
                for (let i = 0; i < analysis.anomalies.length; i++) {
                    const anomaly = analysis.anomalies[i];
                    const solution = i < maxAiSolutions ? aiSolutions[i] : fallbackSolution(anomaly);

                    if (i % 5 === 0) {
                        console.log(`  📝 Writing plant ${i + 1}/${analysis.anomalies.length}...`);
                    }

                    // Check if we need a new page
                    if (doc.y > 650) {
                        doc.addPage();
                    }

                    // Plant header
                    doc.fontSize(14)
                        .fillColor('#1e40af')
                        .text(`${i + 1}. ${anomaly.plantName}`, { continued: false })
                        .moveDown(0.3);

                    // Plant details
                    doc.fontSize(10)
                        .fillColor('#666')
                        .text(`Proprietário: ${anomaly.owner || 'N/A'}`)
                        .text(`Cidade: ${anomaly.city || 'N/A'}`)
                        .text(`Severidade: ${anomaly.severity.toUpperCase()}`)
                        .moveDown(0.5);

                    // Problems
                    doc.fontSize(11)
                        .fillColor('#dc2626')
                        .text('Problemas Detectados:', { underline: true })
                        .moveDown(0.3);

                    anomaly.issues.forEach(issue => {
                        doc.fontSize(10)
                            .fillColor('#333')
                            .text(`• ${issue.message}`, { indent: 20 })
                            .fontSize(9)
                            .fillColor('#666')
                            .text(`  ${issue.details}`, { indent: 25 })
                            .moveDown(0.2);
                    });

                    // AI Analysis
                    doc.moveDown(0.5)
                        .fontSize(11)
                        .fillColor('#059669')
                        .text('Análise I.A.:', { underline: true })
                        .moveDown(0.3);

                    doc.fontSize(10)
                        .fillColor('#333')
                        .text(`Diagnóstico: ${solution.diagnostico}`, { indent: 20 })
                        .moveDown(0.2)
                        .text(`Causa Provável: ${solution.causa_provavel}`, { indent: 20 })
                        .moveDown(0.2)
                        .text(`Urgência: ${solution.urgencia.toUpperCase()}`, { indent: 20 })
                        .moveDown(0.2)
                        .text(`Tempo Estimado: ${solution.tempo_estimado}`, { indent: 20 })
                        .moveDown(0.5);

                    // Solution
                    doc.fontSize(11)
                        .fillColor('#7c3aed')
                        .text('Solução Recomendada:', { underline: true })
                        .moveDown(0.3);

                    doc.fontSize(10)
                        .fillColor('#333')
                        .text(solution.solucao, { indent: 20, align: 'justify' })
                        .moveDown(1.5);

                    if (i === maxAiSolutions - 1 && analysis.anomalies.length > maxAiSolutions) {
                        doc.fontSize(9)
                            .fillColor('#666')
                            .text(`Obs.: a partir deste ponto foi usado diagnóstico resumido para otimizar custo de tokens.`, {
                                indent: 20,
                            })
                            .moveDown(1);
                    }

                    // Separator
                    if (i < analysis.anomalies.length - 1) {
                        doc.strokeColor('#ddd')
                            .lineWidth(1)
                            .moveTo(50, doc.y)
                            .lineTo(545, doc.y)
                            .stroke()
                            .moveDown(1);
                    }
                }
                console.log(`✅ All ${analysis.anomalies.length} plants written to PDF!`);
            } else {
                console.log('✅ No anomalies detected, writing success message...');
                doc.fontSize(12)
                    .fillColor('#059669')
                    .text('✓ Nenhuma anomalia detectada. Todas as plantas estão operando normalmente!',
                        { align: 'center' });
            }

            console.log('📝 Writing PDF footer...');
            // Footer
            doc.fontSize(8)
                .fillColor('#999')
                .text('Relatório gerado automaticamente pelo Sistema de Visão I.A.',
                    50,
                    doc.page.height - 30,
                    { align: 'center' });

            console.log('🔄 Finalizing PDF document...');
            doc.end();

        } catch (error) {
            console.error('❌ Error generating PDF:', error);
            reject(error);
        }
    });
}

module.exports = {
    generatePDFReport,
    generateSolution
};
