import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit, Users, CheckCircle, XCircle, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { EmptyState, ErrorState, LoadingState } from '../components/feedback';

export function Employees() {
    const { getToken, isAdmin, user } = useAuth();
    const navigate = useNavigate();
    const { success, error: notifyError, warning, confirm } = useNotification();

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!isAdmin()) {
            navigate('/');
            return;
        }
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const response = await api.get('/employees', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            setLoadError('Nao foi possivel carregar os funcionarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (employee) => {
        try {
            await api.put(`/employees/${employee.id}`, {
                name: employee.name,
                email: employee.email,
                role: employee.role,
                permissions: employee.permissions,
                is_active: !employee.is_active
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            success('Status do funcionario atualizado.');
            fetchEmployees();
        } catch (error) {
            console.error('Error toggling employee status:', error);
            notifyError('Erro ao alterar status do funcionario.');
        }
    };

    const handleDeleteEmployee = async (employee) => {
        if (!employee?.id) return;

        if (employee.id === user?.id) {
            warning('Voce nao pode excluir seu proprio usuario.');
            return;
        }

        const approved = await confirm(`Tem certeza que deseja excluir o funcionario "${employee.name}"?`);
        if (!approved) return;

        try {
            setDeletingId(employee.id);
            await api.delete(`/employees/${employee.id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
            success('Funcionario excluido com sucesso.');
        } catch (error) {
            console.error('Error deleting employee:', error);
            notifyError(error.response?.data?.error || 'Erro ao excluir funcionario.');
        } finally {
            setDeletingId(null);
        }
    };

    const moduleLabels = {
        dashboard: 'Dashboard',
        operation: 'Painel de Operacao',
        monitoring: 'Monitoramento',
        tickets: 'Chamados',
        clients: 'Clientes',
        inverters: 'Inversores',
        branches: 'Filiais',
        parameters: 'Parametros',
        employees: 'Funcionarios'
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-indigo-600 p-3 shadow-lg shadow-indigo-200">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gerenciamento de Funcionarios</h1>
                            <p className="text-sm font-medium text-gray-500">Controle de acessos e permissoes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/employees/new')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-gray-200 transition-all hover:bg-gray-800"
                    >
                        <Plus className="h-5 w-5" />
                        Novo Funcionario
                    </button>
                </div>

                {loading ? (
                    <LoadingState title="Carregando funcionarios..." description="Buscando usuarios cadastrados." />
                ) : loadError ? (
                    <ErrorState title="Erro ao carregar funcionarios" description={loadError} onRetry={fetchEmployees} />
                ) : employees.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Nenhum funcionario cadastrado"
                        description="Comece criando seu primeiro funcionario."
                        actionLabel="Cadastrar primeiro funcionario"
                        onAction={() => navigate('/employees/new')}
                    />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {employees.map((employee) => (
                            <div
                                key={employee.id}
                                className={`group relative overflow-hidden rounded-2xl border-2 bg-white transition-all duration-300 hover:shadow-2xl ${employee.is_active ? 'border-gray-200 hover:border-indigo-400' : 'border-gray-300 opacity-70'
                                    }`}
                            >
                                <div className={`p-6 pb-8 ${employee.role === 'admin' ? 'bg-gradient-to-br from-indigo-600 to-violet-700' : 'bg-gradient-to-br from-slate-600 to-gray-700'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-md shadow-inner">
                                            {employee.role === 'admin' ? (
                                                <Shield className="h-7 w-7 text-white" strokeWidth={2.5} />
                                            ) : (
                                                <User className="h-7 w-7 text-white" strokeWidth={2.5} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1.5 flex items-center gap-2">
                                                <h3 className="line-clamp-1 text-lg font-bold leading-tight text-white">{employee.name}</h3>
                                                {employee.is_active ? (
                                                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-300" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 flex-shrink-0 text-red-300" />
                                                )}
                                            </div>
                                            <p className="truncate text-sm font-medium text-white/80">{employee.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="mb-4">
                                        <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm ${employee.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-white'}`}>
                                            {employee.role === 'admin' ? 'Administrador' : 'Funcionario'}
                                        </span>
                                    </div>

                                    <div className="mb-6">
                                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Permissoes</div>
                                        {employee.role === 'admin' ? (
                                            <div className="text-sm italic text-gray-600">Acesso total ao sistema</div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {employee.permissions?.modules?.length > 0 ? (
                                                    employee.permissions.modules.map((module) => (
                                                        <span
                                                            key={module}
                                                            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                                                        >
                                                            {moduleLabels[module] || module}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm italic text-gray-400">Nenhuma permissao</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => navigate(`/employees/edit/${employee.id}`)}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 hover:bg-indigo-700 hover:shadow-xl active:scale-95"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(employee)}
                                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${employee.is_active
                                                ? 'bg-gray-100 text-gray-700 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200'
                                                : 'bg-green-600 text-white shadow-lg shadow-green-200 hover:bg-green-700'
                                                }`}
                                        >
                                            {employee.is_active ? (
                                                <>
                                                    <XCircle className="h-4 w-4" />
                                                    Desativar
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    Ativar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEmployee(employee)}
                                            disabled={deletingId === employee.id || employee.id === user?.id}
                                            title={employee.id === user?.id ? 'Voce nao pode excluir seu proprio usuario' : 'Excluir funcionario'}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 transition-all hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {deletingId === employee.id ? 'Excluindo...' : 'Excluir'}
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
