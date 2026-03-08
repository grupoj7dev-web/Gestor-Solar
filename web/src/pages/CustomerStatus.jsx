import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Zap, AlertCircle, CheckCircle, Server
} from 'lucide-react';
import { api } from '../lib/api';

export function CustomerStatus() {
    const { customer } = useOutletContext();
    const [stationsData, setStationsData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (customer?.stations?.length > 0) {
            fetchStationsAndDevices();
        } else {
            setLoading(false);
        }
    }, [customer]);

    const fetchStationsAndDevices = async () => {
        try {
            const promises = customer.stations.map(async (station) => {
                if (!station?.station_id) return null;

                try {
                    const [realtimeRes, devicesRes] = await Promise.allSettled([
                        api.get(`/stations/${station.station_id}/realtime`),
                        api.get(`/stations/${station.station_id}/devices/realtime`)
                    ]);

                    const realtime = realtimeRes.status === 'fulfilled' ? realtimeRes.value.data : {};
                    const devicesData = devicesRes.status === 'fulfilled' ? devicesRes.value.data : {};

                    const deviceList = devicesData.devices || [];
                    console.log('Device List Debug:', deviceList);

                    return {
                        ...station,
                        data: {
                            status: realtime.networkStatus || 'UNKNOWN',
                            generationPower: realtime.generationPower || 0
                        },
                        devices: deviceList
                    };
                } catch (err) {
                    console.error(`Error fetching data for station ${station.station_id}`, err);
                    return { ...station, data: null, devices: [] };
                }
            });

            const results = await Promise.all(promises);
            const validResults = results.filter(r => r !== null);
            setStationsData(validResults);

        } catch (error) {
            console.error('Error fetching stations data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const isOverallOnline = stationsData.some(s => s.data?.status === 'NORMAL' || s.data?.generationPower > 0);

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Status</h1>
                <p className="text-gray-500 mt-1">Monitoramento em tempo real</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative h-64">
                <img
                    src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=400&fit=crop"
                    alt="Usina Solar"
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                    {isOverallOnline ? (
                        <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-bold">Online</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-bold">Offline</span>
                        </div>
                    )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                    <h2 className="text-2xl font-bold text-white">
                        {customer.stations?.length > 1 ? `${customer.stations.length} Usinas Vinculadas` : (customer.stations?.[0]?.station_name || 'Minha Usina')}
                    </h2>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Server className="h-6 w-6 text-blue-600" />
                    Inversores
                </h3>

                {stationsData.map((station, sIndex) => (
                    <div key={sIndex} className="space-y-4">
                        {stationsData.length > 1 && (
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider ml-1">
                                {station.station_name}
                            </h4>
                        )}

                        <div className="grid gap-4">
                            {station.devices && station.devices.length > 0 ? (
                                station.devices.map((device, dIndex) => {
                                    const dataList = device.currentData?.dataList || [];

                                    const statusData = dataList.find(d => d.key === 'INV_ST1');
                                    const statusValue = statusData?.value || '';

                                    // APo_t1 = Total AC Output Power (Active)
                                    const powerData = dataList.find(d => d.key === 'APo_t1' || d.key === 'GEN_P_T' || d.key === 'Pac_t1');
                                    const powerValue = parseFloat(powerData?.value || '0');

                                    // Prioritize connectStatus from API
                                    let isDeviceOnline = false;

                                    if (device.connectStatus !== undefined && device.connectStatus !== null) {
                                        // 1 = Online, anything else (0, 2) is Offline
                                        isDeviceOnline = device.connectStatus === 1;
                                    } else {
                                        // Fallback for when connectStatus is missing
                                        isDeviceOnline = device.status === 'ONLINE' ||
                                            (statusValue && (statusValue.toLowerCase().includes('connected') || statusValue.toLowerCase().includes('grid'))) ||
                                            powerValue > 0;
                                    }

                                    return (
                                        <div key={dIndex} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${isDeviceOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    <Zap className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{device.name || device.deviceSn}</h4>
                                                    <p className="text-sm text-gray-500">SN: {device.deviceSn}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-sm text-gray-500">Potência Atual</p>
                                                    <p className="font-bold text-gray-900">
                                                        {powerValue > 0 ? `${(powerValue / 1000).toFixed(2)} kW` : '0 kW'}
                                                    </p>
                                                </div>

                                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${isDeviceOnline
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {isDeviceOnline ? 'Conectado' : 'Desconectado'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                                    Nenhum inversor encontrado para esta usina.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
