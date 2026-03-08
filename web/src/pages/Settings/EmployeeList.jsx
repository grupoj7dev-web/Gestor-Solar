import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { getToken } = useAuth();
    const { confirm, error: notifyError, success } = useNotification();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employees', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            // Map permissions.department to top level for display if needed, or handle in render
            const mappedEmployees = res.data.map(emp => ({
                ...emp,
                department: emp.permissions?.department || emp.department || '-'
            }));
            setEmployees(mappedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const approved = await confirm('Tem certeza que deseja excluir este funcionario?');
        if (!approved) return;

        try {
            await api.delete(`/employees/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            fetchEmployees();
            success('Funcionario excluido com sucesso.');
        } catch (error) {
            console.error('Error deleting employee:', error);
            notifyError('Erro ao excluir funcionario.');
        }
    };

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingEmployee(null);
        fetchEmployees();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funcionrios</h1>
                    <p className="text-gray-500 dark:text-gray-400">Equipe para atendimento inicial</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Novo Funcionrio
                </button>
            </div>

            {showForm && (
                <EmployeeForm
                    employee={editingEmployee}
                    onClose={handleFormClose}
                    getToken={getToken}
                    notifyError={notifyError}
                    success={success}
                />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Departamento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contato</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aes</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {employees.length > 0 ? (
                            employees.map(employee => (
                                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-full">
                                                <User className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">{employee.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded">
                                            {employee.department}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-white">{employee.email || '-'}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{employee.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(employee)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(employee.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    Nenhum funcionrio cadastrado ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function EmployeeForm({ employee, onClose, getToken, notifyError, success }) {
    const [formData, setFormData] = useState({
        name: employee?.name || '',
        phone: employee?.phone || '',
        email: employee?.email || '',
        department: employee?.department || employee?.permissions?.department || '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                permissions: {
                    department: formData.department,
                    modules: [] // Default modules or preserve existing if needed
                }
            };

            // Remove password if empty (for edit)
            if (!payload.password) delete payload.password;

            if (employee) {
                await api.put(`/employees/${employee.id}`, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            } else {
                await api.post('/employees', payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }
            success(employee ? 'Funcionario atualizado com sucesso.' : 'Funcionario criado com sucesso.');
            onClose();
        } catch (error) {
            console.error('Error saving employee:', error);
            notifyError(error.response?.data?.error || 'Erro ao salvar funcionario.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    {employee ? 'Editar Funcionrio' : 'Novo Funcionrio'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome Completo *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Departamento *</label>
                        <select
                            required
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        >
                            <option value="">Selecione...</option>
                            <option value="Suporte">Suporte</option>
                            <option value="Engenharia">Engenharia</option>
                            <option value="Obras">Obras</option>
                            <option value="Vendas">Vendas</option>
                            <option value="Gerncia">Gerncia</option>
                            <option value="Diretoria">Diretoria</option>
                            <option value="Financeiro">Financeiro</option>
                            <option value="DP/RH">DP/RH</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Telefone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">E-mail *</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            {employee ? 'Senha (deixe em branco para manter)' : 'Senha *'}
                        </label>
                        <input
                            type="password"
                            required={!employee}
                            minLength={6}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


