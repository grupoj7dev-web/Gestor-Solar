import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Shield, User } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const AVAILABLE_MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'operation', label: 'Painel de Operação', icon: '⚙️' },
    { id: 'monitoring', label: 'Monitoramento', icon: '📈' },
    { id: 'tickets', label: 'Chamados', icon: '📞' },
    { id: 'clients', label: 'Clientes', icon: '👥' },
    { id: 'inverters', label: 'Inversores', icon: '⚡' },
    { id: 'branches', label: 'Filiais', icon: '🏢' },
    { id: 'parameters', label: 'Parâmetros', icon: '📋' }
];

export function EmployeeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken, isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        permissions: { modules: [] }
    });

    useEffect(() => {
        if (!isAdmin()) {
            navigate('/');
            return;
        }
        if (id) {
            fetchEmployee();
        }
    }, [id]);

    const fetchEmployee = async () => {
        try {
            const response = await api.get(`/employees/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setFormData({
                name: response.data.name || '',
                email: response.data.email || '',
                password: '', // Don't populate password
                role: response.data.role || 'employee',
                permissions: response.data.permissions || { modules: [] }
            });
        } catch (error) {
            console.error('Error fetching employee:', error);
            setError('Erro ao carregar funcionário');
        }
    };

    const handleModuleToggle = (moduleId) => {
        const currentModules = formData.permissions?.modules || [];
        const newModules = currentModules.includes(moduleId)
            ? currentModules.filter(m => m !== moduleId)
            : [...currentModules, moduleId];

        setFormData({
            ...formData,
            permissions: { modules: newModules }
        });
    };

    const handleSubmit = async () => {
        console.log('handleSubmit called');
        console.log('Current formData:', formData);
        setError('');

        if (!formData.name || !formData.email) {
            console.log('Validation failed: Name or email missing');
            setError('Preencha nome e email');
            return;
        }

        if (!id && !formData.password) {
            console.log('Validation failed: Password missing for new user');
            setError('Senha é obrigatória para novo funcionário');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            console.log('Validation failed: Password too short');
            setError('Senha deve ter pelo menos 6 caracteres');
            return;
        }

        console.log('Validation passed. Setting loading true...');
        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                permissions: formData.permissions
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            console.log('Sending payload to API:', payload);

            if (id) {
                console.log('Calling PUT /employees/' + id);
                await api.put(`/employees/${id}`, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            } else {
                console.log('Calling POST /employees');
                await api.post('/employees', payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }

            console.log('API call successful. Navigating...');
            navigate('/employees');
        } catch (err) {
            console.error('API call failed:', err);
            setError(err.response?.data?.error || 'Erro ao salvar funcionário');
        } finally {
            console.log('Finally block executed. Setting loading false.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/employees')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Voltar para lista</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {id ? ' Editar Funcionário' : 'Novo Funcionário'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Defina as permissões de acesso ao sistema</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Dados Básicos
                        </h2>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                placeholder="João da Silva"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                placeholder="joao@empresa.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Senha {id ? '(deixe em branco para manter)' : '*'}
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                Tipo de Conta *
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'employee' })}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.role === 'employee'
                                        ? 'border-gray-700 bg-gray-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900 dark:text-white">Funcionário</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Acesso customizado</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.role === 'admin'
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Shield className="h-6 w-6 text-indigo-600" />
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900 dark:text-white">Administrador</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Acesso total</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    {formData.role === 'employee' && (
                        <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                    Permissões de Acesso
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Selecione os módulos que este funcionário poderá acessar
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {AVAILABLE_MODULES.map((module) => {
                                    const isSelected = formData.permissions?.modules?.includes(module.id);
                                    return (
                                        <label
                                            key={module.id}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleModuleToggle(module.id)}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
                                            />
                                            <span className="text-2xl">{module.icon}</span>
                                            <span className={`font-semibold text-sm flex-1 ${isSelected ? 'text-blue-900' : 'text-gray-700'
                                                }`}>
                                                {module.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            {formData.permissions?.modules?.length === 0 && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                                    ⚠️ Este funcionário não terá acesso a nenhum módulo do sistema
                                </div>
                            )}
                        </div>
                    )}

                    {formData.role === 'admin' && (
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-sm">
                            🔐 <strong>Administradores</strong> têm acesso total a todos os módulos do sistema, incluindo o gerenciamento de funcionários.
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 mt-8">
                    <button
                        onClick={() => navigate('/employees')}
                        className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Salvar Funcionário
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
