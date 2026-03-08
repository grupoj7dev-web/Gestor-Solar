import React from 'react';
import { useDashboardStats } from './hooks/useDashboardStats';
import { Zap, BatteryCharging, TrendingUp, Search, Building2, Layers, AlertCircle, Calendar, DollarSign, Sun } from 'lucide-react';
import StationsTableMap from './components/StationsTableMap';

function CircularProgress({ percentage, size = 180 }) {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#3b82f6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold text-gray-900 dark:text-gray-100">{percentage.toFixed(2)}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
            </div>
        </div>
    );
}

function StatCard({ title, value, unit, subtitle, icon: Icon, iconColor = "text-orange-500" }) {
    return (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
                <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                <span className="text-base text-gray-500 dark:text-gray-400">{unit}</span>
            </div>
            {subtitle && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {subtitle}
                </div>
            )}
        </div>
    );
}

function TicketsCard({ stats }) {
    return (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Chamados</span>
                <AlertCircle className="h-5 w-5 text-orange-500" strokeWidth={2} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Nao tratado:</span>
                    <span className="text-sm font-semibold text-red-600">{stats.untreated}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Em execucao:</span>
                    <span className="text-sm font-semibold text-blue-600">{stats.in_execution}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Em atraso:</span>
                    <span className="text-sm font-semibold text-orange-600">{stats.delayed}</span>
                </div>
            </div>
        </div>
    );
}

function GenerationCard({ title, generation, gain, icon: Icon, unit = 'MWh' }) {
    // Safety check
    if (generation === undefined || generation === null) {
        return (
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
                    <Icon className="h-5 w-5 text-orange-500" strokeWidth={2} />
                </div>
                <div className="flex items-center justify-center h-20">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
                <Icon className="h-5 w-5 text-orange-500" strokeWidth={2} />
            </div>
            <div className="space-y-3">
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{generation.toFixed(2)}</span>
                        <span className="text-base text-gray-500 dark:text-gray-400">{unit}</span>
                    </div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                            {gain.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Ganho {title.toLowerCase()}</span>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { data: statsData, loading: statsLoading, error: statsError, refetch } = useDashboardStats();

    // Debug logging
    React.useEffect(() => {
        if (statsData) {
            console.log('Stats Data:', statsData);
        }
    }, [statsData]);

    // Show loading only if no cached data
    if (statsLoading && !statsData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (statsError && !statsData) {
        return (
            <div className="flex items-center justify-center min-h-screen text-red-600 gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Erro ao carregar dados: {statsError.message}</span>
            </div>
        );
    }

    // Default values if statsData is not yet available
    const productionPercent = statsData?.power?.productionPercent || 0;
    const installedCapacityMWp = statsData?.power?.installedMWp || 0;
    const currentPowerMW = statsData?.power?.currentMW || 0;
    const stationsCount = statsData?.stations?.total || 0;
    const customersCount = statsData?.customers?.total || 0;
    const modulesCount = statsData?.modules?.total || 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {/* Error Banner - shows when there's cached data but refresh failed */}
            {statsError && statsData && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800 px-6 py-4">
                    <div className="mx-auto max-w-7xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    API instavel - Mostrando ultimos dados salvos
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                                    {statsLoading ? 'Tentando atualizar...' : 'Clique em "Atualizar" para tentar novamente'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={refetch}
                            disabled={statsLoading}
                            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {statsLoading ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
                {/* Top Row - 4 Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* 1. Potencia Atual (%) */}
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-6">Potencia atual</h3>
                        <div className="flex flex-col items-center">
                            <CircularProgress percentage={productionPercent} size={140} />
                        </div>
                    </div>

                    {/* 2. Usinas Monitoradas */}
                    <StatCard
                        title="Usinas Monitoradas"
                        value={stationsCount}
                        unit="Plantas"
                        subtitle={`Clientes: ${customersCount}`}
                        icon={Building2}
                        iconColor="text-gray-500"
                    />

                    {/* 3. Total Monitorado */}
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Monitorado</span>
                            <Layers className="h-5 w-5 text-orange-500" strokeWidth={2} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                                {installedCapacityMWp.toFixed(2)}
                            </span>
                            <span className="text-base text-gray-500 dark:text-gray-400">MWp</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Modulos: {modulesCount.toLocaleString()} Und
                        </div>
                    </div>

                    {/* 4. Chamados */}
                    {statsData?.tickets && (
                        <TicketsCard stats={statsData.tickets} />
                    )}
                </div>

                {/* Bottom Row - 4 Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* 5. Potencia Atual (W) */}
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Potencia atual</span>
                            <Zap className="h-5 w-5 text-orange-500" strokeWidth={2} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                                {currentPowerMW < 1
                                    ? (currentPowerMW * 1000).toFixed(2)
                                    : currentPowerMW.toFixed(2)}
                            </span>
                            <span className="text-base text-gray-500 dark:text-gray-400">
                                {currentPowerMW < 1 ? 'kW' : 'MW'}
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Potencia instalada: {installedCapacityMWp.toFixed(2)} MWp
                        </div>
                    </div>

                    {/* 6. Geracao Hoje */}
                    {statsData?.generation?.today && (
                        <GenerationCard
                            title="Geracao hoje"
                            generation={statsData.generation.today.MWh}
                            gain={statsData.generation.today.gain}
                            icon={Sun}
                        />
                    )}

                    {/* 7. Geracao Mensal */}
                    {statsData?.generation?.month && (
                        <GenerationCard
                            title="Geracao mensal"
                            generation={statsData.generation.month.MWh}
                            gain={statsData.generation.month.gain}
                            icon={Calendar}
                        />
                    )}

                    {/* 8. Geracao Total */}
                    {statsData?.generation?.total && (
                        <GenerationCard
                            title="Geracao total"
                            generation={statsData.generation.total.GWh}
                            gain={statsData.generation.total.gain}
                            icon={TrendingUp}
                            unit="GWh"
                        />
                    )}
                </div>

                {/* Stations List Table & Map */}
                <StationsTableMap stations={statsData?.stationsDetail || []} />
            </div>
        </div>
    );
}

