import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Zap, Sun, Plus, Search, X, Save } from 'lucide-react';

export function CustomerKit({ formData, setFormData }) {
    const { getToken } = useAuth();
    const { success, error: notifyError, warning } = useNotification();
    const [inverters, setInverters] = useState([]);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'inverter' or 'module'
    const [saving, setSaving] = useState(false);
    const [newInverter, setNewInverter] = useState({
        marca: '',
        modelo: '',
        potencia_nominal: '',
        tipo: 'String'
    });
    const [newModule, setNewModule] = useState({
        brand: '',
        model: '',
        power: ''
    });

    // Initial load
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [invRes, modRes] = await Promise.all([
                    api.get('/inverters', { headers: { Authorization: `Bearer ${getToken()}` } }),
                    api.get('/modules', { headers: { Authorization: `Bearer ${getToken()}` } })
                ]);

                console.log('Fetched inverters:', invRes.data);

                // Use only API data
                setInverters(invRes.data || []);
                setModules(modRes.data || []);
            } catch (error) {
                console.error('Error fetching kit data:', error);
                // Don't clear to empty if there's an error, or handle gracefully
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [getToken]);

    // Save new inverter
    const handleSaveInverter = async () => {
        if (!newInverter.marca || !newInverter.modelo || !newInverter.potencia_nominal) {
            warning('Preencha todos os campos obrigatorios.');
            return;
        }

        setSaving(true);
        try {
            const inverterData = {
                ...newInverter,
                fases: 1, // Default value
                tensao: 220 // Default value
            };

            const response = await api.post('/inverters', inverterData, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            // Add to local list
            setInverters([...inverters, response.data]);

            // Reset form and close modal
            setNewInverter({ marca: '', modelo: '', potencia_nominal: '', tipo: 'String' });
            setShowModal(false);
            success('Inversor cadastrado com sucesso.');
        } catch (error) {
            console.error('Error saving inverter:', error);
            notifyError('Erro ao cadastrar inversor: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    // Save new module
    const handleSaveModule = async () => {
        if (!newModule.brand || !newModule.model || !newModule.power) {
            warning('Preencha todos os campos obrigatorios.');
            return;
        }

        setSaving(true);
        try {
            console.log('Sending module data:', newModule);
            const response = await api.post('/modules', newModule, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            // Add to local list
            setModules([...modules, response.data]);

            // Reset form and close modal
            setNewModule({ brand: '', model: '', power: '' });
            setShowModal(false);
            success('Modulo cadastrado com sucesso.');
        } catch (error) {
            console.error('Error saving module:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url
            });
            notifyError('Erro ao cadastrar modulo: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    // Helpers to access kit_details safely
    const kit = formData.kit_details || {
        inverter1: {},
        inverter2: {},
        modules: {}
    };

    const updateKit = (field, value) => {
        setFormData(prevFormData => ({
            ...prevFormData,
            kit_details: {
                ...(prevFormData.kit_details || {}),
                [field]: value
            }
        }));
    };

    const updateSubField = (section, field, value) => {
        setFormData(prevFormData => {
            const prevKit = prevFormData.kit_details || {
                inverter1: {},
                inverter2: {},
                modules: {}
            };
            const newKitDetails = {
                ...prevKit,
                [section]: {
                    ...(prevKit[section] || {}),
                    [field]: value
                }
            };
            return {
                ...prevFormData,
                kit_details: newKitDetails
            };
        });
    };

    // Filter Logic
    const getUniqueBrands = (list) => [...new Set(list.map(i => i.brand || i.marca))].sort();
    const getModelsByBrand = (list, brand) => list.filter(i => (i.brand || i.marca) === brand);
    const getPowerByModel = (list, model) => list.find(i => (i.model || i.modelo) === model)?.power || list.find(i => (i.model || i.modelo) === model)?.potencia_nominal;

    // Component for Inverter Selection
    const InverterSection = ({ sectionKey, title }) => {
        const data = kit[sectionKey] || {};

        // Filter brands based on selected type
        const filteredInverters = data.type
            ? inverters.filter(i => i.tipo?.toLowerCase().includes(data.type.toLowerCase()))
            : inverters;

        const brands = [...new Set(filteredInverters.map(i => i.marca))].filter(Boolean).sort();

        // Filter models based on selected brand and type
        const models = data.brand
            ? filteredInverters.filter(i => i.marca === data.brand)
            : [];

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Type Selection */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Tipo de Inversor *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                style={{ borderColor: data.type === 'string' ? '#3b82f6' : '#d1d5db' }}>
                                <input
                                    type="radio"
                                    name={`${sectionKey}_type`}
                                    checked={data.type === 'string'}
                                    onChange={() => {
                                        updateSubField(sectionKey, 'type', 'string');
                                        updateSubField(sectionKey, 'brand', '');
                                        updateSubField(sectionKey, 'model', '');
                                        updateSubField(sectionKey, 'power', '');
                                    }}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">String</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                style={{ borderColor: data.type === 'micro' ? '#a855f7' : '#d1d5db' }}>
                                <input
                                    type="radio"
                                    name={`${sectionKey}_type`}
                                    checked={data.type === 'micro'}
                                    onChange={() => {
                                        updateSubField(sectionKey, 'type', 'micro');
                                        updateSubField(sectionKey, 'brand', '');
                                        updateSubField(sectionKey, 'model', '');
                                        updateSubField(sectionKey, 'power', '');
                                    }}
                                    className="text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Micro Inversor</span>
                            </label>
                        </div>
                    </div>

                    {/* Brand */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Marca {data.type && '*'}
                            </label>
                            {data.type && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalType('inverter');
                                        setNewInverter({ ...newInverter, tipo: data.type === 'string' ? 'String' : 'Microinversor' });
                                        setShowModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                    title="Cadastrar novo inversor"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <select
                            value={data.brand || ''}
                            onChange={(e) => {
                                updateSubField(sectionKey, 'brand', e.target.value);
                                updateSubField(sectionKey, 'model', ''); // Reset model
                                updateSubField(sectionKey, 'power', ''); // Reset power
                            }}
                            disabled={!data.type}
                            className={`w-full rounded-lg border-2 p-2.5 text-sm ${!data.type
                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500'
                                }`}
                        >
                            <option value="">{!data.type ? 'Selecione o tipo primeiro' : 'Selecione a marca'}</option>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    {/* Model/Power */}
                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Potncia / Modelo</label>
                        <select
                            value={data.model || ''}
                            onChange={(e) => {
                                const m = inverters.find(i => i.modelo === e.target.value);
                                updateSubField(sectionKey, 'model', e.target.value);
                                updateSubField(sectionKey, 'power', m?.potencia_nominal);
                            }}
                            className={`w-full rounded-lg border-2 p-2.5 text-sm transition-colors ${!data.brand
                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500'
                                }`}
                            disabled={!data.brand}
                        >
                            <option value="">
                                {!data.brand ? 'Selecione a marca primeiro' : 'Selecione o modelo'}
                            </option>
                            {models.map((m, idx) => (
                                <option key={m.id || idx} value={m.modelo}>
                                    {m.potencia_nominal} kW - {m.modelo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Qty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
                        <input
                            type="number"
                            min="1"
                            value={data.qty || ''}
                            onChange={(e) => updateSubField(sectionKey, 'qty', e.target.value)}
                            className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Component for Modules
    const ModuleSection = () => {
        const data = kit.modules || {};
        const brands = [...new Set(modules.map(m => m.brand))].sort();
        const availableModules = data.brand ? modules.filter(m => m.brand === data.brand) : [];

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <Sun className="h-5 w-5 text-orange-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white">Mdulos Fotovoltaicos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Marca</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setModalType('module');
                                    setShowModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="Cadastrar novo mdulo"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <select
                            value={data.brand || ''}
                            onChange={(e) => {
                                updateSubField('modules', 'brand', e.target.value);
                                updateSubField('modules', 'model', '');
                            }}
                            className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Selecione a marca</option>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    {/* Power/Model */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Potncia / Modelo</label>
                        <select
                            value={data.model || ''}
                            onChange={(e) => {
                                const m = modules.find(mod => mod.model === e.target.value);
                                updateSubField('modules', 'model', e.target.value);
                                updateSubField('modules', 'power', m?.power);
                            }}
                            className={`w-full rounded-lg border-2 p-2.5 text-sm transition-colors ${!data.brand
                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500'
                                }`}
                            disabled={!data.brand}
                        >
                            <option value="">
                                {!data.brand ? 'Selecione a marca primeiro' : 'Selecione o modelo'}
                            </option>
                            {availableModules.map((m, idx) => (
                                <option key={m.id || idx} value={m.model}>
                                    {m.power} - {m.model}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Qty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
                        <input
                            type="number"
                            min="1"
                            value={data.qty || ''}
                            onChange={(e) => updateSubField('modules', 'qty', e.target.value)}
                            className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="grid grid-cols-1 gap-6">
                <InverterSection sectionKey="inverter1" title="Inversor 1" />

                {kit.has_inverter2 ? (
                    <div className="relative">
                        <InverterSection sectionKey="inverter2" title="Inversor 2" />
                        <button
                            onClick={() => updateKit('has_inverter2', false)}
                            className="absolute top-6 right-6 text-red-500 hover:text-red-700 text-sm"
                        >
                            Remover
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => updateKit('has_inverter2', true)}
                        className="flex items-center gap-2 text-blue-600 font-medium hover:underline p-2"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Inversor 2
                    </button>
                )}

                <ModuleSection />
            </div>

            {/* Modal for adding new inverter/module */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {modalType === 'inverter' ? 'Cadastrar Inversor' : 'Cadastrar Mdulo'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {modalType === 'inverter' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Tipo *</label>
                                    <input
                                        type="text"
                                        value={newInverter.tipo}
                                        disabled
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Marca *</label>
                                    <input
                                        type="text"
                                        value={newInverter.marca}
                                        onChange={(e) => setNewInverter({ ...newInverter, marca: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Ex: Deye, Growatt"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Modelo *</label>
                                    <input
                                        type="text"
                                        value={newInverter.modelo}
                                        onChange={(e) => setNewInverter({ ...newInverter, modelo: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Ex: SUN-5K-G05"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Potncia (kW) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={newInverter.potencia_nominal}
                                        onChange={(e) => setNewInverter({ ...newInverter, potencia_nominal: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Ex: 5"
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveInverter}
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Salvar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Marca *</label>
                                    <input
                                        type="text"
                                        value={newModule.brand}
                                        onChange={(e) => setNewModule({ ...newModule, brand: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Ex: Canadian Solar"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Modelo *</label>
                                    <input
                                        type="text"
                                        value={newModule.model}
                                        onChange={(e) => setNewModule({ ...newModule, model: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Ex: CS3W-550MS"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Potncia *</label>
                                    <input
                                        type="text"
                                        value={newModule.power}
                                        onChange={(e) => setNewModule({ ...newModule, power: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Ex: 550W"
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveModule}
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Salvar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


