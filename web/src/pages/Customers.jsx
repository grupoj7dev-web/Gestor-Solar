import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus, Edit, Trash2, AlertTriangle, Zap, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { VirtualizedList } from '../components/VirtualizedList';
import { useNotification } from '../contexts/NotificationContext';

export function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'pf', 'pj'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const { error: notifyError, confirm, success } = useNotification();

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        let filtered = customers;

        if (filterType !== 'all') {
            filtered = filtered.filter((c) => c.customer_type === filterType);
        }

        if (debouncedSearchTerm) {
            const term = debouncedSearchTerm.toLowerCase();
            const digits = term.replace(/\D/g, '');
            filtered = filtered.filter((c) => {
                const name = c.customer_type === 'pf' ? c.full_name : c.company_name;
                const doc = c.customer_type === 'pf' ? c.cpf : c.cnpj;
                return (
                    name?.toLowerCase().includes(term) ||
                    (digits && doc?.includes(digits)) ||
                    c.email?.toLowerCase().includes(term)
                );
            });
        }

        return filtered;
    }, [customers, debouncedSearchTerm, filterType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterType]);

    const handleDelete = async (id) => {
        const approved = await confirm('Tem certeza que deseja excluir este cliente?');
        if (!approved) return;

        const previous = customers;
        setCustomers((prev) => prev.filter((c) => c.id !== id));

        try {
            await api.delete(`/customers/${id}`);
        } catch (error) {
            setCustomers(previous);
            console.error('Error deleting customer:', error);
            notifyError('Erro ao excluir cliente.');
        }
    };

    const formatCPF = (cpf) => {
        if (!cpf) return '';
        return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    };

    const formatCNPJ = (cnpj) => {
        if (!cnpj) return '';
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatPhone = (phone) => {
        if (!phone) return '';
        if (phone.length === 11) {
            return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        }
        return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    };

    const shouldVirtualize = filteredCustomers.length > 60;
    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));

    const pagedCustomers = useMemo(() => {
        if (shouldVirtualize) return filteredCustomers;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCustomers.slice(start, start + itemsPerPage);
    }, [filteredCustomers, shouldVirtualize, currentPage, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-12">
            <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Cadastro de Clientes</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gerencie seus clientes PF e PJ</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/customers/wizard/new')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 font-medium text-sm"
                    >
                        <Plus className="h-5 w-5" />
                        Novo Cliente
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none appearance-none bg-white dark:bg-gray-800"
                            >
                                <option value="all">Todos os tipos</option>
                                <option value="pf">Pessoa Física</option>
                                <option value="pj">Pessoa Jurídica</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Mostrando <span className="font-semibold text-gray-900 dark:text-white">{filteredCustomers.length}</span> de{' '}
                        <span className="font-semibold text-gray-900 dark:text-white">{customers.length}</span> clientes
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600"></div>
                        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Carregando clientes...</p>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full mb-4">
                            <AlertTriangle className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {searchTerm || filterType !== 'all' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm max-w-sm text-center">
                            {searchTerm || filterType !== 'all'
                                ? 'Tente ajustar os filtros de busca.'
                                : 'Comece criando seu primeiro cliente.'}
                        </p>
                        {!searchTerm && filterType === 'all' && (
                            <button
                                onClick={() => navigate('/customers/wizard/new')}
                                className="mt-6 text-blue-600 font-medium text-sm hover:text-blue-700 hover:underline"
                            >
                                Cadastrar primeiro cliente
                            </button>
                        )}
                    </div>
                ) : shouldVirtualize ? (
                    <VirtualizedList
                        items={filteredCustomers}
                        itemHeight={126}
                        containerClassName="h-[70vh] overflow-auto"
                        className="space-y-3"
                        renderItem={(customer) => (
                            <div
                                key={customer.id}
                                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${customer.customer_type === 'pf' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {customer.customer_type}
                                        </span>
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {customer.customer_type === 'pf' ? customer.full_name : customer.company_name}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 truncate">{customer.email}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {customer.customer_type === 'pf' ? formatCPF(customer.cpf) : formatCNPJ(customer.cnpj)} • {customer.city} - {customer.state}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => navigate(`/customers/${customer.id}`)}
                                        className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                                    >
                                        Ver
                                    </button>
                                    <button
                                        onClick={() => navigate(`/customers/wizard/edit/${customer.id}`)}
                                        className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(customer.id)}
                                        className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        )}
                    />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {pagedCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 overflow-hidden transition-all duration-300 hover:shadow-2xl"
                            >
                                <div className={`${customer.customer_type === 'pf' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'} p-6 pb-8`}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                            <Users className={`h-7 w-7 ${customer.customer_type === 'pf' ? 'text-blue-600' : 'text-purple-600'}`} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-bold text-white uppercase tracking-wide px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/20 rounded-md">
                                                    {customer.customer_type === 'pf' ? 'PF' : 'PJ'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-white leading-tight mb-1.5 line-clamp-2">
                                                {customer.customer_type === 'pf' ? customer.full_name : customer.company_name}
                                            </h3>
                                            <p className="text-sm text-white/80 font-medium">
                                                {customer.customer_type === 'pf' ? formatCPF(customer.cpf) : formatCNPJ(customer.cnpj)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="space-y-3 mb-6">
                                        {customer.customer_type === 'pj' && customer.trade_name && (
                                            <div className="flex items-start gap-2">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[80px]">Nome Fant.:</span>
                                                <span className="text-sm text-gray-900 dark:text-white font-medium">{customer.trade_name}</span>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[80px]">Email:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{customer.email}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[80px]">Telefone:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">{formatPhone(customer.phone)}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[80px]">Cidade:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">{customer.city} - {customer.state}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-md">
                                            <Zap className="h-3.5 w-3.5" />
                                            {customer.inverters_count || 0} Inversores
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-md">
                                            <Activity className="h-3.5 w-3.5" />
                                            {customer.stations_count || 0} Plantas
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mt-6">
                                        <button
                                            onClick={() => navigate(`/customers/wizard/edit/${customer.id}`)}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 ${customer.customer_type === 'pf' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'} text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                                        >
                                            <Edit className="h-4 w-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => navigate(`/customers/${customer.id}`)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                                        >
                                            <Users className="h-4 w-4" />
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleDelete(customer.id)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-red-600 text-gray-700 dark:text-gray-200 hover:text-white rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-red-200 hover:scale-105 active:scale-95"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!shouldVirtualize && filteredCustomers.length > itemsPerPage && (
                    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
                        <p className="text-sm text-gray-600">
                            Página {currentPage} de {totalPages} ({filteredCustomers.length} clientes)
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="rounded-lg border border-gray-300 px-2 py-2 text-sm font-medium text-gray-700"
                            >
                                <option value={12}>12 / página</option>
                                <option value={24}>24 / página</option>
                                <option value={48}>48 / página</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

