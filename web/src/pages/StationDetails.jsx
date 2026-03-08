import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { solarman, api } from '../lib/api';
import {
    ArrowLeft, Zap, AlertTriangle, CheckCircle, XCircle, MapPin, Calendar,
    Sparkles, Activity, Ticket, Power, TrendingUp, Sun, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const AlertItem = ({ alert, stationId }) => {
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const result = await solarman.analyzeAlert({
                alertName: alert.showName || alert.alertName,
                deviceType: alert.deviceType,
                message: alert.msg,
                stationId: stationId,
                deviceSn: alert.deviceSn
            });
            setAnalysis(result);
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
            <div className="flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-medium text-red-900">{alert.showName || alert.alertName || 'Alerta Desconhecido'}</h3>
                    <p className="text-sm text-red-700 mt-1">
                        Dispositivo: {alert.deviceSn} ({alert.deviceType})
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                        Ocorrido em: {new Date((alert.alertTime || alert.startTime) * 1000).toLocaleString('pt-BR')}
                    </p>
                </div>
                {!analysis && (
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                        {analyzing ? (
                            <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-3 w-3" />
                                Analisar com IA
                            </>
                        )}
                    </button>
                )}
            </div>

            {analysis && (
                <div className="ml-9 mt-2 p-4 rounded-lg bg-white dark:bg-gray-800 border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 rounded bg-blue-100">
                            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-blue-900">Análise Inteligente</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Significado</p>
                            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{analysis.meaning}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Recomendação</p>
                            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{analysis.advice}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export function StationDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Main Data State
    const [station, setStation] = useState(null);
    const [realtime, setRealtime] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [inverters, setInverters] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // History State
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState(new Date());
    const [viewMode, setViewMode] = useState('daily'); // 'daily', 'monthly', 'yearly'
    const [totalPeriod, setTotalPeriod] = useState(0);

    // Initial Fetch
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                console.log('🔍 Fetching station details for ID:', id);

                let foundStation = null;

                // Try to get from dashboard stats first (more reliable)
                try {
                    const statsRes = await api.get('/stats/dashboard');
                    foundStation = statsRes.data.stationsDetail?.find(s => String(s.id) === String(id));
                    if (foundStation) {
                        console.log('✅ Found station in dashboard stats:', foundStation.name);
                    }
                } catch (e) {
                    console.log('⚠️ Could not fetch from dashboard stats:', e.message);
                }

                // If not found, try Solarman API
                if (!foundStation) {
                    console.log('🔄 Trying Solarman API...');
                    const stationsRes = await solarman.getStations();
                    foundStation = (stationsRes.stationList || stationsRes || []).find(s =>
                        String(s.id) === String(id) || Number(s.id) === Number(id)
                    );
                }

                if (!foundStation) {
                    throw new Error('Usina não encontrada');
                }
                setStation(foundStation);

                // 2. Get Realtime Data
                const realtimeRes = await solarman.getStationRealtime(id);
                setRealtime(realtimeRes);

                // 3. Get Alerts
                const alertsRes = await solarman.getStationAlarms(id);
                let alertsList = alertsRes.stationAlertItems || alertsRes.alertList || [];

                if (foundStation.networkStatus && foundStation.networkStatus !== 'NORMAL' && alertsList.length === 0) {
                    const statusMessages = {
                        'ALL_OFFLINE': 'Todos os dispositivos da usina estão offline',
                        'PARTIAL_OFFLINE': 'Alguns dispositivos da usina estão offline',
                        'FAULT': 'A usina apresenta falhas de comunicação',
                        'MAINTAIN': 'A usina está em manutenção'
                    };

                    alertsList = [{
                        showName: `Status de Rede: ${foundStation.networkStatus}`,
                        deviceSn: 'Sistema',
                        deviceType: 'NETWORK',
                        alertTime: foundStation.lastUpdateTime,
                        msg: statusMessages[foundStation.networkStatus] || 'Status de rede anormal detectado',
                        synthetic: true
                    }];
                }
                setAlerts(alertsList);

                // 4. Get Inverters
                try {
                    const invertersRes = await solarman.getStationDevicesRealtime(id);
                    setInverters(invertersRes.devices || invertersRes.deviceListItems || []);
                } catch (e) {
                    console.log('Could not fetch inverters:', e);
                }

                // 5. Get Open Tickets
                try {
                    if (foundStation?.customerId) {
                        const ticketsRes = await api.get('/tickets');
                        const stationTickets = ticketsRes.data.filter(t =>
                            t.customer_id === foundStation.customerId &&
                            ['open', 'in_opening', 'in_execution', 'visit_scheduled'].includes(t.status)
                        );
                        setTickets(stationTickets);
                    }
                } catch (e) {
                    console.log('Could not fetch tickets:', e);
                }

            } catch (err) {
                console.error('Error fetching station details:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchData();
        }
    }, [id]);

    // History Fetching
    useEffect(() => {
        if (id) {
            fetchHistory();
        }
    }, [id, selectedPeriod, viewMode]);

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const year = selectedPeriod.getFullYear();
            const month = selectedPeriod.getMonth();

            if (viewMode === 'daily') {
                const lastDay = new Date(year, month + 1, 0).getDate();
                const startTime = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const endTime = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                const response = await solarman.getStationHistory(id, {
                    timeType: 2,
                    startTime,
                    endTime
                });

                if (response?.stationDataItems) {
                    const processedData = response.stationDataItems
                        .filter(item => item.year === year && item.month === (month + 1))
                        .map(item => ({
                            date: `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`,
                            label: `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}`,
                            energy: Number((item.generationValue || 0).toFixed(2)),
                        }))
                        .sort((a, b) => a.date.localeCompare(b.date));

                    setHistoryData(processedData);
                    setTotalPeriod(processedData.reduce((sum, item) => sum + item.energy, 0));
                } else {
                    setHistoryData([]);
                    setTotalPeriod(0);
                }

            } else if (viewMode === 'monthly') {
                const months = Array.from({ length: 12 }, (_, i) => i);
                const promises = months.map(m => {
                    const lastDay = new Date(year, m + 1, 0).getDate();
                    const start = `${year}-${String(m + 1).padStart(2, '0')}-01`;
                    const end = `${year}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    return solarman.getStationHistory(id, {
                        timeType: 2,
                        startTime: start,
                        endTime: end
                    }).then(res => ({ month: m, data: res.stationDataItems || [] }));
                });

                const results = await Promise.all(promises);
                const processedData = results.map(({ month, data }) => {
                    const totalEnergy = data.reduce((sum, item) => sum + (item.generationValue || 0), 0);
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    return {
                        date: `${year}-${String(month + 1).padStart(2, '0')}`,
                        label: monthNames[month],
                        energy: Number(totalEnergy.toFixed(2)),
                    };
                });

                setHistoryData(processedData);
                setTotalPeriod(processedData.reduce((sum, item) => sum + item.energy, 0));

            } else {
                const currentYear = new Date().getFullYear();
                const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
                const promises = years.map(y => {
                    const start = `${y}-01`;
                    const end = `${y}-12`;
                    return solarman.getStationHistory(id, {
                        timeType: 3,
                        startTime: start,
                        endTime: end
                    }).then(res => ({ year: y, data: res.stationDataItems || [] }));
                });

                const results = await Promise.all(promises);
                const processedData = results.map(({ year, data }) => {
                    const totalEnergy = data.reduce((sum, item) => sum + (item.generationValue || 0), 0);
                    return {
                        date: String(year),
                        label: String(year),
                        energy: Number(totalEnergy.toFixed(2)),
                    };
                });

                setHistoryData(processedData);
                setTotalPeriod(processedData.reduce((sum, item) => sum + item.energy, 0));
            }

        } catch (error) {
            console.error('Error fetching history:', error);
            setHistoryData([]);
            setTotalPeriod(0);
        } finally {
            setHistoryLoading(false);
        }
    };

    const changePeriod = (direction) => {
        const newDate = new Date(selectedPeriod);
        if (viewMode === 'daily') {
            newDate.setMonth(newDate.getMonth() + direction);
        } else if (viewMode === 'monthly') {
            newDate.setFullYear(newDate.getFullYear() + direction);
        }
        setSelectedPeriod(newDate);
    };

    const getPeriodName = () => {
        if (viewMode === 'daily') {
            return selectedPeriod.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        } else if (viewMode === 'monthly') {
            return selectedPeriod.getFullYear();
        } else {
            return 'Últimos 5 Anos';
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-xl">
                    <p className="font-semibold text-gray-900 mb-1">{payload[0].payload.label}</p>
                    <p className="text-blue-600 font-bold">
                        {payload[0].value} kWh
                    </p>
                </div>
            );
        }
        return null;
    };

    const maxEnergy = Math.max(...historyData.map(d => d.energy), 1);


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-blue-500" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Carregando detalhes...</p>
                </div>
            </div>
        );
    }

    if (error || !station) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Erro ao carregar usina</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Usina não encontrada'}</p>
                    <button
                        onClick={() => navigate('/operation')}
                        className="text-blue-600 hover:underline"
                    >
                        Voltar para o painel
                    </button>
                </div>
            </div>
        );
    }

    const isOffline = station.networkStatus === 'ALL_OFFLINE' || station.networkStatus === 'NO_DEVICE';
    const isOnline = !isOffline && station.generationPower > 0;
    const hasAlerts = alerts.length > 0;
    const displayPower = isOffline ? 0 : (realtime?.generationPower || 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => navigate('/operation')}
                    className="rounded-full p-2 hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{station.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {station.locationAddress || 'Endereço não informado'}
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Atualizado em: {new Date(station.lastUpdateTime * 1000).toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
                <div className="ml-auto flex gap-3">
                    {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            Online
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                            <XCircle className="h-4 w-4" />
                            Offline
                        </span>
                    )}
                    {hasAlerts && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                            <AlertTriangle className="h-4 w-4" />
                            {alerts.length} {alerts.length === 1 ? 'Alerta' : 'Alertas'}
                        </span>
                    )}
                    {tickets.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                            <Ticket className="h-4 w-4" />
                            {tickets.length} {tickets.length === 1 ? 'Chamado' : 'Chamados'}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Realtime Data Card */}
                <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        <Zap className="h-5 w-5 text-blue-600" />
                        Dados em Tempo Real
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Potência Atual</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                {(displayPower / 1000).toFixed(2)} <span className="text-lg font-normal text-gray-500 dark:text-gray-400">kW</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Produção Hoje</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {realtime?.generationTotal ? realtime.generationTotal.toFixed(2) : 0} kWh
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Capacidade</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {station.installedCapacity ? station.installedCapacity.toFixed(2) : 0} kWp
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inverters Section */}
                <div className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        <Power className="h-5 w-5 text-purple-600" />
                        Inversores ({inverters.length})
                    </h2>

                    {inverters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                            <Activity className="h-12 w-12 text-gray-300 mb-3" />
                            <p>Nenhum inversor encontrado</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {inverters.map((inverter, index) => {
                                const isWorking = inverter.generationPower > 0;
                                return (
                                    <div key={index} className={`p-4 rounded-lg border-2 ${isWorking ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-medium text-gray-900">{inverter.deviceName || `Inversor ${index + 1}`}</p>
                                                <p className="text-xs text-gray-500">SN: {inverter.deviceSn}</p>
                                            </div>
                                            {isWorking ? (
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="mt-3 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Potência:</span>
                                                <span className="font-semibold">{(inverter.generationPower / 1000).toFixed(2)} kW</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`font-medium ${isWorking ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {isWorking ? 'Funcionando' : 'Parado'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* History Section (New) */}
                <div className="lg:col-span-3 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <TrendingUp className="h-6 w-6 text-blue-600" />
                                Histórico de Geração
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Acompanhe a produção de energia ao longo do tempo</p>
                        </div>

                        {/* View Mode Tabs */}
                        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'daily'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Diário
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'monthly'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setViewMode('yearly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'yearly'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Anual
                            </button>
                        </div>
                    </div>

                    {/* Period Selector */}
                    {viewMode !== 'yearly' && (
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-6">
                            <button
                                onClick={() => changePeriod(-1)}
                                className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{getPeriodName()}</h3>
                            </div>
                            <button
                                onClick={() => changePeriod(1)}
                                className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
                                disabled={selectedPeriod >= new Date()}
                            >
                                <ChevronRight className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                    )}

                    {/* Stats & Chart Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Stats Column */}
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">Total do Período</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-900">
                                    {totalPeriod.toFixed(1)} <span className="text-sm font-normal text-blue-600">kWh</span>
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">Maior Geração</span>
                                </div>
                                <p className="text-2xl font-bold text-green-900">
                                    {maxEnergy.toFixed(1)} <span className="text-sm font-normal text-green-600">kWh</span>
                                </p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sun className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-800">Média</span>
                                </div>
                                <p className="text-2xl font-bold text-orange-900">
                                    {historyData.length > 0 ? (totalPeriod / historyData.length).toFixed(1) : '0.0'} <span className="text-sm font-normal text-orange-600">kWh</span>
                                </p>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="lg:col-span-3 h-[300px]">
                            {historyLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : historyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
                                        <Bar
                                            dataKey="energy"
                                            fill="#2563eb"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={50}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Sun className="h-10 w-10 mb-2 text-gray-300" />
                                    <p>Nenhum dado disponível</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Alerts Section */}
                <div className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Alertas e Eventos ({alerts.length})
                    </h2>

                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                            <CheckCircle className="h-12 w-12 text-green-100 mb-3" />
                            <p>Nenhum alerta ativo no momento</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alerts.map((alert, index) => (
                                <AlertItem key={index} alert={alert} stationId={id} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Open Tickets Section */}
                <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        <Ticket className="h-5 w-5 text-orange-600" />
                        Chamados Abertos ({tickets.length})
                    </h2>

                    {tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                            <CheckCircle className="h-12 w-12 text-green-100 mb-3" />
                            <p className="text-sm">Nenhum chamado aberto</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="p-3 rounded-lg bg-orange-50 border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="font-medium text-orange-900">#{String(ticket.ticket_number || ticket.id).padStart(3, '0')}</p>
                                        <span className="text-xs px-2 py-1 rounded-full bg-orange-200 text-orange-800">
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-orange-800 line-clamp-2">{ticket.description}</p>
                                    <p className="text-xs text-orange-600 mt-2">
                                        Aberto em: {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
