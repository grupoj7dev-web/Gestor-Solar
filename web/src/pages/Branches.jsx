import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Building2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { EmptyState, ErrorState, LoadingState } from '../components/feedback';

export function Branches() {
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const { success, error: notifyError, confirm } = useNotification();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const response = await api.get('/branches', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setBranches(response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
            setLoadError('Nao foi possivel carregar as filiais.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const approved = await confirm('Tem certeza que deseja excluir esta filial?');
        if (!approved) return;

        try {
            await api.delete(`/branches/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            success('Filial excluida com sucesso.');
            fetchBranches();
        } catch (error) {
            console.error('Error deleting branch:', error);
            notifyError('Erro ao excluir filial.');
        }
    };

    const formatCNPJ = (cnpj) => {
        if (!cnpj) return '';
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatCEP = (cep) => {
        if (!cep) return '';
        return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-12">
            <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-600 rounded-xl shadow-lg shadow-green-200">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Cadastro de Filiais</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gerencie as filiais da empresa</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/branches/new')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 font-medium text-sm"
                    >
                        <Plus className="h-5 w-5" />
                        Nova Filial
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <LoadingState
                        title="Carregando filiais..."
                        description="Buscando registros cadastrados."
                    />
                ) : loadError ? (
                    <ErrorState
                        title="Erro ao carregar filiais"
                        description={loadError}
                        onRetry={fetchBranches}
                    />
                ) : branches.length === 0 ? (
                    <EmptyState
                        icon={AlertTriangle}
                        title="Nenhuma filial cadastrada"
                        description="Comece criando sua primeira filial."
                        actionLabel="Cadastrar primeira filial"
                        onAction={() => navigate('/branches/new')}
                    />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {branches.map((branch) => (
                            <div
                                key={branch.id}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 overflow-hidden transition-all duration-300 hover:shadow-2xl"
                            >
                                {/* Header with gradient background */}
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 pb-8">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-14 h-14 bg-white dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                                            <Building2 className="h-7 w-7 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-white leading-tight mb-1.5 line-clamp-2">
                                                {branch.name}
                                            </h3>
                                            <p className="text-sm text-white/80 font-medium">
                                                {formatCNPJ(branch.cnpj)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {/* Address Info */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">Endereço:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                                                {branch.street}, {branch.number || 'S/N'}
                                            </span>
                                        </div>
                                        {branch.complement && (
                                            <div className="flex items-start gap-2">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">Compl.:</span>
                                                <span className="text-sm text-gray-900 dark:text-white font-medium">{branch.complement}</span>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">Bairro:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">{branch.neighborhood}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">Cidade:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">{branch.city} - {branch.state}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">CEP:</span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">{formatCEP(branch.cep)}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => navigate(`/branches/edit/${branch.id}`)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-green-200 hover:shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(branch.id)}
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
            </div>
        </div>
    );
}
