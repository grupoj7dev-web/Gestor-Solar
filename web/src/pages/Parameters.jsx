import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Trash2,
    Save,
    X,
    AlertTriangle,
    Search,
    ChevronDown,
    Settings2,
    Check
} from 'lucide-react';
import { api } from '../lib/api';
import { parameterDefinitions } from '../lib/parameterDefinitions';
import { useNotification } from '../contexts/NotificationContext';

export function Parameters() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newRule, setNewRule] = useState({
        name: '',
        parameter: '',
        operator: '<',
        value: '',
        severity: 'medium'
    });

    // Search State for Parameters
    const [paramSearch, setParamSearch] = useState('');
    const [isParamDropdownOpen, setIsParamDropdownOpen] = useState(false);
    const { error: notifyError, success, confirm } = useNotification();

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const response = await api.get('/rules');
            setRules(response.data);
        } catch (error) {
            console.error('Erro ao buscar regras:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async () => {
        try {
            await api.post('/rules', newRule);
            success('Regra criada com sucesso.');
            setIsModalOpen(false);
            setNewRule({
                name: '',
                parameter: '',
                operator: '<',
                value: '',
                severity: 'medium'
            });
            setParamSearch('');
            fetchRules();
        } catch (error) {
            console.error('Erro ao criar regra:', error);
            notifyError('Erro ao criar regra.');
        }
    };

    const handleDeleteRule = async (id) => {
        const approved = await confirm('Tem certeza que deseja excluir esta regra?');
        if (!approved) return;
        try {
            await api.delete(`/rules/${id}`);
            fetchRules();
        } catch (error) {
            console.error('Erro ao excluir regra:', error);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'bg-red-50 text-red-700 border-red-200';
            case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'high': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Alta Prioridade</span>;
            case 'medium': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Mdia Prioridade</span>;
            case 'low': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Baixa Prioridade</span>;
            default: return null;
        }
    };

    // Filter parameters based on search
    const filteredParams = useMemo(() => {
        if (!paramSearch) return parameterDefinitions;
        const lower = paramSearch.toLowerCase();
        return parameterDefinitions.filter(p =>
            p.label.toLowerCase().includes(lower) ||
            p.value.toLowerCase().includes(lower) ||
            p.category.toLowerCase().includes(lower)
        );
    }, [paramSearch]);

    const selectedParamDef = parameterDefinitions.find(p => p.value === newRule.parameter);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50 pb-12">
            <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                            <Settings2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Regras de Automao</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Configure gatilhos inteligentes para seus chamados</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 font-medium text-sm"
                    >
                        <Plus className="h-5 w-5" />
                        Nova Regra
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600"></div>
                        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Carregando configuraes...</p>
                    </div>
                ) : rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full mb-4">
                            <AlertTriangle className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nenhuma regra ativa</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm max-w-sm text-center">
                            Crie regras automticas para monitorar seus inversores e abrir chamados sem interveno manual.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 text-blue-600 font-medium text-sm hover:text-blue-700 hover:underline"
                        >
                            Criar primeira regra
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {rules.map((rule) => {
                            const paramInfo = parameterDefinitions.find(p => p.value === rule.parameter) || { label: rule.parameter, unit: '', icon: Settings2 };
                            const Icon = paramInfo.icon;

                            return (
                                <div key={rule.id} className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir regra"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`p-3 rounded-xl ${getSeverityColor(rule.severity)} bg-opacity-50`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{rule.name}</h3>
                                            <div className="mt-2">
                                                {getSeverityBadge(rule.severity)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Gatilho</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{paramInfo.label}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Condio</span>
                                            <div className="flex items-center gap-2 font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                <span>{rule.operator}</span>
                                                <span>{rule.value}</span>
                                                <span className="text-xs text-blue-400">{paramInfo.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Criao */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Regra de Automao</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Defina os critrios para abertura de chamados</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nome da Regra</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm"
                                    placeholder="Ex: Queda de Tenso Crtica"
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                />
                            </div>

                            {/* Searchable Parameter Dropdown */}
                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Parmetro Monitorado</label>
                                <button
                                    type="button"
                                    onClick={() => setIsParamDropdownOpen(!isParamDropdownOpen)}
                                    className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-left text-sm text-gray-900 dark:text-white hover:bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                                >
                                    <span className={!selectedParamDef ? 'text-gray-400' : ''}>
                                        {selectedParamDef ? (
                                            <span className="flex items-center gap-2">
                                                <selectedParamDef.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                {selectedParamDef.label}
                                                <span className="text-gray-400 text-xs">({selectedParamDef.unit})</span>
                                            </span>
                                        ) : 'Selecione um parmetro...'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </button>

                                {isParamDropdownOpen && (
                                    <div className="absolute z-10 mt-2 w-full rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg bg-gray-50 dark:bg-gray-900 border-none py-2 pl-9 pr-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-100"
                                                    placeholder="Buscar parmetro..."
                                                    value={paramSearch}
                                                    onChange={e => setParamSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto p-1">
                                            {filteredParams.map((param) => (
                                                <button
                                                    key={param.value}
                                                    onClick={() => {
                                                        setNewRule({ ...newRule, parameter: param.value });
                                                        setIsParamDropdownOpen(false);
                                                        setParamSearch('');
                                                    }}
                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors text-left group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 group-hover:bg-white dark:bg-gray-800 group-hover:text-blue-600 transition-colors">
                                                            <param.icon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{param.label}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{param.category}  {param.unit}</div>
                                                        </div>
                                                    </div>
                                                    {newRule.parameter === param.value && (
                                                        <Check className="h-4 w-4 text-blue-600" />
                                                    )}
                                                </button>
                                            ))}
                                            {filteredParams.length === 0 && (
                                                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    Nenhum parmetro encontrado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Operador</label>
                                    <select
                                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm appearance-none cursor-pointer text-center font-mono"
                                        value={newRule.operator}
                                        onChange={e => setNewRule({ ...newRule, operator: e.target.value })}
                                    >
                                        <option value="<">&lt; (Menor que)</option>
                                        <option value=">">&gt; (Maior que)</option>
                                        <option value="=">= (Igual a)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Valor Limite</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm font-mono"
                                        placeholder="0.00"
                                        value={newRule.value}
                                        onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Prioridade</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'low', label: 'Baixa', color: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700' },
                                        { value: 'medium', label: 'Mdia', color: 'hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700' },
                                        { value: 'high', label: 'Alta', color: 'hover:bg-red-50 hover:border-red-200 hover:text-red-700' }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setNewRule({ ...newRule, severity: option.value })}
                                            className={`
                                                py-2.5 px-3 rounded-xl text-sm font-medium border transition-all
                                                ${newRule.severity === option.value
                                                    ? option.value === 'high' ? 'bg-red-100 border-red-200 text-red-800 ring-1 ring-red-200' :
                                                        option.value === 'medium' ? 'bg-yellow-100 border-yellow-200 text-yellow-800 ring-1 ring-yellow-200' :
                                                            'bg-blue-100 border-blue-200 text-blue-800 ring-1 ring-blue-200'
                                                    : 'bg-white border-gray-200 text-gray-600 ' + option.color
                                                }
                                            `}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex-shrink-0">
                                <button
                                    onClick={handleAddRule}
                                    disabled={!newRule.name || !newRule.value || !newRule.parameter}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    <Save className="h-5 w-5" />
                                    Salvar Configurao
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


