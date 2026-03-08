import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Zap, Loader2, Star, Copy, Check, Building2 } from 'lucide-react';
import { api } from '../lib/api';

export function CustomerConsumerUnits() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState([]);
    const [error, setError] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchUnits();
    }, [id]);

    const fetchUnits = async () => {
        try {
            const response = await api.get(`/customers/${id}`);
            setUnits(response.data.consumer_units || []);
        } catch (err) {
            console.error('Error fetching units:', err);
            setError('Erro ao carregar unidades consumidoras');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, unitId) => {
        navigator.clipboard.writeText(text);
        setCopiedId(unitId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                {error}
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Unidades Consumidoras</h2>
                <p className="text-gray-500 mt-1">
                    Gerencie as unidades consumidoras vinculadas a este cliente
                </p>
            </div>

            {units.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma unidade encontrada</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Este cliente ainda não possui unidades consumidoras cadastradas no sistema.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {units.map((unit) => (
                        <div
                            key={unit.id}
                            className={`group relative bg-white rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg ${unit.is_primary
                                ? 'border-blue-200 shadow-md ring-1 ring-blue-100'
                                : 'border-gray-100 shadow-sm hover:border-gray-200'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${unit.is_primary ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                                    }`}>
                                    <Building2 className="h-6 w-6" />
                                </div>
                                {unit.is_primary && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                        <Star className="h-3.5 w-3.5 fill-current" />
                                        Principal
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Número da UC
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-gray-900 tracking-tight">
                                        {unit.unit_number}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(unit.unit_number, unit.id)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Copiar número"
                                    >
                                        {copiedId === unit.id ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                <span>Cadastrada em</span>
                                <span className="font-medium text-gray-600">
                                    {new Date(unit.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
