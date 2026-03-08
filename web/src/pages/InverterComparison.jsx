import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, solarman } from '../lib/api';
import {
    ArrowLeft, Zap, Activity, TrendingUp, AlertCircle, CheckCircle,
    Thermometer, Gauge, Battery, Sun, Wind, Droplets, Clock, ChevronDown
} from 'lucide-react';

export function InverterComparison() {
    const { stationId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [station, setStation] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [registeredInverters, setRegisteredInverters] = useState([]);
    const [solarmanInverters, setSolarmanInverters] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchComparisonData();
    }, [stationId]);

    const fetchComparisonData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch station info
            const stationsData = await solarman.getStations();

            // Try to find station by ID (handle both string and number comparison)
            let stationData = stationsData?.find(s => s.id === parseInt(stationId));
            if (!stationData) {
                // Try string comparison as fallback
                stationData = stationsData?.find(s => String(s.id) === String(stationId));
            }

            setStation(stationData);

            if (!stationData) {
                throw new Error('Usina não encontrada');
            }

            // Fetch customer link
            let customerId;
            try {
                const linkResponse = await api.get(`/stations/${stationId}/customer`);
                customerId = linkResponse.data?.customer_id;
            } catch (linkError) {
                console.error('Error fetching customer link:', linkError);
                throw new Error('Não foi possível buscar o vínculo do cliente.');
            }

            if (!customerId) {
                throw new Error('Esta usina não possui cliente vinculado');
            }

            // Fetch customer with inverters and their parameters
            const customerResponse = await api.get(`/customers/${customerId}`);
            setCustomer(customerResponse.data);

            const rawInverters = customerResponse.data.inverters || [];

            // Map the nested inverter data and fetch parameters for each
            const detailedInvertersPromises = rawInverters.map(async (item) => {
                const invData = item.inverter || {}; // Access nested inverter object
                let parameters = [];

                if (invData.id) {
                    try {
                        const paramsRes = await api.get(`/inverters/${invData.id}/parameters`);
                        parameters = (paramsRes.data || []).filter((p) => p.enabled !== false);
                    } catch (pErr) {
                        console.error('Error fetching parameters for inverter:', invData.id, pErr);
                    }
                }

                return {
                    ...invData, // Spread the actual inverter data fields (marca, modelo, etc.)
                    linkId: item.id, // Keep link ID reference
                    parameters // Attach fetched parameters
                };
            });

            const detailedInverters = await Promise.all(detailedInvertersPromises);
            setRegisteredInverters(detailedInverters);


            // Fetch real-time Solarman inverter data
            const devicesData = await solarman.getStationDevices(stationId);
            const inverterDevices = devicesData.deviceListItems?.filter(d =>
                d.deviceType === 'INVERTER'
            ) || [];

            // Fetch detailed data for each inverter
            const inverterDataPromises = inverterDevices.map(async (device) => {
                try {
                    const realtimeResponse = await api.get(`/devices/${device.deviceSn}/realtime`);
                    return {
                        ...device,
                        realtimeData: realtimeResponse.data.dataList || []
                    };
                } catch (err) {
                    console.error(`Error fetching data for ${device.deviceSn}:`, err);
                    return { ...device, realtimeData: [] };
                }
            });

            const invertersWithData = await Promise.all(inverterDataPromises);
            setSolarmanInverters(invertersWithData);

        } catch (err) {
            console.error('Error fetching comparison data:', err);
            setError(err.message || 'Erro ao carregar dados de comparação');
        } finally {
            setLoading(false);
        }
    };

    const getParameterValue = (dataList, key) => {
        const param = dataList?.find(p => p.key === key);
        return param ? `${param.value} ${param.unit || ''}`.trim() : '-';
    };

    const formatPower = (value) => {
        if (!value) return '-';
        if (value >= 1000) return `${(value / 1000).toFixed(2)} kW`;
        return `${value} W`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Carregando dados de comparação...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao Carregar</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/monitoring')}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Voltar para Monitoramento
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="max-w-[1800px] mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/monitoring')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar para Monitoramento
                    </button>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Comparação de Inversores</h1>
                                <p className="text-gray-500 mt-1">
                                    {station?.name} • Cliente: {customer?.full_name || customer?.company_name}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Inversores Cadastrados</p>
                                    <p className="text-2xl font-bold text-blue-600">{registeredInverters.length}</p>
                                </div>
                                <div className="h-12 w-px bg-gray-200"></div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Inversores Solarman</p>
                                    <p className="text-2xl font-bold text-green-600">{solarmanInverters.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left Side - Registered Inverters */}
                    <div className="space-y-4">
                        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                <Zap className="h-6 w-6" />
                                Inversores Cadastrados no Sistema
                            </h2>
                            <p className="text-sm text-blue-700 mt-1">Parâmetros configurados pelo usuário</p>
                        </div>

                        {registeredInverters.length === 0 ? (
                            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                                <Zap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Nenhum inversor cadastrado</p>
                                <p className="text-sm text-gray-400 mt-1">Adicione inversores ao cliente para compará-los</p>
                            </div>
                        ) : (
                            registeredInverters.map((inverter, index) => (
                                <div key={inverter.linkId || index} className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                                        <h3 className="text-white font-bold text-lg">Inversor {index + 1}</h3>
                                        <p className="text-blue-100 text-sm">{inverter.marca} {inverter.modelo}</p>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium h-5">Marca</p>
                                                <p className="text-gray-900 font-semibold">{inverter.marca || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium h-5">Modelo</p>
                                                <p className="text-gray-900 font-semibold">{inverter.modelo || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium h-5">Potência Nominal</p>
                                                <p className="text-gray-900 font-semibold">{inverter.potencia_nominal ? `${inverter.potencia_nominal} kW` : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium h-5">Tipo</p>
                                                <p className="text-gray-900 font-semibold">{inverter.tipo || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium h-5">Fases</p>
                                                <p className="text-gray-900 font-semibold">{inverter.fases ? `${inverter.fases}` : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium h-5">Tensão</p>
                                                <p className="text-gray-900 font-semibold">{inverter.tensao ? `${inverter.tensao}` : '-'}</p>
                                            </div>
                                        </div>

                                        {/* Parameters Section */}
                                        <div className="pt-4 border-t border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Gauge className="h-4 w-4 text-blue-600" />
                                                Parâmetros de Alerta
                                            </h4>

                                            {inverter.parameters && inverter.parameters.length > 0 ? (
                                                <div className="space-y-2">
                                                    {inverter.parameters.map((param) => (
                                                        <div key={param.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                                                            <span className="text-gray-600">{param.parameter_name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-medium text-gray-900">
                                                                    {param.operator} {param.value}{param.unit ? ` ${param.unit}` : ''}
                                                                </span>
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${param.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                                    param.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                                    }`}>
                                                                    {param.severity === 'critical' ? 'Crítico' :
                                                                        param.severity === 'high' ? 'Alto' : 'Normal'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">Nenhum parâmetro configurado</p>
                                            )}
                                        </div>

                                        {inverter.observacoes && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <p className="text-xs text-gray-500 font-medium mb-1">Observações</p>
                                                <p className="text-sm text-gray-700">{inverter.observacoes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Right Side - Solarman Inverters */}
                    <div className="space-y-4">
                        <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                            <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
                                <Activity className="h-6 w-6" />
                                Inversores Solarman (Tempo Real)
                            </h2>
                            <p className="text-sm text-green-700 mt-1">Dados em tempo real da API Solarman</p>
                        </div>

                        {solarmanInverters.length === 0 ? (
                            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Nenhum inversor encontrado</p>
                                <p className="text-sm text-gray-400 mt-1">A API Solarman não retornou inversores para esta usina</p>
                            </div>
                        ) : (
                            solarmanInverters.map((inverter, index) => {
                                // Helper to get raw value
                                const getRawValue = (key) => {
                                    const p = inverter.realtimeData?.find(x => x.key === key);
                                    return p ? parseFloat(p.value) : 0;
                                };

                                // Check power generation
                                const currentPower = getRawValue('APo_t1') || getRawValue('Pac') || 0;
                                const isGenerating = currentPower > 0;

                                // Determine status using 'connectStatus'
                                // API usually returns 'CONNECTED'/'DISCONNECTED' or 1/2
                                const statusRaw = String(inverter.connectStatus).toUpperCase();
                                const isConnected = statusRaw === 'CONNECTED' || statusRaw === '1' || statusRaw === 'ONLINE';

                                let isOnline = isConnected;
                                let statusLabel = isConnected ? 'Online' : 'Offline';

                                // Validation: If generating but reporting offline, show specific status
                                if (!isOnline && isGenerating) {
                                    isOnline = true;
                                    statusLabel = 'Gerando (Status Offline)';
                                }

                                return (
                                    <div key={inverter.deviceSn} className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-white font-bold text-lg">Inversor Real {index + 1}</h3>
                                                    <p className="text-green-100 text-sm">SN: {inverter.deviceSn}</p>
                                                </div>
                                                {isOnline ? (
                                                    <CheckCircle className="h-6 w-6 text-white" />
                                                ) : (
                                                    <AlertCircle className="h-6 w-6 text-yellow-300" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-6 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <Activity className="h-3 w-3" />
                                                        Status
                                                    </p>
                                                    <p className={`font-semibold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {statusLabel}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <Zap className="h-3 w-3" />
                                                        Potência Atual
                                                    </p>
                                                    <p className="text-gray-900 font-semibold">
                                                        {getParameterValue(inverter.realtimeData, 'APo_t1') || getParameterValue(inverter.realtimeData, 'Pac')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <Gauge className="h-3 w-3" />
                                                        Tensão
                                                    </p>
                                                    <p className="text-gray-900 font-semibold">
                                                        {getParameterValue(inverter.realtimeData, 'AV1') || getParameterValue(inverter.realtimeData, 'Uab')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Corrente
                                                    </p>
                                                    <p className="text-gray-900 font-semibold">
                                                        {getParameterValue(inverter.realtimeData, 'AC1') || getParameterValue(inverter.realtimeData, 'Ia')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <Thermometer className="h-3 w-3" />
                                                        Temperatura
                                                    </p>
                                                    <p className="text-gray-900 font-semibold">
                                                        {getParameterValue(inverter.realtimeData, 'T_AC_RDT1') || getParameterValue(inverter.realtimeData, 'T_inner')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <Sun className="h-3 w-3" />
                                                        Geração Hoje
                                                    </p>
                                                    <p className="text-gray-900 font-semibold">
                                                        {getParameterValue(inverter.realtimeData, 'Etdy_ge1') || getParameterValue(inverter.realtimeData, 'Etoday')}
                                                    </p>
                                                </div>
                                            </div>

                                            {inverter.realtimeData && inverter.realtimeData.length > 0 && (
                                                <div className="pt-3 border-t border-gray-100">
                                                    <details className="group">
                                                        <summary className="list-none cursor-pointer flex items-center justify-between text-xs text-gray-500 font-medium p-2 hover:bg-gray-50 rounded select-none">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                Todos os Dados
                                                            </span>
                                                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                                                        </summary>
                                                        <div className="grid grid-cols-2 gap-2 text-xs mt-3 pl-2">
                                                            {inverter.realtimeData
                                                                .filter(p => !['Pac', 'Uab', 'Ia', 'T_inner', 'Etoday', 'APo_t1', 'AV1', 'AC1', 'T_AC_RDT1', 'Etdy_ge1'].includes(p.key))
                                                                .map((param, i) => (
                                                                    <div key={i} className="bg-gray-50 rounded px-2 py-1 flex justify-between items-center group/item hover:bg-gray-100 transition-colors">
                                                                        <span className="text-gray-500 truncate mr-2" title={param.name || param.key}>
                                                                            {param.name || param.key}:
                                                                        </span>
                                                                        <span className="text-gray-900 font-medium whitespace-nowrap">
                                                                            {param.value} {param.unit}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
