import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Zap, Sun, Activity, TrendingUp, MapPin,
    Clock, Battery, AlertTriangle,
    CheckCircle, XCircle, Wifi, WifiOff, Box, Gauge, RefreshCw
} from 'lucide-react';
import { solarman } from '../lib/api';

export function CustomerPlant() {
    const { customer } = useOutletContext();
    const [stationData, setStationData] = useState(null);
    const [realtimeData, setRealtimeData] = useState(null);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        if (customer?.stations?.length > 0) {
            fetchData();
            // Auto-refresh a cada 30 segundos
            const interval = setInterval(fetchData, 30000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [customer]);

    const fetchData = async () => {
        try {
            const station = customer.stations[0];
            if (!station?.station_id) return;

            // Data de hoje no formato YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0];

            // Busca dados via Solarman
            const [realtimeRes, stationsRes, devicesRes, historyRes] = await Promise.allSettled([
                solarman.getStationRealtime(station.station_id),
                solarman.getStations(),
                solarman.getStationDevices(station.station_id),
                solarman.getStationHistory(station.station_id, {
                    timeType: 2, // 2 = Daily (returns total for the day)
                    startTime: today,
                    endTime: today
                })
            ]);

            // Dados em tempo real
            if (realtimeRes.status === 'fulfilled') {
                setRealtimeData(realtimeRes.value);
            }

            // Dados da estação
            if (stationsRes.status === 'fulfilled') {
                const foundStation = (stationsRes.value.stationList || []).find(
                    s => s.id === Number(station.station_id)
                );
                if (foundStation) {
                    // Calcula dayEnergy do histórico se disponível
                    if (historyRes.status === 'fulfilled' && historyRes.value?.stationDataItems?.length > 0) {
                        // Pega o valor do dia (timeType 2 retorna 1 item por dia)
                        const dayItem = historyRes.value.stationDataItems[0];
                        foundStation.dayEnergy = dayItem.generationValue || 0;
                    }
                    setStationData(foundStation);
                }
            }

            // Dispositivos (apenas inversores)
            if (devicesRes.status === 'fulfilled') {
                const devicesList = devicesRes.value.deviceListItems || devicesRes.value.deviceList || [];
                const inverters = devicesList.filter(d =>
                    d.deviceType?.toLowerCase().includes('inverter') ||
                    d.deviceType?.toLowerCase().includes('inversor')
                );
                setDevices(inverters);
            }

            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching plant data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (networkStatus, generationPower) => {
        // Se está gerando energia, está online independente do networkStatus
        if (generationPower > 0) {
            return {
                color: 'green',
                text: 'Online',
                description: 'Sistema operando normalmente',
                icon: <CheckCircle className="h-5 w-5 text-green-500" />
            };
        }

        // Traduções amigáveis dos status
        const statusMap = {
            'NORMAL': { color: 'green', text: 'Online', description: 'Sistema operando normalmente' },
            'ALL_OFFLINE': { color: 'red', text: 'Offline', description: 'Todos os dispositivos estão desconectados' },
            'PARTIAL_OFFLINE': { color: 'yellow', text: 'Parcialmente Online', description: 'Alguns dispositivos estão desconectados' },
            'FAULT': { color: 'red', text: 'Falha', description: 'Sistema apresenta falhas de comunicação' },
            'MAINTAIN': { color: 'yellow', text: 'Manutenção', description: 'Sistema em manutenção' }
        };

        const status = statusMap[networkStatus] || {
            color: 'gray',
            text: 'Desconhecido',
            description: 'Status não identificado'
        };

        const icons = {
            'green': <CheckCircle className="h-5 w-5 text-green-500" />,
            'red': <XCircle className="h-5 w-5 text-red-500" />,
            'yellow': <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            'gray': <AlertTriangle className="h-5 w-5 text-gray-500" />
        };

        return { ...status, icon: icons[status.color] };
    };

    const StatCard = ({ icon: Icon, label, value, unit, color = 'blue', trend }) => (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${color}-50`}>
                    <Icon className={`h-6 w-6 text-${color}-600`} />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" />
                        {trend}
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">
                {value}
                {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
            </p>
        </div>
    );

    const DeviceCard = ({ device }) => {
        const isOnline = device.connectStatus === 1 || device.status === 'ONLINE';

        return (
            <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h4 className="font-semibold text-gray-900">{device.deviceName || device.deviceSn}</h4>
                        <p className="text-sm text-gray-500">{device.deviceType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-gray-400" />
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-gray-500">SN</p>
                        <p className="font-semibold text-gray-900 text-xs">{device.deviceSn}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Status</p>
                        <p className={`font-semibold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando dados da usina...</p>
                </div>
            </div>
        );
    }

    if (!customer?.stations?.length) {
        return (
            <div className="p-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma Usina Vinculada</h3>
                    <p className="text-gray-600">Este cliente ainda não possui usinas fotovoltaicas vinculadas.</p>
                </div>
            </div>
        );
    }

    // Dados calculados - usando os campos CORRETOS da API Solarman
    const generationPower = realtimeData?.generationPower || 0;
    const totalEnergy = realtimeData?.generationTotal || 0; // Total acumulado em kWh
    const dayEnergy = stationData?.dayEnergy || 0; // Energia do dia calculada do histórico
    const installedCapacity = stationData?.installedCapacity || 0;

    const statusInfo = getStatusInfo(stationData?.networkStatus, generationPower);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Usina Fotovoltaica</h1>
                        <p className="text-gray-500 mt-1">{stationData?.name || 'Carregando...'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {lastUpdate.toLocaleTimeString('pt-BR')}
                        </div>
                        <button
                            onClick={fetchData}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Atualizar dados"
                        >
                            <RefreshCw className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={`rounded-2xl p-6 ${statusInfo.color === 'green'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    : statusInfo.color === 'yellow'
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                    } border-2`}>
                    <div className="flex items-center gap-4">
                        {statusInfo.icon}
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Status: {statusInfo.text}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {statusInfo.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        icon={Zap}
                        label="Potência Atual"
                        value={(generationPower / 1000).toFixed(2)}
                        unit="kW"
                        color="blue"
                    />
                    <StatCard
                        icon={Sun}
                        label="Energia Hoje"
                        value={dayEnergy.toFixed(1)}
                        unit="kWh"
                        color="yellow"
                    />
                    <StatCard
                        icon={Activity}
                        label="Total Gerado"
                        value={(totalEnergy / 1000).toFixed(1)}
                        unit="MWh"
                        color="purple"
                    />
                    <StatCard
                        icon={Battery}
                        label="Capacidade Instalada"
                        value={(installedCapacity / 1000).toFixed(2)}
                        unit="kWp"
                        color="green"
                    />
                </div>

                {/* Technical Info */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Box className="h-6 w-6 text-blue-600" />
                        Informações Técnicas
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Última Atualização</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {stationData?.lastUpdateTime
                                    ? new Date(stationData.lastUpdateTime * 1000).toLocaleString('pt-BR')
                                    : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Inversores</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-lg font-semibold text-gray-900">
                                    {devices.filter(d => d.connectStatus === 1 || d.status === 'ONLINE').length}
                                    <span className="text-sm text-gray-500 font-normal"> / {devices.length} Online</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Devices (Inverters) */}
                {devices.length > 0 && (
                    <div className="bg-white rounded-2xl p-8 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <Gauge className="h-6 w-6 text-blue-600" />
                            Inversores ({devices.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {devices.map((device, idx) => (
                                <DeviceCard key={idx} device={device} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Location */}
                {stationData?.latitude && stationData?.longitude && (
                    <div className="bg-white rounded-2xl p-8 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <MapPin className="h-6 w-6 text-blue-600" />
                            Localização
                        </h2>
                        <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                src={`https://www.google.com/maps?q=${stationData.latitude},${stationData.longitude}&output=embed`}
                                allowFullScreen
                            ></iframe>
                        </div>
                        <div className="mt-3 text-sm text-gray-500">
                            <p>Coordenadas: {stationData.latitude.toFixed(6)}, {stationData.longitude.toFixed(6)}</p>
                            <p className="mt-1">{stationData.locationAddress || 'Endereço não disponível'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
