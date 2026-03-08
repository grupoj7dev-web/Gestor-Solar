import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Brain, RefreshCw, Settings, AlertTriangle, CheckCircle, XCircle, Clock, Zap,
    TrendingUp, TrendingDown, Minus, Shield, ListChecks, Calendar, BarChart,
    MapPin, User, Server, Sun, X, ExternalLink, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Badge, Button, Input } from '../components/ui';
import { useNotification } from '../contexts/NotificationContext';
import { EmptyState, ErrorState, LoadingState } from '../components/feedback';

// Severity color mapping
const severityColors = {
    critical: 'from-red-500 to-red-600',
    high: 'from-orange-500 to-orange-600',
    medium: 'from-yellow-500 to-yellow-600',
    low: 'from-blue-500 to-blue-600',
    info: 'from-gray-500 to-gray-600'
};

const severityBg = {
    critical: 'bg-red-50 border-red-200',
    high: 'bg-orange-50 border-orange-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low: 'bg-blue-50 border-blue-200',
    info: 'bg-gray-50 border-gray-200'
};

const severityText = {
    critical: 'text-red-700',
    high: 'text-orange-700',
    medium: 'text-yellow-700',
    low: 'text-blue-700',
    info: 'text-gray-700'
};

export function AIVision() {
    const navigate = useNavigate();
    const { success, error: notifyError } = useNotification();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState({
        enabled: true,
        minSeverity: 'high',
        excludeWithOpenTickets: true
    });
    const [creatingTicket, setCreatingTicket] = useState(null);
    const [selectedAnomaly, setSelectedAnomaly] = useState(null);
    const [downloadingPDF, setDownloadingPDF] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('anomalies'); // 'anomalies', 'no_inverter'

    // Fetch analysis data
    const fetchAnalysis = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ai-vision/analysis');
            setAnalysis(response.data);
            setLastUpdate(new Date());
            setFetchError('');
        } catch (error) {
            console.error('Error fetching AI analysis:', error);
            setFetchError('Nao foi possivel carregar a analise da I.A.');
        } finally {
            setLoading(false);
        }
    };

    // Filter anomalies based on search and tab
    const allFilteredAnomalies = analysis?.anomalies?.filter(anomaly =>
        anomaly.plantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (anomaly.owner && anomaly.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (anomaly.city && anomaly.city.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const anomaliesList = allFilteredAnomalies.filter(a => a.networkStatus !== 'NO_DEVICE');
    const noDeviceList = allFilteredAnomalies.filter(a => a.networkStatus === 'NO_DEVICE');

    const currentList = activeTab === 'anomalies' ? anomaliesList : noDeviceList;

    // Fetch config
    const fetchConfig = async () => {
        try {
            const response = await api.get('/ai-vision/config');
            setConfig(response.data);
            if (response.data?.autoRefreshInterval) {
                setRefreshInterval(Math.max(10, Math.floor(Number(response.data.autoRefreshInterval) / 1000)));
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    // Update config
    const updateConfig = async (newConfig) => {
        try {
            await api.put('/ai-vision/config', newConfig);
            setConfig(newConfig);
            success('Configuracoes atualizadas.');
        } catch (error) {
            console.error('Error updating config:', error);
            notifyError('Nao foi possivel atualizar as configuracoes.');
        }
    };

    // Create ticket from anomaly
    const createTicket = async (anomaly) => {
        try {
            setCreatingTicket(anomaly.plantId);

            await api.post('/ai-vision/create-ticket', {
                anomaly
            });

            success(`Chamado criado para ${anomaly.plantName}.`);
            fetchAnalysis(); // Refresh to update open ticket counts
        } catch (error) {
            console.error('Error creating ticket:', error);
            notifyError(error.response?.data?.error || 'Erro ao criar chamado.');
        } finally {
            setCreatingTicket(null);
        }
    };

    // Download PDF Report
    const downloadPDFReport = async () => {
        try {
            setDownloadingPDF(true);
            const response = await api.post('/ai-vision/generate-report', {}, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio-ai-vision-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            success('Relatorio PDF gerado com sucesso.');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            notifyError('Erro ao gerar relatorio PDF. Tente novamente.');
        } finally {
            setDownloadingPDF(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchAnalysis();
        fetchConfig();
    }, []);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchAnalysis();
        }, refreshInterval * 1000);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    // Calculate health score color
    const getHealthScoreColor = (score) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        if (score >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    // Modal Component
    const PlantDetailsModal = ({ anomaly, onClose }) => {
        if (!anomaly) return null;

        const { stats, alertCount, plantId, plantName, owner, city, lastUpdateTime, rulesViolated, issues } = anomaly;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 flex items-start justify-between flex-shrink-0">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{plantName}</h2>
                            <div className="flex items-center gap-4 text-gray-300 text-sm">
                                <span className="flex items-center gap-1"><User className="h-4 w-4" /> {owner || '-'}</span>
                                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {city || '-'}</span>
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Atualizado: {new Date(lastUpdateTime).toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700 mb-2">
                                    <Zap className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Potência Atual</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {(anomaly.actualPower / 1000).toFixed(2)} <span className="text-sm text-gray-500 font-normal">kW</span>
                                </p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <div className="flex items-center gap-2 text-orange-700 mb-2">
                                    <Sun className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Hoje</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {stats?.today?.toFixed(2) || '0.00'} <span className="text-sm text-gray-500 font-normal">kWh</span>
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Mês</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {stats?.month?.toFixed(2) || '0.00'} <span className="text-sm text-gray-500 font-normal">kWh</span>
                                </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-2 text-purple-700 mb-2">
                                    <BarChart className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Ano</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {stats?.year?.toFixed(2) || '0.00'} <span className="text-sm text-gray-500 font-normal">kWh</span>
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2 text-gray-700 mb-2">
                                    <Server className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Total</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {stats?.total?.toFixed(2) || '0.00'} <span className="text-sm text-gray-500 font-normal">kWh</span>
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl border ${alertCount > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className={`flex items-center gap-2 mb-2 ${alertCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Alertas Ativos</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {alertCount}
                                </p>
                                {alertCount > 0 && (
                                    <button
                                        onClick={() => navigate(`/station/${plantId}`)}
                                        className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                                    >
                                        Ver detalhes
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Analysis & Issues */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Brain className="h-5 w-5 text-purple-600" />
                                Análise Inteligente
                            </h3>

                            {/* Violated Rules Pills */}
                            {rulesViolated && rulesViolated.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {rulesViolated.map((rule, idx) => (
                                        <span key={idx} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold border border-red-200">
                                            {rule}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-3">
                                {issues.map((issue, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm ${issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                                        issue.severity === 'high' ? 'bg-orange-50 border-orange-500' : 'bg-yellow-50 border-yellow-500'
                                        }`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`font-bold ${issue.severity === 'critical' ? 'text-red-900' :
                                                    issue.severity === 'high' ? 'text-orange-900' : 'text-yellow-900'
                                                    }`}>{issue.message}</h4>
                                                <p className="text-sm text-gray-700 mt-1">{issue.details}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                issue.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {issue.severity}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                        <button
                            onClick={() => navigate(`/station/${plantId}`)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Acessar Usina
                        </button>
                        <button
                            onClick={() => {
                                createTicket(anomaly);
                                onClose();
                            }}
                            disabled={creatingTicket === anomaly.plantId || anomaly.issues.some(i => i.type === 'open_tickets')}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
                        >
                            {creatingTicket === anomaly.plantId ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <ListChecks className="h-4 w-4" />
                            )}
                            {creatingTicket === anomaly.plantId ? 'Criando...' :
                                anomaly.issues.some(i => i.type === 'open_tickets') ? 'Chamado Aberto' : 'Criar Chamado'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <LoadingState
                    title="Analisando usinas com I.A..."
                    description="Coletando dados e calculando anomalias."
                />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <ErrorState
                    title="Erro ao carregar Visao I.A."
                    description={fetchError}
                    onRetry={fetchAnalysis}
                />
            </div>
        );
    }

    const insights = analysis?.insights || {};
    const healthScore = insights.healthScore || 0;
    const quietHours = analysis?.quietHours || null;
    const isNightSilence = quietHours?.isNighttime === true;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg">
                            <Brain className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Visão I.A.</h1>
                            <p className="text-gray-600 dark:text-gray-300">Monitoramento inteligente em tempo real</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Buscar planta, cidade..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-10 w-64 pl-3 pr-8"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Manual refresh */}
                        <Button
                            onClick={fetchAnalysis}
                            disabled={loading}
                            variant="outline"
                            className="h-10"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Verificando...' : 'Verificar Manual'}
                        </Button>

                        {/* PDF Download Button */}
                        <Button
                            onClick={downloadPDFReport}
                            disabled={downloadingPDF || loading}
                            className="h-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:scale-105 hover:shadow-xl"
                        >
                            <BarChart className={`h-4 w-4 ${downloadingPDF ? 'animate-pulse' : ''}`} />
                            {downloadingPDF ? 'Gerando PDF...' : 'Baixar Relatório PDF'}
                        </Button>

                        {/* Auto-refresh toggle */}
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500 font-medium">Auto:</span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`w-8 h-4 rounded-full transition-colors relative ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Super Jota Button */}
                        <Button
                            onClick={() => navigate('/super-jota')}
                            className="h-10 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:scale-105 hover:shadow-xl"
                        >
                            <Sparkles className="h-5 w-5" />
                            Super Jota
                        </Button>

                    </div>
                </div>

                {lastUpdate && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                    </p>
                )}

                {isNightSilence && (
                    <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Silêncio noturno ativo ({String(quietHours?.startHour).padStart(2, '0')}:00 às {String(quietHours?.endHour).padStart(2, '0')}:00):
                            alertas e anomalias ficam ocultos nesse período.
                        </p>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Score de Saude */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Score de Saúde</p>
                            <p className={`text-3xl font-bold mt-1 ${getHealthScoreColor(healthScore)}`}>
                                {healthScore}%
                            </p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                </motion.div>

                {/* Other Stats Cards omitted for brevity - assuming they were similar patterns */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Plantas</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                {analysis?.totalPlants || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                            <Zap className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Plantas Saudáveis</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">
                                {analysis?.healthyPlants || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Com Problemas</p>
                            <p className="text-3xl font-bold text-red-600 mt-1">
                                {analysis?.plantsWithIssues || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-1">
                <button
                    onClick={() => setActiveTab('anomalies')}
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'anomalies'
                        ? 'text-purple-600'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Anomalias Detectadas ({anomaliesList.length})
                    </div>
                    {activeTab === 'anomalies' && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('no_inverter')}
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'no_inverter'
                        ? 'text-purple-600'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4" />
                        Sem Inversores ({noDeviceList.length})
                    </div>
                    {activeTab === 'no_inverter' && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                        />
                    )}
                </button>
            </div>

            {/* Anomalies List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Problemas Detectados</h2>
                    <Badge className="px-3 py-1 text-sm font-medium">
                        {currentList.length} usinas
                    </Badge>
                </div>

                {currentList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence>
                            {currentList.map((anomaly, idx) => (
                                <motion.div
                                    key={anomaly.plantId}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        transition: { delay: Math.min(idx * 0.05, 1) } // Cap delay at 1s
                                    }}
                                    exit={{
                                        opacity: 0,
                                        x: 20,
                                        transition: { delay: 0, duration: 0.2 } // No delay on exit
                                    }}
                                    onClick={() => navigate(`/station/${anomaly.plantId}`)}
                                    className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border-2 cursor-pointer hover:shadow-xl transition-all ${severityBg[anomaly.severity]}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-gradient-to-r ${severityColors[anomaly.severity]} text-white`}>
                                                    {anomaly.severity}
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{anomaly.plantName}</h3>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-300">Proprietário:</span>
                                                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{anomaly.owner}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-300">Cidade:</span>
                                                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{anomaly.city}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-300">Potência Atual:</span>
                                                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                        {(anomaly.actualPower / 1000).toFixed(2)} kW
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-300">Potência Esperada:</span>
                                                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                                        {(anomaly.expectedPower / 1000).toFixed(2)} kW
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Violated Rules */}
                                            {anomaly.rulesViolated && anomaly.rulesViolated.length > 0 && (
                                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                        <Shield className="h-4 w-4" />
                                                        Regras Violadas:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {anomaly.rulesViolated.map((rule, ruleIdx) => (
                                                            <span key={ruleIdx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                                                                {rule}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {anomaly.issues.map((issue, issueIdx) => (
                                                    <div key={issueIdx} className={`p-3 rounded-lg ${severityBg[issue.severity]}`}>
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${severityText[issue.severity]}`} />
                                                            <div>
                                                                <p className={`font-semibold ${severityText[issue.severity]}`}>
                                                                    {issue.message}
                                                                </p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{issue.details}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <EmptyState
                        icon={CheckCircle}
                        title={activeTab === 'anomalies' ? 'Tudo certo' : 'Nenhuma usina sem inversores'}
                        description={
                            activeTab === 'anomalies'
                                ? (isNightSilence
                                    ? 'Nenhuma anomalia exibida porque o sistema esta em silencio noturno (18:00 as 06:00).'
                                    : 'Nenhuma anomalia detectada nos filtros atuais.')
                                : 'Nenhuma usina sem inversores encontrada.'
                        }
                        actionLabel="Atualizar dados"
                        onAction={fetchAnalysis}
                        className="border-green-200 bg-green-50/60"
                    />
                )}
            </div>

            {/* Config Modal */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700"
                    >
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configurações</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={config.enabled}
                                        onChange={(e) => updateConfig({ ...config, enabled: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Habilitar criação automática de chamados</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Severidade mínima para auto-chamado
                                </label>
                                <select
                                    value={config.minSeverity}
                                    onChange={(e) => updateConfig({ ...config, minSeverity: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="critical">Crítico</option>
                                    <option value="high">Alto</option>
                                    <option value="medium">Médio</option>
                                    <option value="low">Baixo</option>
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={config.excludeWithOpenTickets}
                                        onChange={(e) => updateConfig({ ...config, excludeWithOpenTickets: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Não criar se já houver chamado aberto</span>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowConfig(false)}
                            className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Plant Details Modal */}
            <AnimatePresence>
                {selectedAnomaly && (
                    <PlantDetailsModal
                        anomaly={selectedAnomaly}
                        onClose={() => setSelectedAnomaly(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}






