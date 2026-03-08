import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Zap, TrendingUp, Sun, Wind, Droplets,
    AlertCircle, CheckCircle, DollarSign, Activity
} from 'lucide-react';
import { api } from '../lib/api';

export function CustomerOverview() {
    const { customer } = useOutletContext();
    const [stationData, setStationData] = useState(null);
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    const TARIFA_ENERGIA = 0.85; // R$/kWh - pode ser configurável depois

    useEffect(() => {
        if (customer?.stations?.length > 0) {
            fetchStationData();
        } else {
            setLoading(false);
        }
    }, [customer]);

    const fetchStationData = async () => {
        try {
            // Pega a primeira estação vinculada
            const station = customer.stations[0];

            if (!station?.station_id) {
                console.error('Station ID missing');
                return;
            }

            // Busca dados em tempo real E histórico do dia de forma independente
            const results = await Promise.allSettled([
                api.get(`/stations/${station.station_id}/realtime`),
                api.get(`/stations/${station.station_id}/today`)
            ]);

            const realtime = results[0].status === 'fulfilled' ? results[0].value.data : {};
            const today = results[1].status === 'fulfilled' ? results[1].value.data : {};

            if (results[0].status === 'rejected') {
                console.error('Error fetching realtime:', results[0].reason);
            }
            if (results[1].status === 'rejected') {
                console.error('Error fetching today history:', results[1].reason);
            }

            // Combina os dados:
            // - Potência atual vem do realtime
            // - Pico do dia vem do histórico (generationPower no timeType: 2 ou calculado)
            // - Energia total vem do realtime (generationTotal)

            setStationData({
                generationPower: realtime.generationPower || 0,
                peakPower: today.peakPower || 0,
                totalEnergy: realtime.generationTotal || realtime.totalEnergy || realtime.dayEnergy || 0,
                status: realtime.networkStatus || 'UNKNOWN',
                latitude: realtime.latitude,
                longitude: realtime.longitude
            });

            // Busca clima (se tiver coordenadas)
            if (realtime.latitude && realtime.longitude) {
                fetchWeather(realtime.latitude, realtime.longitude);
            }
        } catch (error) {
            console.error('Error fetching station data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeather = async (lat, lon) => {
        try {
            // Implementar chamada para OpenWeatherMap via backend
            // Por enquanto, dados mockados
            setWeather({
                temp: 28,
                condition: 'Ensolarado',
                icon: '01d',
                humidity: 65,
                windSpeed: 12
            });
        } catch (error) {
            console.error('Error fetching weather:', error);
        }
    };

    const calculateSavings = () => {
        if (!stationData?.totalEnergy) return 0;
        return stationData.totalEnergy * TARIFA_ENERGIA;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatPower = (value) => {
        if (!value) return '0 kW';
        if (value >= 1000) return `${(value / 1000).toFixed(2)} MW`;
        return `${value.toFixed(2)} kW`;
    };

    const formatEnergy = (value) => {
        if (!value) return '0 kWh';
        if (value >= 1000) return `${(value / 1000).toFixed(2)} MWh`;
        return `${value.toFixed(2)} kWh`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!customer?.stations || customer.stations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhuma Planta Vinculada</h2>
                <p className="text-gray-500">Este cliente ainda não possui plantas solares cadastradas.</p>
            </div>
        );
    }

    const station = customer.stations[0];
    const isOnline = stationData?.status === 'NORMAL' || stationData?.generationPower > 0;
    const savings = calculateSavings();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
                    <p className="text-gray-500 mt-1">Monitoramento em tempo real da usina solar</p>
                </div>

                {/* Plant Image and Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="relative h-64">
                        <img
                            src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=400&fit=crop"
                            alt="Usina Solar"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4">
                            {isOnline ? (
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
                    </div>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-900">{station.station_name}</h2>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            ID: {station.station_id}
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Current Power */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <Zap className="h-8 w-8" />
                            <span className="text-sm font-medium opacity-90">Potência Atual</span>
                        </div>
                        <div className="text-3xl font-bold">{formatPower(stationData?.generationPower || 0)}</div>
                        <p className="text-sm opacity-75 mt-2">Geração em tempo real</p>
                    </div>

                    {/* Peak Power */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="h-8 w-8" />
                            <span className="text-sm font-medium opacity-90">Pico do Dia</span>
                        </div>
                        <div className="text-3xl font-bold">{formatPower(stationData?.peakPower || 0)}</div>
                        <p className="text-sm opacity-75 mt-2">Máxima registrada</p>
                    </div>

                    {/* Total Energy */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <Activity className="h-8 w-8" />
                            <span className="text-sm font-medium opacity-90">Energia Total</span>
                        </div>
                        <div className="text-3xl font-bold">{formatEnergy(stationData?.totalEnergy || 0)}</div>
                        <p className="text-sm opacity-75 mt-2">Acumulado</p>
                    </div>

                    {/* Savings */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <DollarSign className="h-8 w-8" />
                            <span className="text-sm font-medium opacity-90">Economia</span>
                        </div>
                        <div className="text-3xl font-bold">{formatCurrency(savings)}</div>
                        <p className="text-sm opacity-75 mt-2">Tarifa: R$ {TARIFA_ENERGIA}/kWh</p>
                    </div>
                </div>

                {/* Weather Widget */}
                {weather && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Sun className="h-5 w-5 text-yellow-500" />
                            Previsão do Tempo
                        </h3>
                        <div className="grid md:grid-cols-4 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-50 rounded-xl">
                                    <Sun className="h-8 w-8 text-yellow-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Condição</p>
                                    <p className="text-lg font-bold text-gray-900">{weather.condition}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 rounded-xl">
                                    <Activity className="h-8 w-8 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Temperatura</p>
                                    <p className="text-lg font-bold text-gray-900">{weather.temp}°C</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Droplets className="h-8 w-8 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Umidade</p>
                                    <p className="text-lg font-bold text-gray-900">{weather.humidity}%</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <Wind className="h-8 w-8 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Vento</p>
                                    <p className="text-lg font-bold text-gray-900">{weather.windSpeed} km/h</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Address */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Localização</h3>
                    <p className="text-gray-700">
                        {customer.street}, {customer.number}
                        {customer.complement && ` - ${customer.complement}`}
                    </p>
                    <p className="text-gray-700">
                        {customer.neighborhood} - {customer.city}/{customer.state}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">CEP: {customer.cep}</p>
                </div>
            </div>
        </div>
    );
}
