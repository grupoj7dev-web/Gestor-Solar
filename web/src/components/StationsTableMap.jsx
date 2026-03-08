import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Search, MapPin, Edit2, Check, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../lib/api';
import { useNotification } from '../contexts/NotificationContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const statusIcons = {
    normal: createCustomIcon('#10b981'),
    alert: createCustomIcon('#ef4444'),
    open_ticket: createCustomIcon('#f59e0b'),
    no_comm: createCustomIcon('#6b7280'),
};

function getStationStatus(station) {
    // Priority: open_ticket > alerts > offline > normal
    if (station.openTicketCount && station.openTicketCount > 0) {
        return 'open_ticket';
    }
    if (station.alertCount && station.alertCount > 0) {
        return 'alert';
    }
    if (!station.generationPower || station.networkStatus === 'ALL_OFFLINE') {
        return 'no_comm';
    }
    return 'normal';
}

// Calculate production performance percentage
// Returns percentage of excess (+) or deficit (-) compared to estimated production
function calculateProductionPerformance(actualProduction, installedCapacityKw, days) {
    if (!actualProduction || !installedCapacityKw || !days) return null;

    const HOURS_OF_SUN_PER_DAY = 4.5; // Brazil standard
    const PERFORMANCE_RATIO = 0.75; // 75% PR

    // Expected production = Capacity (kW) × Hours/day × Days × PR
    const expectedProduction = installedCapacityKw * HOURS_OF_SUN_PER_DAY * days * PERFORMANCE_RATIO;

    if (expectedProduction === 0) return null;

    // Percentage = ((Actual - Expected) / Expected) × 100
    const percentage = ((actualProduction - expectedProduction) / expectedProduction) * 100;

    return percentage;
}

function StatusBadge({ status }) {
    const statusConfig = {
        normal: { label: 'Normal', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
        alert: { label: 'Com Alerta', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
        open_ticket: { label: 'Chamado Aberto', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
        no_comm: { label: 'Sem Comunicação', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' },
    };

    const config = statusConfig[status] || statusConfig.normal;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <span className={`h-2 w-2 rounded-full mr-1.5 ${config.dot}`}></span>
            {config.label}
        </span>
    );
}

function EditableCell({ value, onSave, stationId, field, onError }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);

    // Update editValue when value prop changes
    React.useEffect(() => {
        setEditValue(value || '');
    }, [value]);

    const handleSave = async () => {
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(stationId, field, editValue);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message;
            onError?.(`Erro ao salvar: ${errorMsg}`);
            setEditValue(value || '');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    disabled={isSaving}
                />
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                >
                    <Check className="h-4 w-4" />
                </button>
                <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group">
            <span>{value || '-'}</span>
            <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
            >
                <Edit2 className="h-3 w-3" />
            </button>
        </div>
    );
}

export default function StationsTableMap({ stations = [] }) {
    const { error: notifyError } = useNotification();
    const ITEMS_PER_PAGE = 10;
    const [activeTab, setActiveTab] = useState('list');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [localStations, setLocalStations] = useState(stations);
    const [currentPage, setCurrentPage] = useState(1);

    React.useEffect(() => {
        setLocalStations(stations);
    }, [stations]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, localStations.length]);

    const handleSaveField = async (stationId, field, value) => {
        const station = localStations.find(s => s.id === stationId);
        if (!station) return;

        const updateData = {
            name: field === 'owner' ? value : station.owner,
            city: field === 'city' ? value : station.city
        };

        await api.put(`/stats/station/${stationId}/customer`, updateData);

        setLocalStations(prev => prev.map(s =>
            s.id === stationId
                ? { ...s, [field]: value }
                : s
        ));
    };

    const statusCounts = localStations.reduce((acc, station) => {
        const status = getStationStatus(station);
        acc[status] = (acc[status] || 0) + 1;
        acc.all++;
        return acc;
    }, { all: 0, normal: 0, alert: 0, open_ticket: 0, no_comm: 0 });

    const filteredStations = localStations.filter(station => {
        const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (station.owner && station.owner.toLowerCase().includes(searchTerm.toLowerCase()));
        const status = getStationStatus(station);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredStations.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedStations = filteredStations.slice(startIndex, endIndex);

    const visiblePageStart = Math.max(1, safeCurrentPage - 2);
    const visiblePageEnd = Math.min(totalPages, safeCurrentPage + 2);
    const visiblePages = [];
    for (let i = visiblePageStart; i <= visiblePageEnd; i++) visiblePages.push(i);

    // Filter stations for map - only show those with valid Brazil coordinates
    const validMapStations = filteredStations.filter(station => {
        if (!station.latitude || !station.longitude) return false;
        const lat = parseFloat(station.latitude);
        const lng = parseFloat(station.longitude);

        // Brazil's bounding box: Lat -34 to 6, Lng -75 to -34
        const isInBrazil = lat >= -34 && lat <= 6 && lng >= -75 && lng <= -34;

        return isInBrazil;
    });

    const mapCenter = validMapStations.length > 0
        ? [
            validMapStations.reduce((sum, s) => sum + parseFloat(s.latitude), 0) / validMapStations.length,
            validMapStations.reduce((sum, s) => sum + parseFloat(s.longitude), 0) / validMapStations.length
        ]
        : [-15.7801, -47.9292];

    return (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Lista de Unidades
                    </button>
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'map'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <MapPin className="inline h-4 w-4 mr-1" />
                        Mapa da Unidade
                    </button>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Todos ({statusCounts.all})
                    </button>
                    <button
                        onClick={() => setStatusFilter('normal')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === 'normal'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Normal ({statusCounts.normal})
                    </button>
                    <button
                        onClick={() => setStatusFilter('open_ticket')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === 'open_ticket'
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Chamado Aberto ({statusCounts.open_ticket})
                    </button>
                    <button
                        onClick={() => setStatusFilter('alert')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === 'alert'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Com Alerta ({statusCounts.alert})
                    </button>
                    <button
                        onClick={() => setStatusFilter('no_comm')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === 'no_comm'
                            ? 'bg-gray-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Sem Comunicação ({statusCounts.no_comm})
                    </button>

                    <div className="ml-auto relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-64 rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            placeholder="Procurar por proprietário ou planta"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {activeTab === 'list' ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proprietário</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome da Planta</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Potência Instalada (kWp)</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Potência Atual (kW)</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Geração Hoje (kWh)</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">1d</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">15d</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">30d</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">12m</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedStations.map((station) => {
                                const status = getStationStatus(station);
                                const stats = station.stats || {};
                                return (
                                    <tr
                                        key={station.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => window.location.href = `/station/${station.id}`}
                                    >
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <EditableCell
                                                value={station.owner}
                                                onSave={handleSaveField}
                                                stationId={station.id}
                                                field="owner"
                                                onError={notifyError}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{station.name}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                                            {station.installedCapacity ? (station.installedCapacity / 1000).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge status={status} />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                                            {(station.generationPower / 1000).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                                            {stats.today ? stats.today.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center font-medium">
                                            {(() => {
                                                const perf = calculateProductionPerformance(stats.today, station.installedCapacity, 1);
                                                if (perf === null) return '-';
                                                const color = perf >= 0 ? 'text-green-600' : 'text-red-600';
                                                return <span className={color}>{perf >= 0 ? '+' : ''}{perf.toFixed(1)}%</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center font-medium">
                                            {(() => {
                                                const perf = calculateProductionPerformance(stats.last15d, station.installedCapacity, 15);
                                                if (perf === null) return '-';
                                                const color = perf >= 0 ? 'text-green-600' : 'text-red-600';
                                                return <span className={color}>{perf >= 0 ? '+' : ''}{perf.toFixed(1)}%</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center font-medium">
                                            {(() => {
                                                const perf = calculateProductionPerformance(stats.last30d, station.installedCapacity, 30);
                                                if (perf === null) return '-';
                                                const color = perf >= 0 ? 'text-green-600' : 'text-red-600';
                                                return <span className={color}>{perf >= 0 ? '+' : ''}{perf.toFixed(1)}%</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center font-medium">
                                            {(() => {
                                                const perf = calculateProductionPerformance(stats.year, station.installedCapacity, 365);
                                                if (perf === null) return '-';
                                                const color = perf >= 0 ? 'text-green-600' : 'text-red-600';
                                                return <span className={color}>{perf >= 0 ? '+' : ''}{perf.toFixed(1)}%</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                                            {stats.total ? (stats.total / 1000).toFixed(2) + ' MWh' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            <EditableCell
                                                value={station.city}
                                                onSave={handleSaveField}
                                                stationId={station.id}
                                                field="city"
                                                onError={notifyError}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredStations.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma usina encontrada
                        </div>
                    )}
                    {filteredStations.length > 0 && (
                        <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-white px-4 py-3">
                            <p className="text-sm text-gray-600">
                                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredStations.length)} de {filteredStations.length}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safeCurrentPage === 1}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                {visiblePageStart > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            1
                                        </button>
                                        {visiblePageStart > 2 && <span className="px-1 text-sm text-gray-500">...</span>}
                                    </>
                                )}
                                {visiblePages.map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`rounded-md px-3 py-1.5 text-sm ${safeCurrentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                {visiblePageEnd < totalPages && (
                                    <>
                                        {visiblePageEnd < totalPages - 1 && <span className="px-1 text-sm text-gray-500">...</span>}
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safeCurrentPage === totalPages}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-[600px] relative">
                    <MapContainer
                        center={mapCenter}
                        zoom={6}
                        maxZoom={19}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                    >
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={19}
                        />
                        {validMapStations.map((station) => {
                            const status = getStationStatus(station);
                            const stats = station.stats || {};
                            return (
                                <Marker
                                    key={station.id}
                                    position={[parseFloat(station.latitude), parseFloat(station.longitude)]}
                                    icon={statusIcons[status]}
                                >
                                    <Popup>
                                        <div className="p-2 min-w-[200px]">
                                            <h3 className="font-semibold text-sm mb-1">{station.name}</h3>
                                            <div className="text-xs space-y-1">
                                                <div className="mb-2"><StatusBadge status={status} /></div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                    <span className="text-gray-500">Proprietário:</span>
                                                    <span className="font-medium">{station.owner || '-'}</span>

                                                    <span className="text-gray-500">Potência:</span>
                                                    <span className="font-medium">{(station.generationPower / 1000).toFixed(2)} kW</span>

                                                    <span className="text-gray-500">Capacidade:</span>
                                                    <span className="font-medium">{station.installedCapacity ? (station.installedCapacity / 1000).toFixed(2) : '-'} kWp</span>

                                                    <span className="text-gray-500">Hoje:</span>
                                                    <span className="font-medium">{stats.today ? stats.today.toFixed(2) : '-'} kWh</span>

                                                    <span className="text-gray-500">15 dias:</span>
                                                    <span className="font-medium">{stats.last15d ? stats.last15d.toFixed(2) : '-'} kWh</span>

                                                    <span className="text-gray-500">30 dias:</span>
                                                    <span className="font-medium">{stats.last30d ? stats.last30d.toFixed(2) : '-'} kWh</span>

                                                    <span className="text-gray-500">Total:</span>
                                                    <span className="font-medium">{stats.total ? (stats.total / 1000).toFixed(2) : '-'} MWh</span>
                                                </div>
                                                {station.city && (
                                                    <div className="mt-2 text-gray-500 border-t pt-1">{station.city}</div>
                                                )}
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <a
                                                        href={`https://www.google.com/maps?q=${station.latitude},${station.longitude}&t=k`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                    >
                                                        <MapPin className="h-3 w-3" />
                                                        Ver no Google Maps
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            )}
        </div>
    );
}
