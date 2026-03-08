import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { api } from '../lib/api';
import { Search, AlertTriangle, Wifi, WifiOff, Clock, MapPin, Zap, Calendar, Activity, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OperationPanel() {
    const [searchTerm, setSearchTerm] = useState('');
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const [refreshIntervalSec, setRefreshIntervalSec] = useState(60);
    const [tickets, setTickets] = useState([]);
    const [customers, setCustomers] = useState({});
    const { data: statsData, loading, error, refetch } = useDashboardStats();
    const stations = statsData?.stationsDetail || [];
    const navigate = useNavigate();

    const fetchTicketsAndCustomers = useCallback(async (signal) => {
        try {
            const [ticketsRes, customersRes] = await Promise.all([
                api.get('/tickets'),
                api.get('/customers')
            ]);

            if (signal?.aborted) return;

            setTickets(ticketsRes.data || []);

            // Create customer lookup map
            const customerMap = {};
            (customersRes.data || []).forEach((c) => {
                customerMap[c.id] = c;
            });
            setCustomers(customerMap);
        } catch (e) {
            if (signal?.aborted) return;
            console.error('Error fetching tickets/customers:', e);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([refetch(), fetchTicketsAndCustomers()]);
    }, [refetch, fetchTicketsAndCustomers]);

    // Initial data load
    useEffect(() => {
        const controller = new AbortController();
        fetchTicketsAndCustomers(controller.signal);
        return () => controller.abort();
    }, [fetchTicketsAndCustomers]);

    // Controlled auto-refresh
    useEffect(() => {
        if (!autoRefreshEnabled) return;
        const interval = window.setInterval(() => {
            refreshAll();
        }, refreshIntervalSec * 1000);
        return () => window.clearInterval(interval);
    }, [autoRefreshEnabled, refreshIntervalSec, refreshAll]);

    const searchTermNormalized = searchTerm.trim().toLowerCase();

    const openTicketsByCustomer = useMemo(() => {
        const openStatuses = new Set(['open', 'in_opening', 'in_execution', 'visit_scheduled']);
        const byCustomer = new Map();

        for (const ticket of tickets) {
            if (!ticket?.customer_id || !openStatuses.has(ticket.status)) continue;
            if (!byCustomer.has(ticket.customer_id)) byCustomer.set(ticket.customer_id, []);
            byCustomer.get(ticket.customer_id).push(ticket);
        }

        return byCustomer;
    }, [tickets]);

    // Filter stations by station/customer text
    const filtered = useMemo(() => {
        if (!searchTermNormalized) return stations;

        return stations.filter((s) => {
            const customer = customers[s.customerId];
            const customerName = customer
                ? (customer.customer_type === 'pj' ? customer.company_name : customer.full_name)
                : (s.owner || '');

            const text = [
                s.name || '',
                s.locationAddress || '',
                s.city || '',
                customerName || '',
                customer?.city || '',
                customer?.state || ''
            ].join(' ').toLowerCase();

            return text.includes(searchTermNormalized);
        });
    }, [stations, customers, searchTermNormalized]);

    // Exclusive categorization: ticket > alert > sem sinal > normal
    const categorized = useMemo(() => {
        const result = {
            openTickets: [],
            alerts: [],
            connected: [],
            notConnected: []
        };

        for (const station of filtered) {
            const hasOpenTicket = (station.openTicketCount || 0) > 0;
            const hasAlert = (station.alertCount || 0) > 0;
            const isNoSignal = ['ALL_OFFLINE', 'NO_DEVICE'].includes(station.networkStatus);

            if (hasOpenTicket) {
                result.openTickets.push(station);
            } else if (hasAlert) {
                result.alerts.push(station);
            } else if (isNoSignal) {
                result.notConnected.push(station);
            } else {
                result.connected.push(station);
            }
        }

        const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
        const byUpdatedDesc = (a, b) => {
            const ta = Date.parse(a.lastUpdateTime || 0) || 0;
            const tb = Date.parse(b.lastUpdateTime || 0) || 0;
            return tb - ta;
        };

        // Open tickets first by number of open tickets, then alerts, then recent update.
        result.openTickets.sort((a, b) =>
            (b.openTicketCount || 0) - (a.openTicketCount || 0) ||
            (b.alertCount || 0) - (a.alertCount || 0) ||
            byUpdatedDesc(a, b) ||
            byName(a, b)
        );

        // Alerts first by number of alerts, then lower current generation first (higher risk).
        result.alerts.sort((a, b) =>
            (b.alertCount || 0) - (a.alertCount || 0) ||
            (a.generationPower || 0) - (b.generationPower || 0) ||
            byUpdatedDesc(a, b) ||
            byName(a, b)
        );

        // No signal first by most stale update.
        result.notConnected.sort((a, b) =>
            byUpdatedDesc(a, b) ||
            byName(a, b)
        );

        // Normal by highest generation.
        result.connected.sort((a, b) =>
            (b.generationPower || 0) - (a.generationPower || 0) ||
            byName(a, b)
        );

        return result;
    }, [filtered]);

    const { openTickets, alerts, connected, notConnected } = categorized;

    if (loading && stations.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-blue-500" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Carregando dados...</p>
                </div>
            </div>
        );
    }

    const TicketStationCard = ({ station }) => {
        const customer = customers[station.customerId];
        const stationTickets = openTicketsByCustomer.get(station.customerId) || [];

        return (
            <div
                onClick={() => navigate(`/station/${station.id}`)}
                className="rounded-lg border border-orange-200 bg-orange-50 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{station.name}</h3>

                {customer && (
                    <div className="space-y-1 mb-3">
                        <p className="text-xs text-gray-700">
                            <span className="font-medium">Cliente:</span> {customer.customer_type === 'pj' ? customer.company_name : customer.full_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {customer.city}, {customer.state}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-700 mb-3">
                    <Zap className="h-3 w-3" />
                    <span className="font-medium">Potência:</span> {station.installedCapacity ? station.installedCapacity.toFixed(2) : 0} kWp
                </div>

                <div className="border-t border-orange-200 pt-2 space-y-2">
                    {stationTickets.slice(0, 2).map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-orange-700">Chamado #{String(ticket.ticket_number || ticket.id).padStart(3, '0')}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-200 text-orange-800">
                                    {ticket.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="h-3 w-3" />
                                {new Date(ticket.created_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                    ))}
                    {stationTickets.length > 2 && (
                        <p className="text-xs text-orange-700 font-medium">
                            +{stationTickets.length - 2} mais
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const AlertStationCard = ({ station }) => {
        const customer = customers[station.customerId];
        const performance = station.installedCapacity > 0
            ? ((station.generationPower / (station.installedCapacity * 1000)) * 100).toFixed(1)
            : 0;

        return (
            <div
                onClick={() => navigate(`/station/${station.id}`)}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{station.name}</h3>

                {customer && (
                    <div className="space-y-1 mb-3">
                        <p className="text-xs text-gray-700">
                            <span className="font-medium">Cliente:</span> {customer.customer_type === 'pj' ? customer.company_name : customer.full_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {customer.city}, {customer.state}
                        </div>
                    </div>
                )}

                <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span className="font-medium">Potência:</span> {station.installedCapacity ? station.installedCapacity.toFixed(2) : 0} kWp
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span className="font-medium">Performance:</span> {performance}%
                    </div>
                </div>
            </div>
        );
    };

    const NormalStationCard = ({ station }) => {
        const customer = customers[station.customerId];

        return (
            <div
                onClick={() => navigate(`/station/${station.id}`)}
                className="rounded-lg border border-green-200 bg-green-50 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{station.name}</h3>

                {customer && (
                    <div className="space-y-1 mb-3">
                        <p className="text-xs text-gray-700">
                            <span className="font-medium">Cliente:</span> {customer.customer_type === 'pj' ? customer.company_name : customer.full_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {customer.city}, {customer.state}
                        </div>
                    </div>
                )}

                <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span className="font-medium">Potência:</span> {station.installedCapacity ? station.installedCapacity.toFixed(2) : 0} kWp
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span className="font-medium">Geração atual:</span> {(station.generationPower / 1000).toFixed(2)} kW
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">Geração do dia:</span> {station.stats?.today ? station.stats.today.toFixed(2) : '0.00'} kWh
                    </div>
                </div>
            </div>
        );
    };

    const NoSignalStationCard = ({ station }) => {
        const customer = customers[station.customerId];

        return (
            <div
                onClick={() => navigate(`/station/${station.id}`)}
                className="rounded-lg border border-gray-300 bg-gray-50 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{station.name}</h3>

                {customer && (
                    <div className="space-y-1 mb-3">
                        <p className="text-xs text-gray-700">
                            <span className="font-medium">Cliente:</span> {customer.customer_type === 'pj' ? customer.company_name : customer.full_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {customer.city}, {customer.state}
                        </div>
                    </div>
                )}

                <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span className="font-medium">Potência:</span> {station.installedCapacity ? station.installedCapacity.toFixed(2) : 0} kWp
                    </div>
                </div>
            </div>
        );
    };

    const CategoryColumn = ({ title, count, icon: Icon, iconColor, stations, isTickets, cardType }) => (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <Icon className={`h-5 w-5 ${iconColor}`} />
                <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
                <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                    {count}
                </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                {stations.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        Nenhuma usina em {title.toLowerCase()}
                    </p>
                ) : (
                    stations.map((station) => {
                        if (isTickets) {
                            return <TicketStationCard key={station.id} station={station} />;
                        }
                        if (cardType === 'alert') {
                            return <AlertStationCard key={station.id} station={station} />;
                        }
                        if (cardType === 'normal') {
                            return <NormalStationCard key={station.id} station={station} />;
                        }
                        if (cardType === 'nosignal') {
                            return <NoSignalStationCard key={station.id} station={station} />;
                        }
                        return null;
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {error && stations.length > 0 && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
                    <div className="mx-auto max-w-7xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <p className="text-sm font-medium text-yellow-800">
                                API instável - Mostrando últimos dados salvos
                            </p>
                        </div>
                        <button
                            onClick={refreshAll}
                            disabled={loading}
                            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>
                </div>
            )}

            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-6">
                <div className="mx-auto max-w-7xl">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Painel de Operação</h1>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Chamados Abertos</span>
                            </div>
                            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{openTickets.length}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Alerta</span>
                            </div>
                            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{alerts.length}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Wifi className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Normal</span>
                            </div>
                            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{connected.length}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <WifiOff className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sem Sinal</span>
                            </div>
                            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{notConnected.length}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por usina, proprietário, cliente ou cidade"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${autoRefreshEnabled
                                    ? 'border-green-300 bg-green-50 text-green-700'
                                    : 'border-gray-300 bg-white text-gray-700'
                                    }`}
                            >
                                Auto-refresh: {autoRefreshEnabled ? 'Ligado' : 'Desligado'}
                            </button>

                            <select
                                value={refreshIntervalSec}
                                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                                disabled={!autoRefreshEnabled}
                                className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                <option value={30}>30s</option>
                                <option value={60}>60s</option>
                                <option value={120}>120s</option>
                            </select>

                            <button
                                type="button"
                                onClick={refreshAll}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 py-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
                    <CategoryColumn
                        title="Chamados Abertos"
                        count={openTickets.length}
                        icon={Clock}
                        iconColor="text-blue-600"
                        stations={openTickets}
                        isTickets={true}
                    />
                    <CategoryColumn
                        title="Alerta"
                        count={alerts.length}
                        icon={AlertTriangle}
                        iconColor="text-yellow-600"
                        stations={alerts}
                        cardType="alert"
                    />
                    <CategoryColumn
                        title="Normal"
                        count={connected.length}
                        icon={Wifi}
                        iconColor="text-green-600"
                        stations={connected}
                        cardType="normal"
                    />
                    <CategoryColumn
                        title="Sem Sinal"
                        count={notConnected.length}
                        icon={WifiOff}
                        iconColor="text-gray-600"
                        stations={notConnected}
                        cardType="nosignal"
                    />
                </div>
            </div>
        </div>
    );
}

