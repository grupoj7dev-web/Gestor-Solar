import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Activity, Wifi, WifiOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export function StationSelector({ customerId, linkedStations, onUpdate, onAdd, onRemove }) {
    const { getToken } = useAuth();
    const { error: notifyError, confirm } = useNotification();
    const [availableStations, setAvailableStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStation, setSelectedStation] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        try {
            const response = await api.get('/stations/available', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setAvailableStations(response.data);
        } catch (error) {
            console.error('Error fetching stations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = async (stationId = selectedStation) => {
        if (!stationId) return;

        const station = availableStations.find(s => s.id === stationId);
        if (!station) return;

        // Local mode
        if (onAdd) {
            onAdd({
                station_id: station.id,
                station_name: station.name
            });
            setSelectedStation('');
            return;
        }

        // Remote mode
        setAdding(true);
        try {
            await api.post(`/customers/${customerId}/stations`, {
                station_id: station.id,
                station_name: station.name
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            setSelectedStation('');
            onUpdate();
        } catch (error) {
            console.error('Error linking station:', error);
            notifyError(error.response?.data?.error || 'Erro ao vincular planta');
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveClick = async (stationId) => {
        const approved = await confirm('Remover vinculo com esta planta?');
        if (!approved) return;

        // Local mode
        if (onRemove) {
            onRemove(stationId);
            return;
        }

        // Remote mode
        try {
            await api.delete(`/customers/${customerId}/stations/${stationId}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            onUpdate();
        } catch (error) {
            console.error('Error removing station:', error);
            notifyError('Erro ao remover vinculo');
        }
    };

    // Filter out already linked stations
    const unlinkedStations = availableStations.filter(st =>
        !linkedStations.some(link => link.station_id === st.id)
    ).filter(st =>
        st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (st.location && st.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Add New Link */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Vincular Planta Solarman</h3>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar planta por nome ou localizao..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border-2 border-gray-300 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                    />
                </div>

                {/* Results list */}
                {searchTerm && (
                    <div className="mt-3 max-h-64 overflow-y-auto space-y-2 bg-white rounded-lg border-2 border-gray-200 p-2">
                        {unlinkedStations.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Nenhuma planta encontrada</p>
                        ) : (
                            unlinkedStations.map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => {
                                        setSelectedStation(st.id);
                                        handleAddClick(st.id);
                                        setSearchTerm('');
                                    }}
                                    disabled={adding}
                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-green-50 border border-transparent hover:border-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">
                                                {st.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {st.capacity ? (st.capacity / 1000).toFixed(2) : 0} kWp
                                                {st.location && `  ${st.location}`}
                                            </p>
                                        </div>
                                        <Plus className="h-4 w-4 text-green-600" />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Linked Stations List */}
            <div className="space-y-3">
                {linkedStations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Nenhuma planta vinculada</p>
                    </div>
                ) : (
                    linkedStations.map(link => {
                        // Try to find current status in available list
                        const currentData = availableStations.find(s => s.id === link.station_id);
                        const isOnline = currentData ? currentData.status === 'online' : false;

                        return (
                            <div key={link.id || link.station_id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-green-300 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-50' : 'bg-gray-100'}`}>
                                        {isOnline ? (
                                            <Wifi className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <WifiOff className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">
                                            {link.station_name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {isOnline ? 'Online' : 'Offline'}
                                            </span>
                                            <span></span>
                                            <span>ID: {link.station_id}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveClick(link.station_id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remover vnculo"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


