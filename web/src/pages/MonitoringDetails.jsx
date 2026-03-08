import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Activity, AlertTriangle, Settings, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function MonitoringDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();

    const [customer, setCustomer] = useState(null);
    const [inverter, setInverter] = useState(null);
    const [parameters, setParameters] = useState([]);
    const [station, setStation] = useState(null);
    const [devicesData, setDevicesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // State to track expanded devices
    const [expandedDevices, setExpandedDevices] = useState({});

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchRealtimeData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [id]);

    const fetchData = async () => {
        try {
            // 1. Fetch Customer Data
            const customerRes = await api.get(`/customers/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const customerData = customerRes.data;
            setCustomer(customerData);

            // 2. Get First Linked Inverter
            if (customerData.inverters?.length > 0) {
                const inv = customerData.inverters[0].inverter;
                setInverter(inv);

                // Fetch Parameters
                const paramsRes = await api.get(`/inverters/${inv.id}/parameters`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                setParameters(paramsRes.data);
            }

            // 3. Get First Linked Station
            if (customerData.stations?.length > 0) {
                const st = customerData.stations[0];
                setStation(st);

                // Fetch Detailed Realtime Data
                const devicesRes = await api.get(`/stations/${st.station_id}/devices/realtime`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                setDevicesData(devicesRes.data);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRealtimeData = async () => {
        if (!station) return;
        setRefreshing(true);
        try {
            const res = await api.get(`/stations/${station.station_id}/devices/realtime`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setDevicesData(res.data);
        } catch (error) {
            console.error('Error refreshing realtime data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const toggleDevice = (deviceId) => {
        setExpandedDevices(prev => ({
            ...prev,
            [deviceId]: !prev[deviceId]
        }));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!customer) return <div>Cliente não encontrado</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/monitoring')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {customer.customer_type === 'pf' ? customer.full_name : customer.company_name}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Comparativo de Monitoramento</p>
                    </div>
                </div>
                <button
                    onClick={fetchRealtimeData}
                    disabled={refreshing}
                    className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Atualizar dados"
                >
                    <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Reference Inverter */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-fit">
                    <div className="bg-blue-50 p-6 border-b border-blue-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Zap className="h-6 w-6 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-bold text-blue-900">Inversor Exemplo</h2>
                        </div>
                        <p className="text-blue-700 text-sm">Parâmetros de referência configurados</p>
                    </div>

                    {inverter ? (
                        <div className="p-6 space-y-6">
                            {/* Inverter Specs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Marca/Modelo</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{inverter.marca} {inverter.modelo}</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potência Nominal</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{inverter.potencia_nominal} kW</p>
                                </div>
                            </div>

                            {/* Parameters List */}
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Parâmetros Monitorados
                                </h3>
                                {parameters.length > 0 ? (
                                    <div className="space-y-3">
                                        {parameters.map(param => (
                                            <div key={param.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{param.parameter_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {param.parameter_id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-bold text-blue-600">
                                                        {param.operator} {param.value}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${param.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                        param.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {param.severity}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                        Nenhum parâmetro configurado
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                            Nenhum inversor vinculado a este cliente.
                        </div>
                    )}
                </div>

                {/* Right Column: Realtime Data */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-fit">
                    <div className="bg-green-50 p-6 border-b border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Activity className="h-6 w-6 text-green-600" />
                            </div>
                            <h2 className="text-lg font-bold text-green-900">Dados em Tempo Real</h2>
                        </div>
                        <p className="text-green-700 text-sm">Dados completos dos inversores da usina</p>
                    </div>

                    {station ? (
                        <div className="p-6 space-y-6">
                            {/* Station Info */}
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100 mb-6">
                                <div>
                                    <p className="font-semibold text-green-900">{station.station_name}</p>
                                    <p className="text-xs text-green-700">ID: {station.station_id}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${devicesData?.devices?.[0]?.currentData?.dataList?.find(d => d.key === 'APo_t1')?.value > 0
                                    ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                    {devicesData?.devices?.[0]?.currentData?.dataList?.find(d => d.key === 'APo_t1')?.value > 0
                                        ? 'Gerando' : 'Sem Geração'}
                                </div>
                            </div>

                            {/* Devices List (Accordion) */}
                            {devicesData?.devices?.length > 0 ? (
                                <div className="space-y-4">
                                    {devicesData.devices.map((device, idx) => {
                                        const isExpanded = expandedDevices[device.deviceId];
                                        // Try to find power for summary
                                        const powerItem = device.currentData?.dataList?.find(d => d.key === 'APo_t1');
                                        let powerValue = powerItem?.value;
                                        let powerUnit = powerItem?.unit || '';

                                        // Convert W to kW if needed
                                        if (powerUnit === 'W' && powerValue) {
                                            powerValue = (parseFloat(powerValue) / 1000).toFixed(2);
                                            powerUnit = 'kW';
                                        }

                                        return (
                                            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleDevice(device.deviceId)}
                                                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                                            <Zap className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="font-bold text-gray-800 dark:text-gray-100">{device.name || 'Inversor'}</h3>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{device.deviceSn}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {powerValue !== undefined && (
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{powerValue} {powerUnit}</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Potência</p>
                                                            </div>
                                                        )}
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {device.currentData?.dataList?.map((item, i) => (
                                                                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 flex justify-between items-center hover:bg-green-50 transition-colors group">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-green-900">{item.name}</span>
                                                                        <span className="text-[10px] text-gray-400 font-mono">{item.key}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-green-700">{item.value}</span>
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{item.unit}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    Carregando dados dos dispositivos...
                                </div>
                            )}

                            {/* AI Analysis Section */}
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <div className="p-1 bg-purple-100 rounded">
                                        <Zap className="h-4 w-4 text-purple-600" />
                                    </div>
                                    Análise Inteligente da Usina
                                </h3>

                                <AnalysisPanel
                                    parameters={parameters}
                                    devices={devicesData?.devices || []}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                            Nenhuma planta Solarman vinculada a este cliente.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Analysis Component
function AnalysisPanel({ parameters, devices }) {
    const [report, setReport] = useState(null);
    const activeParameters = useMemo(
        () => (parameters || []).filter((p) => p.enabled !== false),
        [parameters]
    );

    useEffect(() => {
        if (!activeParameters.length || !devices.length) return;
        generateReport();
    }, [activeParameters, devices]);

    const generateReport = () => {
        const issues = [];
        let checkedCount = 0;

        devices.forEach(device => {
            activeParameters.forEach(param => {
                checkedCount++;
                const dataPoint = device.currentData?.dataList?.find(d => d.key === param.parameter_id);

                if (dataPoint && dataPoint.value !== undefined) {
                    const realValue = parseFloat(dataPoint.value);
                    const refValue = parseFloat(param.value);
                    let isViolation = false;

                    // Check rule violation
                    switch (param.operator) {
                        case '>': isViolation = realValue > refValue; break;
                        case '>=': isViolation = realValue >= refValue; break;
                        case '<': isViolation = realValue < refValue; break;
                        case '<=': isViolation = realValue <= refValue; break;
                        case '==':
                        case '=': isViolation = realValue === refValue; break;
                        case '!=': isViolation = realValue !== refValue; break;
                    }

                    if (isViolation) {
                        issues.push({
                            device: device.name || device.deviceSn,
                            parameter: param.parameter_name,
                            realValue: `${realValue} ${dataPoint.unit || ''}`,
                            rule: `${param.operator} ${param.value}`,
                            severity: param.severity,
                            solution: getSolution(param.parameter_name, realValue, refValue)
                        });
                    }
                }
            });
        });

        setReport({ issues, checkedCount });
    };

    const getSolution = (paramName, real, ref) => {
        const p = paramName.toLowerCase();
        if (p.includes('tensão') || p.includes('voltage')) return "Verificar conexões CA, ajustes de proteção do inversor ou tap do transformador da rede.";
        if (p.includes('temperatura') || p.includes('temperature')) return "Verificar sistema de ventilação, limpeza dos dissipadores e se há obstruções no fluxo de ar.";
        if (p.includes('frequência') || p.includes('frequency')) return "Oscilação na rede da concessionária. Verificar configurações de proteção de frequência.";
        if (p.includes('potência') || p.includes('power')) return "Verificar se há sombreamento nos módulos, sujeira ou strings desconectadas.";
        return "Consultar manual do fabricante para este código de erro ou comportamento.";
    };

    if (!report) return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 text-sm">
            Aguardando dados para análise...
        </div>
    );

    if (report.issues.length === 0) {
        return (
            <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                <div className="p-1 bg-green-100 rounded-full mt-0.5">
                    <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div>
                    <p className="text-sm text-green-800 font-medium">Por aqui tudo certo! ✅</p>
                    <p className="text-xs text-green-700 mt-1">
                        Analisei {devices.length} inversores e {activeParameters.length} parâmetros ativos. Todos os dados estão dentro dos limites configurados.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-800 text-sm font-medium">
                ⚠️ Encontrei {report.issues.length} anomalia(s) na usina:
            </div>

            {report.issues.map((issue, idx) => (
                <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded uppercase tracking-wider">
                            {issue.severity}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {issue.device}
                        </span>
                    </div>

                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">{issue.parameter}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Valor atual <span className="font-mono font-bold text-red-600">{issue.realValue}</span> viola a regra <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{issue.rule}</span>
                    </p>

                    <div className="bg-blue-50 p-3 rounded-lg flex gap-3">
                        <div className="shrink-0 mt-0.5">
                            <Zap className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-800 mb-0.5">Sugestão da IA</p>
                            <p className="text-xs text-blue-700 leading-relaxed">
                                {issue.solution}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
