import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Receipt, Plus, Edit, Trash2, Eye, Download, Filter, X,
    TrendingUp, TrendingDown, Calendar, DollarSign, Zap, BarChart3
} from 'lucide-react';
import { invoices } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNotification } from '../contexts/NotificationContext';

export function CustomerInvoices() {
    const { customer } = useOutletContext();
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [filters, setFilters] = useState({ month: '', year: '', status: '' });
    const { success, error: notifyError, confirm } = useNotification();
    const [formData, setFormData] = useState({
        reference_month: new Date().getMonth() + 1,
        reference_year: new Date().getFullYear(),
        reading_previous: '',
        reading_current: '',
        consumption_kwh: '',
        storage_kwh: '',
        amount: '',
        due_date: '',
        status: 'pending',
        notes: ''
    });

    useEffect(() => {
        if (customer?.id) {
            fetchInvoices();
        }
    }, [customer, filters]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const data = await invoices.getAll(customer.id, filters);
            setInvoiceList(data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (invoice) => {
        setSelectedInvoice(invoice);
        setShowDetailModal(true);

        try {
            const compData = await invoices.getComparison(invoice.id);
            setComparison(compData);
        } catch (error) {
            console.error('Error fetching comparison:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await invoices.create(customer.id, formData);
            success('Fatura criada com sucesso.');
            setShowModal(false);
            fetchInvoices();
            resetForm();
        } catch (error) {
            console.error('Error creating invoice:', error);
            notifyError(error.response?.data?.error || 'Erro ao criar fatura.');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await invoices.update(selectedInvoice.id, formData);
            success('Fatura atualizada com sucesso.');
            setShowModal(false);
            fetchInvoices();
            resetForm();
            setSelectedInvoice(null);
        } catch (error) {
            console.error('Error updating invoice:', error);
            notifyError('Erro ao atualizar fatura.');
        }
    };

    const handleDelete = async (id) => {
        const approved = await confirm('Tem certeza que deseja excluir esta fatura?');
        if (!approved) return;

        try {
            await invoices.delete(id);
            success('Fatura excluida com sucesso.');
            fetchInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            notifyError('Erro ao excluir fatura.');
        }
    };

    const handleEdit = (invoice) => {
        setSelectedInvoice(invoice);
        setFormData({
            reference_month: invoice.reference_month,
            reference_year: invoice.reference_year,
            reading_previous: invoice.reading_previous || '',
            reading_current: invoice.reading_current || '',
            consumption_kwh: invoice.consumption_kwh,
            storage_kwh: invoice.storage_kwh || 0,
            amount: invoice.amount,
            due_date: invoice.due_date?.split('T')[0] || '',
            status: invoice.status,
            notes: invoice.notes || ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            reference_month: new Date().getMonth() + 1,
            reference_year: new Date().getFullYear(),
            reading_previous: '',
            reading_current: '',
            consumption_kwh: '',
            storage_kwh: '',
            amount: '',
            due_date: '',
            status: 'pending',
            notes: ''
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            paid: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            overdue: 'bg-red-100 text-red-800'
        };
        const labels = {
            paid: 'Paga',
            pending: 'Pendente',
            overdue: 'Vencida'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Histrico de Faturas</h1>
                        <p className="text-gray-500 mt-1">Gerencie faturas e compare com gerao medida</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setSelectedInvoice(null); setShowModal(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nova Fatura
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-500" />
                            <span className="font-semibold text-gray-700">Filtros:</span>
                        </div>

                        <select
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Todos os meses</option>
                            {monthNames.map((name, idx) => (
                                <option key={idx} value={idx + 1}>{name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Todos os anos</option>
                            {[2025, 2024, 2023, 2022, 2021].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Todos os status</option>
                            <option value="pending">Pendente</option>
                            <option value="paid">Paga</option>
                            <option value="overdue">Vencida</option>
                        </select>

                        {(filters.month || filters.year || filters.status) && (
                            <button
                                onClick={() => setFilters({ month: '', year: '', status: '' })}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Invoices Table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {invoiceList.length === 0 ? (
                        <div className="p-12 text-center">
                            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhuma Fatura Encontrada</h3>
                            <p className="text-gray-500">Adicione a primeira fatura para comear</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Referncia</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Leitura Ant.</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Leitura Atual</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Consumo</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Armazenamento</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Aes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {invoiceList.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-gray-900">
                                                    {monthNames[inv.reference_month - 1]}/{inv.reference_year}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {inv.reading_previous ? `${inv.reading_previous} kWh` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {inv.reading_current ? `${inv.reading_current} kWh` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-semibold text-gray-900">{inv.consumption_kwh} kWh</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-green-600 font-semibold">{inv.storage_kwh || 0} kWh</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-semibold text-gray-900">
                                                    R$ {parseFloat(inv.amount).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(inv.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(inv)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(inv)}
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(inv.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {selectedInvoice ? 'Editar Fatura' : 'Nova Fatura'}
                                </h2>
                                <button onClick={() => { setShowModal(false); setSelectedInvoice(null); }}>
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={selectedInvoice ? handleUpdate : handleCreate} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ms</label>
                                        <select
                                            value={formData.reference_month}
                                            onChange={(e) => setFormData({ ...formData, reference_month: parseInt(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            required
                                        >
                                            {monthNames.map((name, idx) => (
                                                <option key={idx} value={idx + 1}>{name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ano</label>
                                        <input
                                            type="number"
                                            value={formData.reference_year}
                                            onChange={(e) => setFormData({ ...formData, reference_year: parseInt(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Leitura Anterior (kWh)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.reading_previous}
                                            onChange={(e) => setFormData({ ...formData, reading_previous: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Leitura Atual (kWh)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.reading_current}
                                            onChange={(e) => setFormData({ ...formData, reading_current: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Consumo (kWh) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.consumption_kwh}
                                            onChange={(e) => setFormData({ ...formData, consumption_kwh: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Armazenamento/Injeo (kWh)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.storage_kwh}
                                            onChange={(e) => setFormData({ ...formData, storage_kwh: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vencimento *</label>
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                        <option value="pending">Pendente</option>
                                        <option value="paid">Paga</option>
                                        <option value="overdue">Vencida</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Observaes</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        rows="3"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                    >
                                        {selectedInvoice ? 'Atualizar' : 'Criar'} Fatura
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); setSelectedInvoice(null); }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Detail Modal with Comparison */}
                {showDetailModal && selectedInvoice && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Detalhes da Fatura - {monthNames[selectedInvoice.reference_month - 1]}/{selectedInvoice.reference_year}
                                </h2>
                                <button onClick={() => { setShowDetailModal(false); setComparison(null); }}>
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Invoice Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Consumo</p>
                                        <p className="text-2xl font-bold text-gray-900">{selectedInvoice.consumption_kwh} kWh</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Armazenamento</p>
                                        <p className="text-2xl font-bold text-green-600">{selectedInvoice.storage_kwh || 0} kWh</p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Valor</p>
                                        <p className="text-2xl font-bold text-blue-600">R$ {parseFloat(selectedInvoice.amount).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Status</p>
                                        <div className="mt-2">{getStatusBadge(selectedInvoice.status)}</div>
                                    </div>
                                </div>

                                {/* Comparison Chart */}
                                {comparison && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-blue-600" />
                                            Comparao: Consumo vs Gerao Medida
                                        </h3>

                                        <div className="h-64 mb-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[
                                                    {
                                                        name: 'Energia',
                                                        Consumo: comparison.invoice.consumption,
                                                        'Gerao Real': comparison.generation.actual
                                                    }
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="Consumo" fill="#ef4444" />
                                                    <Bar dataKey="Gerao Real" fill="#10b981" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-500 mb-1">Diferena</p>
                                                <p className={`text-xl font-bold ${comparison.generation.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {comparison.generation.difference >= 0 ? '+' : ''}{comparison.generation.difference.toFixed(2)} kWh
                                                </p>
                                            </div>
                                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-500 mb-1">Cobertura</p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {comparison.generation.savings_percentage}%
                                                </p>
                                            </div>
                                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-500 mb-1">Gerao Real</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {comparison.generation.actual.toFixed(2)} kWh
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedInvoice.notes && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                        <p className="text-sm font-semibold text-yellow-800 mb-2">Observaes:</p>
                                        <p className="text-gray-700">{selectedInvoice.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


