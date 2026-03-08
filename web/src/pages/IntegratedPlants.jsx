import React, { useState, useEffect, useMemo } from 'react';
import { solarman, api, integrations as integrationApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
    Link as LinkIcon,
    Unlink,
    Search,
    CheckCircle,
    AlertTriangle,
    Zap,
    MapPin,
    Building2,
    User,
    Filter,
    X,
    Activity,
    TrendingUp,
    Loader2,
    GitCompare,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { EmptyState, ErrorState, LoadingState } from '../components/feedback';

export function IntegratedPlants() {
    const navigate = useNavigate();
    const { success, error: notifyError, confirm } = useNotification();
    const [stations, setStations] = useState([]);
    const [linkedStations, setLinkedStations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, linked, unlinked
    const [filterOnline, setFilterOnline] = useState('all'); // all, online, offline
    const [filterProvider, setFilterProvider] = useState('all'); // all, solarman, solis, deye
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [pageInput, setPageInput] = useState('1');

    // Modal State
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [linkNotes, setLinkNotes] = useState('');
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [solarmanStationsData, linkedData, customersData, solisStationsData, deyeStationsData] = await Promise.all([
                solarman.getStations(),
                solarman.getLinkedStations(),
                api.get('/customers').then(res => res.data),
                integrationApi.getSolisStations({ pageNo: 1, pageSize: 200 }).catch(() => null),
                integrationApi.getDeyeStations({ all: true, size: 200 }).catch(() => null),
            ]);

            const normalizedSolarman = (solarmanStationsData || []).map((item) => ({
                ...item,
                provider: 'solarman',
            }));

            const solisRecords = solisStationsData?.data?.page?.records
                || solisStationsData?.data?.page?.record
                || solisStationsData?.data?.records
                || [];

            const normalizedSolis = Array.isArray(solisRecords)
                ? solisRecords.map((item) => {
                    const rawStatus = item.stationStatus ?? item.status ?? item.onlineStatus ?? item.connectStatus;
                    const statusText = String(rawStatus ?? '').toLowerCase();
                    const isOnline = rawStatus === 1
                        || rawStatus === '1'
                        || statusText.includes('online')
                        || statusText.includes('normal');
                    return {
                        id: String(item.id || item.stationId || item.plantId || ''),
                        name: item.stationName || item.name || item.plantName || 'Usina Solis',
                        location: item.stationAddr || item.address || item.location || '',
                        capacity: item.capacity || item.stationCapacity || item.capacityStr || null,
                        status: isOnline ? 'online' : 'offline',
                        provider: 'solis',
                    };
                })
                : [];

            const deyeRecords = Array.isArray(deyeStationsData?.stations) ? deyeStationsData.stations : [];
            const normalizedDeye = deyeRecords.map((item) => ({
                id: String(item.id || ''),
                name: item.name || 'Usina Deye',
                location: item.location || '',
                capacity: item.capacity || null,
                status: item.status === 'online' ? 'online' : 'offline',
                provider: 'deye',
            }));

            setStations([...normalizedSolarman, ...normalizedSolis, ...normalizedDeye]);
            setLinkedStations(linkedData || []);
            setCustomers(customersData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Falha ao carregar dados das plantas.');
        } finally {
            setLoading(false);
        }
    };

    const linkedStationMap = useMemo(() => {
        const map = new Map();
        for (const link of linkedStations) {
            map.set(String(link.station_id), link);
        }
        return map;
    }, [linkedStations]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterStatus, filterOnline, filterProvider]);

    const handleLinkClick = (station) => {
        setSelectedStation(station);
        setSelectedCustomer('');
        setLinkNotes('');
        setIsLinkModalOpen(true);
    };

    const handleUnlinkClick = async (stationId, customerId) => {
        const approved = await confirm('Tem certeza que deseja desvincular esta planta?');
        if (!approved) return;

        try {
            await solarman.unlinkStation(customerId, stationId);
            const updatedLinked = await solarman.getLinkedStations();
            setLinkedStations(updatedLinked);
            success('Planta desvinculada com sucesso.');
        } catch (err) {
            console.error('Error unlinking:', err);
            notifyError('Erro ao desvincular planta.');
        }
    };

    const handleLinkSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedStation) return;

        try {
            setLinking(true);
            await solarman.linkStation(selectedCustomer, {
                station_id: selectedStation.id,
                station_name: selectedStation.name,
                notes: linkNotes
            });

            const updatedLinked = await solarman.getLinkedStations();
            setLinkedStations(updatedLinked);
            setIsLinkModalOpen(false);
            success('Planta vinculada com sucesso.');
        } catch (err) {
            console.error('Error linking:', err);
            notifyError('Erro ao vincular planta.');
        } finally {
            setLinking(false);
        }
    };

    const filteredStations = useMemo(() => {
        return stations.filter(s => {
            const linkedInfo = s.provider === 'solarman' ? linkedStationMap.get(String(s.id)) : null;
            const isLinked = !!linkedInfo;

            // Search filter
            const search = debouncedSearchTerm.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(search) ||
                s.location?.toLowerCase().includes(search);

            // Status filter
            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'linked' && isLinked) ||
                (filterStatus === 'unlinked' && !isLinked);

            // Online filter
            const matchesOnline = filterOnline === 'all' ||
                (filterOnline === 'online' && s.status === 'online') ||
                (filterOnline === 'offline' && s.status !== 'online');

            const matchesProvider = filterProvider === 'all' ||
                (filterProvider === 'solarman' && s.provider === 'solarman') ||
                (filterProvider === 'solis' && s.provider === 'solis') ||
                (filterProvider === 'deye' && s.provider === 'deye');

            return matchesSearch && matchesStatus && matchesOnline && matchesProvider;
        });
    }, [stations, linkedStationMap, debouncedSearchTerm, filterStatus, filterOnline, filterProvider]);

    const stats = useMemo(() => {
        const linked = stations.filter(s => linkedStationMap.has(String(s.id))).length;
        const online = stations.filter(s => s.status === 'online').length;
        const totalCapacity = stations.reduce((sum, s) => sum + (parseFloat(s.capacity) || 0), 0);

        return {
            total: stations.length,
            linked,
            unlinked: stations.length - linked,
            online,
            offline: stations.length - online,
            totalCapacity: totalCapacity.toFixed(2)
        };
    }, [stations, linkedStationMap]);

    const totalPages = Math.max(1, Math.ceil(filteredStations.length / itemsPerPage));

    const paginatedStations = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStations.slice(start, start + itemsPerPage);
    }, [filteredStations, currentPage, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
                <LoadingState
                    title="Carregando plantas..."
                    description="Buscando dados das integracoes configuradas."
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
                <ErrorState
                    title="Erro ao carregar plantas"
                    description={error}
                    onRetry={fetchData}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950">
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                Plantas Integradas
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">Gerencie a vinculação entre plantas dos provedores e clientes</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar plantas..."
                                    className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-72 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total de Plantas</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <Building2 className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Vinculadas</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.linked}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Não Vinculadas</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.unlinked}</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Online</p>
                                    <p className="text-2xl font-bold text-emerald-600">{stats.online}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg">
                                    <Activity className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Capacidade Total</p>
                                    <p className="text-2xl font-bold text-purple-600">{stats.totalCapacity}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">kWp</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/85 dark:bg-gray-900/85 backdrop-blur p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filtros de visualizacao</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Refine por vinculo, status e provedor.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full lg:w-auto">
                                <div className="min-w-[200px]">
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vinculo</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                                    >
                                        <option value="all">Todas</option>
                                        <option value="linked">Vinculadas</option>
                                        <option value="unlinked">Nao Vinculadas</option>
                                    </select>
                                </div>

                                <div className="min-w-[200px]">
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Conectividade</label>
                                    <select
                                        value={filterOnline}
                                        onChange={(e) => setFilterOnline(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                                    >
                                        <option value="all">Todos Status</option>
                                        <option value="online">Online</option>
                                        <option value="offline">Offline</option>
                                    </select>
                                </div>

                                <div className="min-w-[200px]">
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Provedor</label>
                                    <select
                                        value={filterProvider}
                                        onChange={(e) => setFilterProvider(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                                    >
                                        <option value="all">Todos Provedores</option>
                                        <option value="solarman">Solarman</option>
                                        <option value="solis">Solis</option>
                                        <option value="deye">Deye</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {(filterStatus !== 'all' || filterOnline !== 'all' || filterProvider !== 'all' || searchTerm) && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Filtros ativos:</span>
                                {filterStatus !== 'all' && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{filterStatus === 'linked' ? 'Vinculadas' : 'Nao Vinculadas'}</span>}
                                {filterOnline !== 'all' && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{filterOnline === 'online' ? 'Online' : 'Offline'}</span>}
                                {filterProvider !== 'all' && (
                                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        {filterProvider === 'solarman' ? 'Solarman' : filterProvider === 'solis' ? 'Solis' : 'Deye'}
                                    </span>
                                )}
                                {searchTerm && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">Busca: "{searchTerm}"</span>}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setDebouncedSearchTerm('');
                                        setFilterStatus('all');
                                        setFilterOnline('all');
                                        setFilterProvider('all');
                                    }}
                                    className="ml-auto rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Plants Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedStations.map(station => {
                        const linkedInfo = station.provider === 'solarman'
                            ? linkedStationMap.get(String(station.id))
                            : null;
                        const isLinked = !!linkedInfo;

                        return (
                            <div
                                key={`${station.provider}-${station.id}`}
                                className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                            >
                                {/* Card Header with Gradient */}
                                <div className={`h-2 ${isLinked ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}></div>

                                <div className="p-6">
                                    {/* Title and Status */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-2.5 rounded-xl ${isLinked ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
                                                    <Zap className={`h-5 w-5 ${isLinked ? 'text-green-600' : 'text-red-600'}`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors" title={station.name}>
                                                        {station.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${station.provider === 'solis'
                                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                    : station.provider === 'deye'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    }`}>
                                                    {station.provider === 'solis' ? 'Solis' : station.provider === 'deye' ? 'Deye' : 'Solarman'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${station.status === 'online'
                                                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border border-gray-200'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${station.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                                    {station.status === 'online' ? 'Online' : 'Offline'}
                                                </span>
                                                {isLinked && (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                )}
                                                {!isLinked && (
                                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="space-y-3 mb-5">
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="truncate">{station.location || 'Localização não informada'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                            <Zap className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="font-medium">{station.capacity ? `${station.capacity} kWp` : 'Capacidade N/A'}</span>
                                        </div>

                                        {isLinked && (
                                            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/25 dark:to-indigo-950/25 rounded-xl border border-blue-100 dark:border-blue-800">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                        <User className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-medium text-blue-600 mb-1">Cliente Vinculado</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                            {linkedInfo.customer?.full_name || linkedInfo.customer?.company_name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                        {station.provider !== 'solarman' ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-semibold text-sm border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                                            >
                                                <span>Vinculacao de cliente indisponivel ({station.provider === 'solis' ? 'Solis' : 'Deye'})</span>
                                            </button>
                                        ) : isLinked ? (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/monitoring/compare/${station.id}`)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-600 hover:from-purple-100 hover:to-indigo-100 rounded-xl font-semibold text-sm transition-all border border-purple-200 hover:border-purple-300"
                                                >
                                                    <GitCompare className="h-4 w-4" />
                                                    <span>Monitorar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleUnlinkClick(station.id, linkedInfo.customer_id)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 text-red-600 hover:from-red-100 hover:to-rose-100 rounded-xl font-semibold text-sm transition-all border border-red-200 hover:border-red-300"
                                                >
                                                    <Unlink className="h-4 w-4" />
                                                    <span>Desvincular</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleLinkClick(station)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg"
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                                <span>Vincular Cliente</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredStations.length > itemsPerPage && (
                    <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm sm:flex-row">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Página {currentPage} de {totalPages} ({filteredStations.length} plantas)
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
                            >
                                <option value={12}>12 / página</option>
                                <option value={24}>24 / página</option>
                                <option value={48}>48 / página</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Ir p/</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const next = Math.min(totalPages, Math.max(1, Number(pageInput) || 1));
                                            setCurrentPage(next);
                                        }
                                    }}
                                    className="w-16 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-700 dark:text-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = Math.min(totalPages, Math.max(1, Number(pageInput) || 1));
                                        setCurrentPage(next);
                                    }}
                                    className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {filteredStations.length === 0 && (
                    <EmptyState
                        icon={Search}
                        title="Nenhuma planta encontrada"
                        description="Ajuste os filtros ou termo de busca para tentar novamente."
                        actionLabel="Limpar filtros"
                        onAction={() => {
                            setSearchTerm('');
                            setDebouncedSearchTerm('');
                            setFilterStatus('all');
                            setFilterOnline('all');
                            setFilterProvider('all');
                        }}
                    />
                )}
            </div>

            {/* Link Modal */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700 animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Vincular Planta
                            </h2>
                            <button
                                onClick={() => setIsLinkModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-800">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Selecione o cliente para vincular à planta{' '}
                                <span className="font-bold text-blue-600">{selectedStation?.name}</span>
                            </p>
                        </div>

                        <form onSubmit={handleLinkSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cliente</label>
                                <select
                                    required
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium"
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="" className="text-gray-500 dark:text-gray-400">Selecione um cliente...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id} className="text-gray-900 dark:text-gray-100">
                                            {c.full_name || c.company_name} ({c.customer_type === 'pf' ? 'PF' : 'PJ'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Observações <span className="text-gray-400 font-normal">(Opcional)</span>
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    rows="3"
                                    value={linkNotes}
                                    onChange={(e) => setLinkNotes(e.target.value)}
                                    placeholder="Ex: Instalação principal, sistema residencial..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsLinkModalOpen(false)}
                                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={linking}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    {linking ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Vinculando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Confirmar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}





