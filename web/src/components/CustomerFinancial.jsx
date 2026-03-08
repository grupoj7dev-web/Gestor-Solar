import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Upload, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function CustomerFinancial({ formData, setFormData }) {
    const { getToken } = useAuth();
    const [uploadingInfo, setUploadingInfo] = useState({ conditionId: null, installmentIndex: null, loading: false });

    // Format currency helper
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    // Calculate totals
    const totalSale = parseFloat(formData.sale_total_value) || 0;

    // Flatten all installments to get total received/scheduled
    const allInstallments = (formData.financial_conditions || []).flatMap(c => c.installments || []);
    const totalScheduled = allInstallments.reduce((sum, inst) => sum + (parseFloat(inst.value) || 0), 0);

    const difference = totalScheduled - totalSale;

    // Totals by type
    const totalCreditCard = (formData.financial_conditions || [])
        .filter(c => c.type === 'credit_card')
        .flatMap(c => c.installments || [])
        .reduce((sum, inst) => sum + (parseFloat(inst.value) || 0), 0);

    const totalFinancing = (formData.financial_conditions || [])
        .filter(c => c.type === 'financing')
        .flatMap(c => c.installments || [])
        .reduce((sum, inst) => sum + (parseFloat(inst.value) || 0), 0);

    const addCondition = () => {
        const newCondition = {
            id: crypto.randomUUID(),
            type: 'pix',
            installments_count: 1,
            installments: []
        };
        setFormData({
            ...formData,
            financial_conditions: [...(formData.financial_conditions || []), newCondition]
        });
    };

    const removeCondition = (index) => {
        const newConditions = [...(formData.financial_conditions || [])];
        newConditions.splice(index, 1);
        setFormData({ ...formData, financial_conditions: newConditions });
    };

    const updateCondition = (index, field, value) => {
        const newConditions = [...(formData.financial_conditions || [])];
        newConditions[index] = { ...newConditions[index], [field]: value };
        setFormData({ ...formData, financial_conditions: newConditions });
    };

    const generateInstallments = (index) => {
        const conditions = [...(formData.financial_conditions || [])];
        const condition = conditions[index];
        const count = parseInt(condition.installments_count) || 1;

        // Simple logic: If it's the only condition or first one, try to use remaining value
        // But for multiple conditions, user might want to specify.
        // Let's create empty installments with 0 value or distributed value if total sale is set?

        // Calculate already allocated in OTHER conditions
        const allocatedOther = conditions.reduce((sum, c, i) => {
            if (i === index) return sum;
            return sum + (c.installments || []).reduce((instSum, inst) => instSum + (parseFloat(inst.value) || 0), 0);
        }, 0);

        const remaining = Math.max(0, totalSale - allocatedOther);
        const valuePerInstallment = count > 0 ? remaining / count : 0;
        const roundedValue = Math.floor(valuePerInstallment * 100) / 100;

        const newInstallments = Array.from({ length: count }).map((_, i) => ({
            number: i + 1,
            date: '',
            value: i === count - 1 ? (remaining - (roundedValue * (count - 1))).toFixed(2) : roundedValue.toFixed(2),
            confirmed: false,
            proof_file_url: ''
        }));

        conditions[index].installments = newInstallments;
        setFormData({ ...formData, financial_conditions: conditions });
    };

    const updateInstallment = (condIndex, instIndex, field, value) => {
        const conditions = [...(formData.financial_conditions || [])];
        conditions[condIndex].installments[instIndex][field] = value;

        // Auto-calculate dates if updating the first installment's date
        if (instIndex === 0 && field === 'date' && value) {
            const startDate = new Date(value + 'T12:00:00'); // Use noon to avoid timezone issues

            for (let i = 1; i < conditions[condIndex].installments.length; i++) {
                const nextDate = new Date(startDate);
                nextDate.setMonth(startDate.getMonth() + i);

                // Handle edge cases like Jan 31 -> Feb 28
                // If the day changed (e.g., 31 -> 1), go back to last day of previous month
                if (nextDate.getDate() !== startDate.getDate()) {
                    nextDate.setDate(0);
                }

                conditions[condIndex].installments[i].date = nextDate.toISOString().split('T')[0];
            }
        }

        setFormData({ ...formData, financial_conditions: conditions });
    };

    const handleUploadProof = async (file, condIndex, instIndex) => {
        if (!file) return;

        setUploadingInfo({ conditionId: condIndex, installmentIndex: instIndex, loading: true });
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('folder', 'financial_proofs');

            const response = await api.post('/upload', formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${getToken()}`
                }
            });

            const conditions = [...(formData.financial_conditions || [])];
            conditions[condIndex].installments[instIndex].proof_file_url = response.data.url;
            setFormData({ ...formData, financial_conditions: conditions });
        } catch (error) {
            console.error('Upload failed', error);
            // alert('Erro no upload'); // Use a callback or improved UI for error
        } finally {
            setUploadingInfo({ conditionId: null, installmentIndex: null, loading: false });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header / Total Sale */}
            <div className="bg-[#005f8f] dark:bg-blue-900 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-6 w-6 text-yellow-400" />
                    <h2 className="text-xl font-bold">Financeiro</h2>
                    <span className="text-xs bg-blue-700/50 px-2 py-1 rounded-full">Condições de pagamento da usina</span>
                </div>

                <p className="text-blue-100 text-sm mb-4">
                    Informe o valor total da venda e depois distribua esse valor nas formas de pagamento.
                </p>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-blue-50">
                        Valor total da venda (R$)
                    </label>

                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                            <input
                                type="number"
                                value={formData.sale_total_value}
                                onChange={(e) => setFormData({ ...formData, sale_total_value: e.target.value })}
                                className="w-full bg-white border border-blue-200 rounded-lg px-4 py-3 text-2xl font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all placeholder-gray-300 shadow-sm"
                                placeholder="0.00"
                            />
                            <p className="text-xs mt-2 text-blue-100/80 font-medium">
                                O somatório das parcelas deve bater com este valor.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addCondition}
                            className="bg-[#00c853] hover:bg-[#00a844] text-white px-6 py-4 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-green-900/20 active:scale-95 whitespace-nowrap h-[58px]"
                        >
                            <Plus className="h-5 w-5" />
                            Adicionar condição
                        </button>
                    </div>
                </div>
            </div>

            {/* Conditions List */}
            <div className="space-y-4">
                {(formData.financial_conditions || []).map((condition, condIndex) => (
                    <div key={condition.id || condIndex} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white">Condição de pagamento {condIndex + 1}</h3>
                                        {condition.type && (
                                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full capitalize">
                                                {condition.type === 'credit_card' ? 'Cartão de Crédito' : condition.type === 'financing' ? 'Financiamento' : 'Pix / Depósito'}
                                            </span>
                                        )}
                                    </div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Forma de pagamento</label>
                                    <select
                                        value={condition.type}
                                        onChange={(e) => updateCondition(condIndex, 'type', e.target.value)}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 p-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    >
                                        <option value="pix">Pix / Depósito</option>
                                        <option value="credit_card">Cartão de Crédito</option>
                                        <option value="financing">Financiamento</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 mt-7">Quantidade de parcelas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={condition.installments_count}
                                        onChange={(e) => updateCondition(condIndex, 'installments_count', e.target.value)}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 p-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeCondition(condIndex)}
                                className="text-red-400 hover:text-red-600 p-2"
                                title="Remover condição"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Installments Area */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    <Calendar className="h-4 w-4" />
                                    Parcelas e datas de recebimento
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => generateInstallments(condIndex)}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                                >
                                    Gerar/atualizar parcelas automaticamente
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(condition.installments || []).map((inst, instIndex) => (
                                    <div key={instIndex} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div className="md:col-span-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Parcela {inst.number}
                                        </div>

                                        <div className="md:col-span-3">
                                            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Data</span>
                                                <input
                                                    type="date"
                                                    value={inst.date}
                                                    onChange={(e) => updateInstallment(condIndex, instIndex, 'date', e.target.value)}
                                                    className="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 text-gray-900 dark:text-gray-100 font-medium placeholder-gray-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-3">
                                            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">R$</span>
                                                <input
                                                    type="number"
                                                    value={inst.value}
                                                    onChange={(e) => updateInstallment(condIndex, instIndex, 'value', e.target.value)}
                                                    className="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 text-gray-900 dark:text-gray-100 font-medium placeholder-gray-400"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 flex justify-center">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={inst.confirmed}
                                                    onChange={(e) => updateInstallment(condIndex, instIndex, 'confirmed', e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Pago</span>
                                            </label>
                                        </div>

                                        <div className="md:col-span-3">
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => handleUploadProof(e.target.files?.[0], condIndex, instIndex)}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                />
                                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${inst.proof_file_url ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                                                    <span className={`text-xs truncate max-w-[100px] ${inst.proof_file_url ? 'text-green-700' : 'text-gray-500'}`}>
                                                        {uploadingInfo.loading && uploadingInfo.conditionId === condIndex && uploadingInfo.installmentIndex === instIndex
                                                            ? 'Enviando...'
                                                            : inst.proof_file_url
                                                                ? 'Comprovante OK'
                                                                : 'Escolher arquivo'}
                                                    </span>
                                                    {inst.proof_file_url ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Upload className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                            {inst.proof_file_url && (
                                                <a href={inst.proof_file_url} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-end text-blue-500 hover:underline mt-1">
                                                    Ver comprovante
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(condition.installments || []).length === 0 && (
                                    <p className="text-center text-sm text-gray-400 py-4 italic">
                                        Nenhuma parcela gerada ainda. Clique em "Gerar/atualizar parcelas" ou adicione manually.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Financial Summary */}
            <div className="bg-[#0f172a] dark:bg-black rounded-xl p-6 text-white shadow-lg border border-gray-800">
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-xl">📊</span>
                    <h3 className="text-lg font-bold">Resumo financeiro do contrato</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between h-full">
                        <span className="text-xs text-blue-200 block mb-1 min-h-[32px] flex items-end pb-1 border-b border-white/5">Valor da venda</span>
                        <span className="text-lg font-bold text-white block mt-2">{formatCurrency(totalSale)}</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between h-full">
                        <span className="text-xs text-blue-200 block mb-1 min-h-[32px] flex items-end pb-1 border-b border-white/5">Total a receber (lançamentos)</span>
                        <span className="text-lg font-bold text-white block mt-2">{formatCurrency(totalScheduled)}</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between h-full">
                        <span className="text-xs text-blue-200 block mb-1 min-h-[32px] flex items-end pb-1 border-b border-white/5">Diferença (lançamentos - venda)</span>
                        <span className={`text-lg font-bold block mt-2 ${Math.abs(difference) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(difference)}
                        </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between h-full">
                        <span className="text-xs text-blue-200 block mb-1 min-h-[32px] flex items-end pb-1 border-b border-white/5">Total via cartão de crédito</span>
                        <span className="text-lg font-bold text-white block mt-2">{formatCurrency(totalCreditCard)}</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-between h-full">
                        <span className="text-xs text-blue-200 block mb-1 min-h-[32px] flex items-end pb-1 border-b border-white/5">Total via financiamento</span>
                        <span className="text-lg font-bold text-white block mt-2">{formatCurrency(totalFinancing)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
