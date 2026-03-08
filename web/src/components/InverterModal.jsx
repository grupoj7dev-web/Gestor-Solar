import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Eye, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { parameterDefinitions } from '../lib/parameterDefinitions';

export function InverterModal({ inverter, onClose }) {
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [formData, setFormData] = useState({
        marca: '',
        modelo: '',
        potencia_nominal: '',
        tipo: 'String',
        fases: 'Monofásico',
        tensao: '220V',
        afci_integrado: false,
        nomenclature_config: {
            showTipo: true,
            showPotencia: true,
            showFases: true,
            showTensao: false,
            showMarca: true,
            showAfci: false
        }
    });

    const [parameters, setParameters] = useState([]);
    const [globalRules, setGlobalRules] = useState([]);

    useEffect(() => {
        if (inverter) {
            setFormData({
                marca: inverter.marca || '',
                modelo: inverter.modelo || '',
                potencia_nominal: inverter.potencia_nominal || '',
                tipo: inverter.tipo || 'String',
                fases: inverter.fases || 'Monofásico',
                tensao: inverter.tensao || '220V',
                afci_integrado: inverter.afci_integrado || false,
                nomenclature_config: inverter.nomenclature_config || {
                    showTipo: true,
                    showPotencia: true,
                    showFases: true,
                    showTensao: false,
                    showMarca: true,
                    showAfci: false
                }
            });
            fetchInverterParameters(inverter.id);
        }
        fetchGlobalRules();
    }, [inverter]);

    const fetchGlobalRules = async () => {
        try {
            const response = await api.get('/rules');
            setGlobalRules(response.data);
        } catch (error) {
            console.error('Error fetching global rules:', error);
        }
    };

    const fetchInverterParameters = async (inverterId) => {
        try {
            const response = await api.get(`/inverters/${inverterId}/parameters`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setParameters(response.data);
        } catch (error) {
            console.error('Error fetching parameters:', error);
        }
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.marca || !formData.modelo || !formData.potencia_nominal) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        setLoading(true);

        try {
            if (inverter) {
                // Update
                await api.put(`/inverters/${inverter.id}`, formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            } else {
                // Create
                const response = await api.post('/inverters', formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });

                // Add global parameters to new inverter
                const inverterId = response.data.id;
                for (const rule of globalRules) {
                    await api.post(`/inverters/${inverterId}/parameters`, {
                        parameter_id: rule.parameter,
                        parameter_name: rule.name,
                        operator: rule.operator,
                        value: rule.value,
                        severity: rule.severity,
                        is_global: true
                    }, {
                        headers: { Authorization: `Bearer ${getToken()}` }
                    });
                }
            }

            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar inversor');
        } finally {
            setLoading(false);
        }
    };

    const generatePreview = () => {
        const config = formData.nomenclature_config;
        const parts = [];

        if (config.showTipo && formData.tipo) parts.push(`Inversor ${formData.tipo}`);
        if (config.showPotencia && formData.potencia_nominal) parts.push(`${formData.potencia_nominal}kW`);
        if (config.showFases && formData.fases) parts.push(formData.fases);
        if (config.showTensao && formData.tensao) parts.push(formData.tensao);
        if (config.showMarca && formData.marca) parts.push(formData.marca);
        if (config.showAfci && formData.afci_integrado) parts.push('AFCI Integrado');

        return parts.length > 0 ? parts.join(' - ') : 'Preencha os dados para visualizar';
    };

    const tabs = ['Dados Básicos', 'Nomenclatura', 'Parâmetros'];

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-100">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {inverter ? 'Editar Inversor' : 'Novo Inversor'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">Configure os dados técnicos do equipamento</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        {tabs.map((tab, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTab(index)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === index
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Tab 1: Dados Básicos */}
                    {activeTab === 0 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Marca *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.marca}
                                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none text-sm"
                                        placeholder="Ex: Growatt, Fronius"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Modelo *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.modelo}
                                        onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none text-sm"
                                        placeholder="Ex: MIN 3000TL-X"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Potência Nominal (kW) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.potencia_nominal}
                                        onChange={(e) => setFormData({ ...formData, potencia_nominal: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none text-sm"
                                        placeholder="Ex: 3.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Tipo *
                                    </label>
                                    <select
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none text-sm"
                                    >
                                        <option value="String">String</option>
                                        <option value="Microinversor">Microinversor</option>
                                        <option value="Central">Central</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Fases *
                                    </label>
                                    <select
                                        value={formData.fases}
                                        onChange={(e) => setFormData({ ...formData, fases: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none text-sm"
                                    >
                                        <option value="Monofásico">Monofásico</option>
                                        <option value="Bifásico">Bifásico</option>
                                        <option value="Trifásico">Trifásico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Tensão
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tensao}
                                        onChange={(e) => setFormData({ ...formData, tensao: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none text-sm"
                                        placeholder="Ex: 220V, 380V"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.afci_integrado}
                                        onChange={(e) => setFormData({ ...formData, afci_integrado: e.target.checked })}
                                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-200"
                                    />
                                    <span className="text-sm font-medium text-gray-700">AFCI Integrado</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Nomenclatura */}
                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    Configure quais elementos aparecerão no nome do produto:
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { key: 'showTipo', label: 'Mostrar Tipo', desc: 'Incluir "Inversor" no nome do produto' },
                                        { key: 'showPotencia', label: 'Mostrar Potência', desc: 'Incluir potência (ex: 10kW) no nome do produto' },
                                        { key: 'showFases', label: 'Mostrar Fases', desc: 'Incluir tipo de fases (Monofásico/Trifásico) no nome' },
                                        { key: 'showTensao', label: 'Mostrar Tensão', desc: 'Incluir tensão (220V/380V) no nome do produto' },
                                        { key: 'showMarca', label: 'Mostrar Marca', desc: 'Incluir marca no nome do produto' },
                                        { key: 'showAfci', label: 'AFCI Integrado', desc: 'Incluir "AFCI Integrado" no nome quando habilitado' }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div>
                                                <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                                                <div className="text-xs text-gray-500">{item.desc}</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.nomenclature_config[item.key]}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        nomenclature_config: {
                                                            ...formData.nomenclature_config,
                                                            [item.key]: e.target.checked
                                                        }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="h-4 w-4 text-purple-600" />
                                    <h4 className="font-semibold text-purple-900 text-sm">Pré-visualização</h4>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-purple-100">
                                    <p className="text-sm font-medium text-gray-900">{generatePreview()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Parâmetros */}
                    {activeTab === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    Parâmetros Vinculados
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    Parâmetros globais são aplicados automaticamente. Você pode adicionar parâmetros específicos para este modelo.
                                </p>

                                {globalRules.length === 0 && parameters.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500">Nenhum parâmetro configurado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {globalRules.map((rule) => {
                                            const paramDef = parameterDefinitions.find(p => p.value === rule.parameter);
                                            const Icon = paramDef?.icon;

                                            return (
                                                <div key={rule.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {Icon && <Icon className="h-4 w-4 text-blue-600" />}
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {paramDef?.label} {rule.operator} {rule.value} {paramDef?.unit}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                                                        Global
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {parameters.filter(p => !p.is_global).map((param) => (
                                            <div key={param.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{param.parameter_name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {param.operator} {param.value}
                                                    </div>
                                                </div>
                                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-medium">
                                                    Específico
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Salvar Inversor
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
