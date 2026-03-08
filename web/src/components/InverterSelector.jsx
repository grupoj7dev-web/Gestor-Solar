import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export function InverterSelector({ customerId, linkedInverters, onUpdate, onAdd, onRemove }) {
    const { getToken } = useAuth();
    const { error: notifyError, confirm } = useNotification();
    const [availableInverters, setAvailableInverters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInverter, setSelectedInverter] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchInverters();
    }, []);

    const fetchInverters = async () => {
        try {
            const response = await api.get('/inverters', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setAvailableInverters(response.data);
        } catch (error) {
            console.error('Error fetching inverters:', error);
        }
    };

    const handleAddClick = async (inverterId = selectedInverter) => {
        if (!inverterId) return;

        // Local mode
        if (onAdd) {
            const inverter = availableInverters.find(inv => inv.id === inverterId);
            if (inverter) {
                onAdd({
                    inverter_id: inverter.id,
                    inverter // Pass full object for display
                });
                setSelectedInverter('');
            }
            return;
        }

        // Remote mode
        setAdding(true);
        try {
            await api.post(`/customers/${customerId}/inverters`, {
                inverter_id: inverterId
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            setSelectedInverter('');
            onUpdate();
        } catch (error) {
            console.error('Error linking inverter:', error);
            notifyError(error.response?.data?.error || 'Erro ao vincular inversor');
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveClick = async (inverterId) => {
        const approved = await confirm('Remover vinculo com este inversor?');
        if (!approved) return;

        // Local mode
        if (onRemove) {
            onRemove(inverterId);
            return;
        }

        // Remote mode
        try {
            await api.delete(`/customers/${customerId}/inverters/${inverterId}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            onUpdate();
        } catch (error) {
            console.error('Error removing inverter:', error);
            notifyError('Erro ao remover vinculo');
        }
    };

    // Filter out already linked inverters
    const unlinkedInverters = availableInverters.filter(inv =>
        !linkedInverters.some(link => link.inverter_id === inv.id)
    ).filter(inv =>
        inv.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.marca.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Add New Link */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Vincular Novo Inversor</h3>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar inversor por marca ou modelo..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border-2 border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                </div>

                {/* Results list */}
                {searchTerm && (
                    <div className="mt-3 max-h-64 overflow-y-auto space-y-2 bg-white rounded-lg border-2 border-gray-200 p-2">
                        {unlinkedInverters.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Nenhum inversor encontrado</p>
                        ) : (
                            unlinkedInverters.map(inv => (
                                <button
                                    key={inv.id}
                                    onClick={() => {
                                        setSelectedInverter(inv.id);
                                        handleAddClick(inv.id);
                                        setSearchTerm('');
                                    }}
                                    disabled={adding}
                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">
                                                {inv.marca} - {inv.modelo}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {inv.potencia_nominal} kW  {inv.tipo}
                                            </p>
                                        </div>
                                        <Plus className="h-4 w-4 text-blue-600" />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Linked Inverters List */}
            <div className="space-y-3">
                {linkedInverters.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Nenhum inversor vinculado</p>
                    </div>
                ) : (
                    linkedInverters.map(link => (
                        <div key={link.id || link.inverter_id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Zap className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">
                                        {link.inverter.marca} {link.inverter.modelo}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>{link.inverter.potencia_nominal} kW</span>
                                        <span></span>
                                        <span>{link.inverter.tipo}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveClick(link.inverter_id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover vnculo"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}


