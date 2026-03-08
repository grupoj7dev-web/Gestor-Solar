import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AlertTriangle, Edit, Plus, Search, Trash2, Zap, SlidersHorizontal } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

export function Inverters() {
    const navigate = useNavigate();
    const [inverters, setInverters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState('all');
    const [filterFases, setFilterFases] = useState('all');
    const [filterTensao, setFilterTensao] = useState('all');
    const { confirm, error: notifyError, success } = useNotification();

    useEffect(() => {
        fetchInverters();
    }, []);

    const fetchInverters = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inverters', {
                params: { _t: Date.now() },
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache'
                }
            });
            const list = Array.isArray(response.data) ? response.data : [];
            setInverters(list);
        } catch (error) {
            console.error('Error fetching inverters:', error);
            setInverters([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredInverters = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return inverters.filter((inv) => {
            const matchesSearch = !term ||
                String(inv.marca || '').toLowerCase().includes(term) ||
                String(inv.modelo || '').toLowerCase().includes(term) ||
                String(inv.tipo || '').toLowerCase().includes(term);

            const matchesTipo = filterTipo === 'all' || String(inv.tipo || '') === filterTipo;
            const matchesFases = filterFases === 'all' || String(inv.fases || '') === filterFases;
            const matchesTensao = filterTensao === 'all' || String(inv.tensao || '') === filterTensao;

            return matchesSearch && matchesTipo && matchesFases && matchesTensao;
        });
    }, [inverters, searchTerm, filterTipo, filterFases, filterTensao]);

    const stats = useMemo(() => {
        const stringCount = inverters.filter((inv) => String(inv.tipo || '').toLowerCase() === 'string').length;
        const microCount = inverters.filter((inv) => String(inv.tipo || '').toLowerCase().includes('micro')).length;
        return {
            total: inverters.length,
            stringCount,
            microCount
        };
    }, [inverters]);

    const handleDelete = async (id) => {
        const approved = await confirm('Tem certeza que deseja excluir este inversor?');
        if (!approved) return;
        const previous = inverters;
        setInverters((prev) => prev.filter((x) => x.id !== id));
        try {
            await api.delete(`/inverters/${id}`);
        } catch (error) {
            setInverters(previous);
            console.error('Error deleting inverter:', error);
            notifyError('Erro ao excluir inversor.');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-600 p-3 text-white">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Inversores</h1>
                            <p className="text-sm text-slate-500">Lista de inversores cadastrados</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/inverters/new')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        Novo Inversor
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">String</p>
                        <p className="mt-1 text-2xl font-bold text-blue-700">{stats.stringCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">Micro</p>
                        <p className="mt-1 text-2xl font-bold text-purple-700">{stats.microCount}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="relative md:col-span-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por marca, modelo ou tipo..."
                                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="all">Todos tipos</option>
                            <option value="String">String</option>
                            <option value="Microinversor">Microinversor</option>
                            <option value="Micro Inversor">Micro Inversor</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                            <select
                                value={filterFases}
                                onChange={(e) => setFilterFases(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="all">Todas fases</option>
                                <option value="Monofsica">Monofsica</option>
                                <option value="Trifsica">Trifsica</option>
                            </select>
                        </div>
                        <div className="md:col-start-4">
                            <select
                                value={filterTensao}
                                onChange={(e) => setFilterTensao(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="all">Todas tenses</option>
                                <option value="127V">127V</option>
                                <option value="220V">220V</option>
                                <option value="380V">380V</option>
                            </select>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        {filteredInverters.length} de {inverters.length} inversores
                    </p>
                </div>

                {filteredInverters.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                        <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-3 font-semibold text-slate-700">Nenhum inversor encontrado</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredInverters.map((inv) => (
                            <div key={inv.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{inv.tipo || '-'}</p>
                                <h3 className="mt-1 text-lg font-bold text-slate-900">
                                    {inv.marca || '-'} {inv.modelo || ''}
                                </h3>
                                <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                                    <p><span className="font-medium text-slate-800">Potncia:</span> {inv.potencia_nominal || '-'} kW</p>
                                    <p><span className="font-medium text-slate-800">Fases:</span> {inv.fases || '-'}</p>
                                    <p><span className="font-medium text-slate-800">Tenso:</span> {inv.tensao || '-'}</p>
                                    <p><span className="font-medium text-slate-800">AFCI:</span> {inv.afci_integrado ? 'Sim' : 'No'}</p>
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => navigate(`/inverters/edit/${inv.id}`)}
                                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(inv.id)}
                                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-red-600 hover:text-white"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


