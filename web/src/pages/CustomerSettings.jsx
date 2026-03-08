import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Zap, Settings, ChevronDown, ChevronUp, AlertCircle, Activity, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { api } from '../lib/api';
import { parameterDefinitions } from '../lib/parameterDefinitions';
import { useNotification } from '../contexts/NotificationContext';

export function CustomerSettings() {
    const { customer } = useOutletContext();
    const [inverters, setInverters] = useState([]);
    const [parameters, setParameters] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedInverters, setExpandedInverters] = useState({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedInverterId, setSelectedInverterId] = useState(null);
    const { success, error: notifyError, confirm } = useNotification();
    const [newParameter, setNewParameter] = useState({
        parameter_id: '',
        parameter_name: '',
        operator: '<',
        value: '',
        severity: 'medium'
    });

    useEffect(() => {
        if (customer?.id) {
            fetchInvertersAndParameters();
        }
    }, [customer]);

    const fetchInvertersAndParameters = async () => {
        try {
            const invertersResponse = await api.get(`/customers/${customer.id}`);
            const customerInverters = invertersResponse.data.inverters || [];

            const flattenedInverters = customerInverters.map(ci => ci.inverter || ci).filter(inv => inv && inv.id);
            setInverters(flattenedInverters);

            const parametersData = {};
            for (const inverter of flattenedInverters) {
                try {
                    const paramsResponse = await api.get(`/inverters/${inverter.id}/parameters`);
                    parametersData[inverter.id] = paramsResponse.data || [];
                } catch (error) {
                    console.error(`Error fetching parameters for inverter ${inverter.id}:`, error);
                    parametersData[inverter.id] = [];
                }
            }
            setParameters(parametersData);
        } catch (error) {
            console.error('Error fetching inverters:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleInverter = (inverterId) => {
        setExpandedInverters(prev => ({
            ...prev,
            [inverterId]: !prev[inverterId]
        }));
    };

    const openAddModal = (inverterId) => {
        setSelectedInverterId(inverterId);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setSelectedInverterId(null);
        setNewParameter({
            parameter_id: '',
            parameter_name: '',
            operator: '<',
            value: '',
            severity: 'medium'
        });
    };

    const handleAddParameter = async () => {
        try {
            await api.post(`/inverters/${selectedInverterId}/parameters`, newParameter);
            await fetchInvertersAndParameters();
            closeAddModal();
            success('Parametro adicionado com sucesso.');
        } catch (error) {
            console.error('Error adding parameter:', error);
            notifyError('Erro ao adicionar parametro.');
        }
    };

    const handleDeleteParameter = async (inverterId, paramId) => {
        const approved = await confirm('Tem certeza que deseja excluir este parametro?');
        if (!approved) return;

        try {
            await api.delete(`/inverters/${inverterId}/parameters/${paramId}`);
            await fetchInvertersAndParameters();
            success('Parametro removido com sucesso.');
        } catch (error) {
            console.error('Error deleting parameter:', error);
            notifyError('Erro ao excluir parametro.');
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Parmetros da Planta</h1>
                <p className="text-gray-500 mt-1 text-sm">Inversores cadastrados e seus parmetros configurados</p>
            </div>

            {inverters.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-6">
                        <Zap className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum inversor cadastrado</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Este cliente ainda no possui inversores cadastrados no sistema.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {inverters.map((inverter) => {
                        const isExpanded = expandedInverters[inverter.id];
                        const inverterParams = parameters[inverter.id] || [];
                        const hasParameters = inverterParams.length > 0;

                        return (
                            <div
                                key={inverter.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
                            >
                                {/* Inverter Header */}
                                <div className="p-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
                                    <button
                                        onClick={() => toggleInverter(inverter.id)}
                                        className="flex-1 flex items-center gap-4 text-left"
                                    >
                                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                            <Zap className="h-7 w-7 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {inverter.marca} {inverter.modelo}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-sm text-gray-600">
                                                    {inverter.potencia_nominal}kW  {inverter.tipo}  {inverter.fases} fases
                                                </span>
                                                {inverter.device_sn && (
                                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                        SN: {inverter.device_sn}
                                                    </span>
                                                )}
                                            </div>
                                            {hasParameters && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mt-2">
                                                    <Activity className="h-3 w-3" />
                                                    {inverterParams.length} parmetro{inverterParams.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openAddModal(inverter.id)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Adicionar
                                        </button>
                                        <button
                                            onClick={() => toggleInverter(inverter.id)}
                                            className="p-2 hover:bg-white rounded-lg transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-5 w-5 text-gray-600" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Parameters List */}
                                {isExpanded && (
                                    <div className="bg-gray-50">
                                        {hasParameters ? (
                                            <div className="p-6 space-y-3">
                                                {inverterParams.map((param) => {
                                                    const paramDef = parameterDefinitions.find(p => p.value === param.parameter_id);

                                                    return (
                                                        <div
                                                            key={param.id}
                                                            className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-all group"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        {paramDef?.icon && <paramDef.icon className="h-5 w-5 text-gray-400" />}
                                                                        <h4 className="font-semibold text-gray-900">
                                                                            {param.parameter_name}
                                                                        </h4>
                                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getSeverityColor(param.severity)}`}>
                                                                            {param.severity === 'high' ? 'Alta' : param.severity === 'medium' ? 'Mdia' : 'Baixa'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-sm">
                                                                        <span className="text-gray-500">Condio:</span>
                                                                        <div className="flex items-center gap-2 font-mono font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                                                                            <span>{param.operator}</span>
                                                                            <span>{param.value}</span>
                                                                            {paramDef?.unit && <span className="text-xs text-blue-400">{paramDef.unit}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteParameter(inverter.id, param.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Excluir parmetro"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center">
                                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                                    <AlertCircle className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    Nenhum parmetro configurado para este inversor
                                                </p>
                                                <button
                                                    onClick={() => openAddModal(inverter.id)}
                                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                >
                                                    Adicionar primeiro parmetro
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Parameter Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Adicionar Parmetro</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Configure um novo parmetro de monitoramento</p>
                            </div>
                            <button
                                onClick={closeAddModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Parmetro</label>
                                <select
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm"
                                    value={newParameter.parameter_id}
                                    onChange={e => {
                                        const param = parameterDefinitions.find(p => p.value === e.target.value);
                                        setNewParameter({
                                            ...newParameter,
                                            parameter_id: e.target.value,
                                            parameter_name: param?.label || ''
                                        });
                                    }}
                                >
                                    <option value="">Selecione um parmetro...</option>
                                    {parameterDefinitions.map(param => (
                                        <option key={param.value} value={param.value}>
                                            {param.label} ({param.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Operador</label>
                                    <select
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm font-mono"
                                        value={newParameter.operator}
                                        onChange={e => setNewParameter({ ...newParameter, operator: e.target.value })}
                                    >
                                        <option value="<">&lt; (Menor que)</option>
                                        <option value=">">&gt; (Maior que)</option>
                                        <option value="=">=  (Igual a)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Valor</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm font-mono"
                                        placeholder="0.00"
                                        value={newParameter.value}
                                        onChange={e => setNewParameter({ ...newParameter, value: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Prioridade</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'low', label: 'Baixa', color: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700' },
                                        { value: 'medium', label: 'Mdia', color: 'hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700' },
                                        { value: 'high', label: 'Alta', color: 'hover:bg-red-50 hover:border-red-200 hover:text-red-700' }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setNewParameter({ ...newParameter, severity: option.value })}
                                            className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${newParameter.severity === option.value
                                                    ? option.value === 'high' ? 'bg-red-100 border-red-200 text-red-800 ring-1 ring-red-200' :
                                                        option.value === 'medium' ? 'bg-yellow-100 border-yellow-200 text-yellow-800 ring-1 ring-yellow-200' :
                                                            'bg-blue-100 border-blue-200 text-blue-800 ring-1 ring-blue-200'
                                                    : 'bg-white border-gray-200 text-gray-600 ' + option.color
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleAddParameter}
                                disabled={!newParameter.parameter_id || !newParameter.value}
                                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="h-5 w-5" />
                                Salvar Parmetro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


