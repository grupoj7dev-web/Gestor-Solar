import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export function ReasonList() {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingReason, setEditingReason] = useState(null);
    const { getToken } = useAuth();
    const { success, error: showError, confirm } = useNotification();

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            const res = await api.get('/ticket-reasons', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setReasons(res.data);
        } catch (error) {
            console.error('Error fetching reasons:', error);
            showError('Erro ao carregar motivos de chamado');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm('Tem certeza que deseja excluir este motivo?');
        if (!confirmed) return;

        try {
            await api.delete(`/ticket-reasons/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            success('Motivo excluído com sucesso!');
            fetchReasons();
        } catch (err) {
            console.error('Error deleting reason:', err);
            const errorMessage = err.response?.data?.error || 'Erro ao excluir motivo';
            showError(errorMessage);
        }
    };

    const handleEdit = (reason) => {
        setEditingReason(reason);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingReason(null);
        fetchReasons();
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Motivos de Chamado</h1>
                    <p className="text-gray-500 dark:text-gray-400">Categorias de problemas e prompts para IA</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Novo Motivo
                </button>
            </div>

            {showForm && (
                <ReasonForm
                    reason={editingReason}
                    onClose={handleFormClose}
                    getToken={getToken}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reasons.length > 0 ? (
                    reasons.map(reason => (
                        <div key={reason.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <AlertCircle className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{reason.title}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(reason)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(reason.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {reason.ai_prompt && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Prompt da IA:</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3">{reason.ai_prompt}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        Nenhum motivo cadastrado ainda.
                    </div>
                )}
            </div>
        </div>
    );
}

function ReasonForm({ reason, onClose, getToken }) {
    const [formData, setFormData] = useState({
        title: reason?.title || '',
        ai_prompt: reason?.ai_prompt || ''
    });
    const [loading, setLoading] = useState(false);
    const { success, error: showError } = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (reason) {
                await api.put(`/ticket-reasons/${reason.id}`, formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                success('Motivo atualizado com sucesso!');
            } else {
                await api.post('/ticket-reasons', formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                success('Motivo criado com sucesso!');
            }
            onClose();
        } catch (error) {
            console.error('Error saving reason:', error);
            showError('Erro ao salvar motivo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
                <h2 className="text-xl font-bold mb-4">
                    {reason ? 'Editar Motivo' : 'Novo Motivo'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título do Motivo *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Alerta Inversor, Sem Comunicação, Dúvidas na Fatura..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Prompt para IA (Opcional)</label>
                        <textarea
                            value={formData.ai_prompt}
                            onChange={e => setFormData({ ...formData, ai_prompt: e.target.value })}
                            rows={6}
                            placeholder="Ex: Perguntar ao cliente: Qual inversor? Qual mensagem de erro? O sistema está gerando? Referências: conta de energia errada, placa suja, queda de energia..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Use este campo para definir perguntas-chave que a IA deve fazer ao cliente e referências para classificar este motivo.
                        </p>
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
