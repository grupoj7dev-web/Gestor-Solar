import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Calendar, TrendingUp, Sun, Zap, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { solarman } from '../lib/api';

export function CustomerGeneration() {
    const { customer } = useOutletContext();
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState(new Date());
    const [viewMode, setViewMode] = useState('daily'); // 'daily', 'monthly', 'yearly'
    const [totalPeriod, setTotalPeriod] = useState(0);

    useEffect(() => {
        if (customer?.stations?.length > 0) {
            fetchHistory();
        } else {
            setLoading(false);
        }
    }, [customer, selectedPeriod, viewMode]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const station = customer.stations[0];
            if (!station?.station_id) return;

            const year = selectedPeriod.getFullYear();
            const month = selectedPeriod.getMonth();

            if (viewMode === 'daily') {
                const lastDay = new Date(year, month + 1, 0).getDate();
                const startTime = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const endTime = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                console.log('Fetching Daily:', { startTime, endTime });

                const response = await solarman.getStationHistory(station.station_id, {
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
                            year: item.year,
                            month: item.month,
                            day: item.day
                        }))
                        .sort((a, b) => a.date.localeCompare(b.date));

                    setHistoryData(processedData);
                    setTotalPeriod(processedData.reduce((sum, item) => sum + item.energy, 0));
                } else {
                    setHistoryData([]);
                    setTotalPeriod(0);
                }

            } else if (viewMode === 'monthly') {
                // Para visão mensal, buscamos dados diários de CADA mês e agregamos
                // pois a API não retorna timeType: 3 corretamente para este cliente
                const months = Array.from({ length: 12 }, (_, i) => i);
                const promises = months.map(m => {
                    const lastDay = new Date(year, m + 1, 0).getDate();
                    const start = `${year}-${String(m + 1).padStart(2, '0')}-01`;
                    const end = `${year}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    return solarman.getStationHistory(station.station_id, {
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
                        year: year,
                        month: month + 1
                    };
                });

                setHistoryData(processedData);
                setTotalPeriod(processedData.reduce((sum, item) => sum + item.energy, 0));

            } else {
                // ViewMode Yearly: Buscamos dados mensais (timeType: 3) para cada um dos últimos 5 anos
                const currentYear = new Date().getFullYear();
                const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

                const promises = years.map(y => {
                    const start = `${y}-01`;
                    const end = `${y}-12`;
                    return solarman.getStationHistory(station.station_id, {
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
                        year: year
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
            setLoading(false);
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

    const maxEnergy = Math.max(...historyData.map(d => d.energy), 1);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando histórico...</p>
                </div>
            </div>
        );
    }

    if (!customer?.stations?.length) {
        return (
            <div className="p-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <Calendar className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma Usina Vinculada</h3>
                    <p className="text-gray-600">Este cliente ainda não possui usinas fotovoltaicas vinculadas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Histórico de Geração</h1>
                        <p className="text-gray-500 mt-1">Acompanhe a geração de energia</p>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div className="bg-white rounded-2xl p-2 border border-gray-200 inline-flex gap-2">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${viewMode === 'daily'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Diário
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${viewMode === 'monthly'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Mensal
                    </button>
                    <button
                        onClick={() => setViewMode('yearly')}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${viewMode === 'yearly'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Anual
                    </button>
                </div>

                {/* Period Selector */}
                {viewMode !== 'yearly' && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => changePeriod(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-6 w-6 text-gray-600" />
                            </button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900 capitalize">{getPeriodName()}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Total: <span className="font-semibold text-blue-600">{totalPeriod.toFixed(1)} kWh</span>
                                </p>
                            </div>
                            <button
                                onClick={() => changePeriod(1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={selectedPeriod >= new Date()}
                            >
                                <ChevronRight className="h-6 w-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Chart */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                        Gráfico de Geração {viewMode === 'daily' ? 'Diária' : viewMode === 'monthly' ? 'Mensal' : 'Anual'}
                    </h3>

                    <div className="h-80 w-full">
                        {historyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Sun className="h-16 w-16 mb-4 text-gray-300" />
                                <p>Nenhum dado de geração disponível para este período</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-green-50">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Maior Geração</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {maxEnergy.toFixed(1)} <span className="text-sm text-gray-500">kWh</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-blue-50">
                                <Sun className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Média</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {historyData.length > 0 ? (totalPeriod / historyData.length).toFixed(1) : '0.0'}{' '}
                                    <span className="text-sm text-gray-500">kWh</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-purple-50">
                                <Zap className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total do Período</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {totalPeriod.toFixed(1)}{' '}
                                    <span className="text-sm text-gray-500">kWh</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
