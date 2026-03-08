import React, { useState } from 'react';
import { Plus, Trash2, Zap, Share2, Upload, FileText, Building, Loader2 } from 'lucide-react';

const UnitList = ({ units, onChange, onUpload }) => {
    const [uploadingIndex, setUploadingIndex] = useState(null);

    const handleAdd = () => {
        onChange([
            ...units,
            {
                unit_number: '',
                is_primary: false,
                unit_type: 'geradora', // Default
                generation_kwh_month: '',
                plant_power_kwp: '',
                expected_rateio_kwh_month: '',
                bill_file_url: ''
            }
        ]);
    };

    const handleRemove = (index) => {
        const newUnits = [...units];
        newUnits.splice(index, 1);
        onChange(newUnits);
    };

    const handleChange = (index, field, value) => {
        const newUnits = [...units];
        newUnits[index] = { ...newUnits[index], [field]: value };
        onChange(newUnits);
    };

    const handleSetPrimary = (index) => {
        const newUnits = units.map((u, i) => ({
            ...u,
            is_primary: i === index
        }));
        onChange(newUnits);
    };

    const handleFileUpload = async (index, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingIndex(index);
            const url = await onUpload(file);
            if (url) {
                handleChange(index, 'bill_file_url', url);
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setUploadingIndex(null);
        }
    };

    // Helper to ensure unit is treated as object even if legacy string
    const safeUnits = units.map(u =>
        typeof u === 'string'
            ? { unit_number: u, is_primary: false, unit_type: 'geradora' }
            : { ...u, unit_type: u.unit_type || 'geradora' }
    );

    return (
        <div className="space-y-4">
            {safeUnits.map((unit, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative group shadow-sm">
                    <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover unidade"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="space-y-4 mr-8">
                        {/* Unit Number & Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Número da UC *
                                </label>
                                <input
                                    type="text"
                                    value={unit.unit_number || ''}
                                    onChange={(e) => handleChange(index, 'unit_number', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: 123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo de Unidade *
                                </label>
                                <select
                                    value={unit.unit_type || 'geradora'}
                                    onChange={(e) => handleChange(index, 'unit_type', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="geradora">Geradora (Usina)</option>
                                    <option value="beneficiaria">Beneficiária (Recebe Crédito)</option>
                                </select>
                            </div>
                        </div>

                        {/* Dynamic Fields */}
                        {unit.unit_type === 'geradora' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                                        <Zap className="h-3 w-3" /> Geração Prevista (kWh/mês)
                                    </label>
                                    <input
                                        type="number"
                                        value={unit.generation_kwh_month || ''}
                                        onChange={(e) => handleChange(index, 'generation_kwh_month', e.target.value)}
                                        className="w-full rounded-lg border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                                        <Building className="h-3 w-3" /> Potência Contratada (kWp)
                                    </label>
                                    <input
                                        type="number"
                                        value={unit.plant_power_kwp || ''}
                                        onChange={(e) => handleChange(index, 'plant_power_kwp', e.target.value)}
                                        className="w-full rounded-lg border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                                    <Share2 className="h-3 w-3" /> Rateio Previsto (kWh/mês)
                                </label>
                                <input
                                    type="number"
                                    value={unit.expected_rateio_kwh_month || ''}
                                    onChange={(e) => handleChange(index, 'expected_rateio_kwh_month', e.target.value)}
                                    className="w-full rounded-lg border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-purple-500"
                                    placeholder="0.00"
                                />
                            </div>
                        )}

                        {/* File Upload & Primary Toggle */}
                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                                    {uploadingIndex === index ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                    <span className="underline decoration-dotted">
                                        {unit.bill_file_url ? 'Alterar Fatura' : 'Anexar Fatura'}
                                    </span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,image/*"
                                        onChange={(e) => handleFileUpload(index, e)}
                                        disabled={uploadingIndex === index}
                                    />
                                </label>
                                {unit.bill_file_url && (
                                    <a
                                        href={unit.bill_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200"
                                    >
                                        <FileText className="h-3 w-3" /> Ver Fatura
                                    </a>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={unit.is_primary}
                                    onChange={() => handleSetPrimary(index)}
                                    className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <span className={`text-sm font-medium ${unit.is_primary ? 'text-blue-600' : 'text-gray-500'}`}>
                                    UC da Instalação
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1"
            >
                <Plus className="h-4 w-4" />
                Adicionar Unidade
            </button>
        </div>
    );
};

export default UnitList;
