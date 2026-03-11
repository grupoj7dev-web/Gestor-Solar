import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, MapPin, User, Building, Trash2,
    ChevronRight, ChevronLeft, FileText, Home, Users, Briefcase,
    DollarSign, Package, Check, Zap
} from 'lucide-react';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { InverterSelector } from '../components/InverterSelector';
import { StationSelector } from '../components/StationSelector';
import ContactList from '../components/ContactList';
import UnitList from '../components/UnitList';
import { CustomerFinancial } from '../components/CustomerFinancial';
import { CustomerKit } from '../components/CustomerKit';

export function CustomerFormWizard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingCEP, setLoadingCEP] = useState(false);
    const [error, setError] = useState('');
    const [customerType, setCustomerType] = useState('');
    const [linkedInverters, setLinkedInverters] = useState([]);
    const [linkedStations, setLinkedStations] = useState([]);
    const [uploadingContract, setUploadingContract] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [consumerUnits, setConsumerUnits] = useState([{
        unit_number: '',
        is_primary: true,
        unit_type: 'geradora',
        generation_kwh_month: '',
        plant_power_kwp: '',
        expected_rateio_kwh_month: '',
        bill_file_url: ''
    }]);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 11;

    // Step configuration
    const steps = [
        { number: 1, title: 'Tipo', icon: User },
        { number: 2, title: 'Contratante', icon: Building },
        { number: 3, title: 'Titular', icon: Home },
        { number: 4, title: 'Contatos', icon: Users },
        { number: 5, title: 'Unidades', icon: MapPin },
        { number: 6, title: 'Documentos', icon: FileText },
        { number: 7, title: 'Projetos', icon: Briefcase },
        { number: 8, title: 'Kit', icon: Package },
        { number: 9, title: 'Financeiro', icon: DollarSign },
        { number: 10, title: 'Usinas e Equipamentos', icon: Zap },
        { number: 11, title: 'Revisão', icon: Check }
    ];

    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        additional_contact_name: '',
        additional_contact_phone: '',
        additional_contact_email: '',
        cpf: '',
        rg: '',
        full_name: '',
        birth_date: '',
        cnpj: '',
        company_name: '',
        trade_name: '',
        state_registration: '',
        municipal_registration: '',
        contract_file_url: '',
        document_type: '',
        document_file_url: '',
        observations: '',
        has_different_holder: false,
        holder_type: 'pf',
        holder_name: '',
        holder_document: '',
        holder_rg: '',
        holder_state_registration: '',
        holder_email: '',
        holder_phone: '',
        holder_zip: '',
        holder_address: '',
        holder_number: '',
        holder_complement: '',
        holder_neighborhood: '',
        holder_city: '',
        holder_state: '',
        holder_relationship: '',
        holder_relationship_other: '',
        contacts: [],
        contractor_id_file_url: '',
        holder_id_file_url: '',
        plant_contract_file_url: '',
        other_documents: [],
        proxy_file_url: '',
        art_file_url: '',
        module_inmetro_file_url: '',
        inverter_datasheet_file_url: '',
        module_datasheet_file_url: '',
        generator_registration_file_url: '',
        diagram_file_url: '',
        memorial_file_url: '',
        access_request_file_url: '',
        other_project_documents: [],
        sale_total_value: '',
        financial_conditions: [],
        kit_details: {
            inverter1: {},
            inverter2: {},
            modules: {}
        }
    });

    useEffect(() => {
        if (id) {
            fetchCustomer();
        }
    }, [id]);

    const fetchCustomer = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/customers/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = response.data;
            setFormData({ ...formData, ...data });
            setCustomerType(data.customer_type || 'pf');
            setLinkedInverters(data.inverters || []);
            setLinkedStations(data.stations || []);
            if (data.consumer_units && data.consumer_units.length > 0) {
                // Ensure all units have the required fields
                setConsumerUnits(data.consumer_units.map(u => ({
                    unit_number: u.unit_number || '',
                    is_primary: u.is_primary || false,
                    unit_type: u.unit_type || 'geradora',
                    generation_kwh_month: u.generation_kwh_month || '',
                    plant_power_kwp: u.plant_power_kwp || '',
                    expected_rateio_kwh_month: u.expected_rateio_kwh_month || '',
                    bill_file_url: u.bill_file_url || ''
                })));
            } else {
                setConsumerUnits([{
                    unit_number: '',
                    is_primary: true,
                    unit_type: 'geradora',
                    generation_kwh_month: '',
                    plant_power_kwp: '',
                    expected_rateio_kwh_month: '',
                    bill_file_url: ''
                }]);
            }
        } catch (error) {
            console.error('Error fetching customer:', error);
            console.error('ID used:', id);
            console.error('Error Details:', JSON.stringify({
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            }, null, 2));
            setError('Erro ao carregar cliente');
        } finally {
            setLoading(false);
        }
    };

    // Handlers for Local Mode (New Customer)
    const handleStationAdd = (station) => {
        if (!linkedStations.some(s => s.station_id === station.station_id)) {
            setLinkedStations([...linkedStations, station]);
        }
    };

    const handleStationRemove = (stationId) => {
        setLinkedStations(linkedStations.filter(s => s.station_id !== stationId));
    };

    const handleInverterAdd = (inverter) => {
        if (!linkedInverters.some(i => i.inverter_id === inverter.inverter_id)) {
            setLinkedInverters([...linkedInverters, inverter]);
        }
    };

    const handleInverterRemove = (inverterId) => {
        setLinkedInverters(linkedInverters.filter(i => i.inverter_id !== inverterId));
    };

    // Navigation
    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => (currentStep === 1 ? customerType !== '' : true);

    // Formatting helpers
    const formatCPFDisplay = (cpf) => {
        if (!cpf) return '';
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length <= 3) return cpf;
        if (cpf.length <= 6) return cpf.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
        if (cpf.length <= 9) return cpf.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
        return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    };

    const formatCNPJDisplay = (cnpj) => {
        if (!cnpj) return '';
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length <= 2) return cnpj;
        if (cnpj.length <= 5) return cnpj.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
        if (cnpj.length <= 8) return cnpj.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
        if (cnpj.length <= 12) return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    };

    const formatPhoneDisplay = (phone) => {
        if (!phone) return '';
        phone = phone.replace(/\D/g, '');
        if (phone.length <= 2) return phone;
        if (phone.length <= 6) return phone.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
        if (phone.length <= 10) return phone.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        return phone.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const formatCEPDisplay = (cep) => {
        if (!cep) return '';
        cep = cep.replace(/\D/g, '');
        if (cep.length <= 5) return cep;
        return cep.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    };

    const handleCPFChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            setFormData({ ...formData, cpf: value });
        }
    };

    const handleCNPJChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 14) {
            setFormData({ ...formData, cnpj: value });
        }
    };

    const handlePhoneChange = (field) => (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const handleCEPChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 8) {
            setFormData({ ...formData, cep: value });
            if (value.length === 8) {
                fetchAddressByCEP(value);
            }
        }
    };

    const fetchAddressByCEP = async (cep) => {
        setLoadingCEP(true);
        try {
            const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.data.erro) {
                setFormData({
                    ...formData,
                    cep,
                    street: response.data.logradouro || '',
                    neighborhood: response.data.bairro || '',
                    city: response.data.localidade || '',
                    state: response.data.uf || ''
                });
            }
        } catch (err) {
            console.error('CEP error:', err);
        } finally {
            setLoadingCEP(false);
        }
    };

    const handleGenericUpload = async (file) => {
        if (!file) return null;
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            setError('Tipo de arquivo inválido. Use PDF ou imagem');
            return null;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Arquivo muito grande. Máximo 10MB');
            return null;
        }
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('folder', 'customer_documents');
            const response = await api.post('/upload', formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${getToken()}`
                }
            });
            return response.data.url;
        } catch (err) {
            setError('Erro ao fazer upload');
            return null;
        }
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            const payload = {
                ...formData,
                customer_type: customerType,
                inverters: !id ? linkedInverters : undefined,
                stations: !id ? linkedStations : undefined,
                consumer_units: consumerUnits.filter(u => u.unit_number && u.unit_number.trim() !== '')
            };

            // Debug: log the payload
            console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

            if (id) {
                await api.put(`/customers/${id}`, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            } else {
                await api.post('/customers', payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }
            navigate('/customers');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar cliente');
        } finally {
            setLoading(false);
        }
    };

    // Step Progress Indicator Component
    const StepIndicator = () => (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = currentStep === step.number;
                    const isCompleted = currentStep > step.number;

                    return (
                        <React.Fragment key={step.number}>
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/50 scale-110'
                                        : isCompleted
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {isCompleted ? (
                                        <Check className="h-7 w-7" />
                                    ) : (
                                        <StepIcon className="h-7 w-7" />
                                    )}
                                </div>
                                <span
                                    className={`mt-3 text-xs font-semibold ${isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : isCompleted
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {step.title}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-1 mx-2 mb-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                    <div
                                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600 w-full' : 'w-0'
                                            }`}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="text-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Etapa {currentStep} de {totalSteps}
                </span>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );

    // Navigation Buttons Component
    const NavigationButtons = () => (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
            >
                <ChevronLeft className="h-5 w-5" />
                Anterior
            </button>

            {currentStep < totalSteps ? (
                <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${canProceed()
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/50'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Próximo
                    <ChevronRight className="h-5 w-5" />
                </button>
            ) : (
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Salvar Cliente
                        </>
                    )}
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/customers')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Voltar para lista</span>
                    </button>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {id ? 'Editar Cliente' : 'Novo Cliente'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Preencha as informações em etapas
                    </p>
                </div>

                <StepIndicator />

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Step Content */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                    {/* Step 1: Customer Type */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Tipo de Cliente
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Selecione o tipo de cadastro
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                                <button
                                    type="button"
                                    onClick={() => setCustomerType('pf')}
                                    className={`group relative overflow-hidden p-8 rounded-2xl border-2 transition-all duration-300 ${customerType === 'pf'
                                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 shadow-xl shadow-blue-500/20'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:shadow-lg'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className={`p-4 rounded-full ${customerType === 'pf'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                                            }`}>
                                            <User className="h-10 w-10" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold ${customerType === 'pf' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                                                }`}>
                                                Pessoa Física
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                CPF, RG, Dados Pessoais
                                            </p>
                                        </div>
                                    </div>
                                    {customerType === 'pf' && (
                                        <div className="absolute top-4 right-4">
                                            <Check className="h-6 w-6 text-blue-600" />
                                        </div>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCustomerType('pj')}
                                    className={`group relative overflow-hidden p-8 rounded-2xl border-2 transition-all duration-300 ${customerType === 'pj'
                                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 shadow-xl shadow-purple-500/20'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 hover:shadow-lg'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className={`p-4 rounded-full ${customerType === 'pj'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600'
                                            }`}>
                                            <Building className="h-10 w-10" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold ${customerType === 'pj' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'
                                                }`}>
                                                Pessoa Jurídica
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                CNPJ, Razão Social, Empresa
                                            </p>
                                        </div>
                                    </div>
                                    {customerType === 'pj' && (
                                        <div className="absolute top-4 right-4">
                                            <Check className="h-6 w-6 text-purple-600" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Step 2: Contractor Data */}
                    {currentStep === 2 && customerType && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {customerType === 'pf' ? 'Dados do Contratante' : 'Dados da Empresa'}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {customerType === 'pf' ? (
                                    <>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Nome Completo</label>
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                                placeholder="João da Silva"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">CPF</label>
                                            <input
                                                type="text"
                                                value={formatCPFDisplay(formData.cpf)}
                                                onChange={handleCPFChange}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                                placeholder="000.000.000-00"
                                                maxLength={14}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">RG</label>
                                            <input
                                                type="text"
                                                value={formData.rg}
                                                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                                placeholder="00.000.000-0"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Data de Nascimento</label>
                                            <input
                                                type="date"
                                                value={formData.birth_date}
                                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Razão Social</label>
                                            <input
                                                type="text"
                                                value={formData.company_name}
                                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                                placeholder="Empresa LTDA"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Nome Fantasia</label>
                                            <input
                                                type="text"
                                                value={formData.trade_name}
                                                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                                placeholder="Empresa"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">CNPJ</label>
                                            <input
                                                type="text"
                                                value={formatCNPJDisplay(formData.cnpj)}
                                                onChange={handleCNPJChange}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                                placeholder="00.000.000/0000-00"
                                                maxLength={18}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Inscrição Estadual</label>
                                            <input
                                                type="text"
                                                value={formData.state_registration}
                                                onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Inscrição Municipal</label>
                                            <input
                                                type="text"
                                                value={formData.municipal_registration}
                                                onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                            />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Telefone</label>
                                    <input
                                        type="text"
                                        value={formatPhoneDisplay(formData.phone)}
                                        onChange={handlePhoneChange('phone')}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">CEP</label>
                                    <input
                                        type="text"
                                        value={formatCEPDisplay(formData.cep)}
                                        onChange={handleCEPChange}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                    {loadingCEP && <p className="text-sm text-blue-600 mt-1">Buscando endereço...</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Rua</label>
                                    <input
                                        type="text"
                                        value={formData.street}
                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Número</label>
                                    <input
                                        type="text"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Complemento</label>
                                    <input
                                        type="text"
                                        value={formData.complement}
                                        onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Bairro</label>
                                    <input
                                        type="text"
                                        value={formData.neighborhood}
                                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Cidade</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Estado</label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Installation Holder */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Titular da Instalação</h2>
                            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <input
                                    type="checkbox"
                                    checked={formData.has_different_holder}
                                    onChange={(e) => setFormData({ ...formData, has_different_holder: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    O titular da instalação é diferente do contratante
                                </label>
                            </div>
                            {formData.has_different_holder && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Nome do Titular</label>
                                        <input
                                            type="text"
                                            value={formData.holder_name}
                                            onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Grau de Vínculo</label>
                                        <select
                                            value={formData.holder_relationship}
                                            onChange={(e) => setFormData({ ...formData, holder_relationship: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="conjuge">Cônjuge</option>
                                            <option value="filho">Filho(a)</option>
                                            <option value="pai_mae">Pai/Mãe</option>
                                            <option value="irmao">Irmão(ã)</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                    </div>
                                    <p className="md:col-span-2 text-sm text-gray-600">Demais campos podem ser preenchidos opcionalmente</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Additional Contacts */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Contatos Adicionais</h2>
                            <ContactList
                                contacts={formData.contacts}
                                onChange={(contacts) => setFormData({ ...formData, contacts })}
                            />
                        </div>
                    )}

                    {/* Step 5: Consumer Units */}
                    {currentStep === 5 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Unidades Consumidoras</h2>
                            <UnitList
                                units={consumerUnits}
                                onChange={setConsumerUnits}
                                onUpload={handleGenericUpload}
                            />
                        </div>
                    )}

                    {/* Step 6: Contract Documents */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Documentos do Contrato</h2>
                            <p className="text-gray-600 dark:text-gray-400">Upload de documentos contratuais (PDF ou imagens)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">ID do Contratante</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files[0]);
                                            if (url) setFormData({ ...formData, contractor_id_file_url: url });
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {formData.contractor_id_file_url && <p className="text-xs text-green-600 mt-1">✓ Arquivo enviado</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Contrato da Usina</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files[0]);
                                            if (url) setFormData({ ...formData, plant_contract_file_url: url });
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {formData.plant_contract_file_url && <p className="text-xs text-green-600 mt-1">✓ Arquivo enviado</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 7: Project Documents */}
                    {currentStep === 7 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Projetos e Documentos da Concessionária</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Procuração</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files[0]);
                                            if (url) setFormData({ ...formData, proxy_file_url: url });
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                    {formData.proxy_file_url && <p className="text-xs text-green-600 mt-1">✓ Arquivo enviado</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">ART</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files[0]);
                                            if (url) setFormData({ ...formData, art_file_url: url });
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                    {formData.art_file_url && <p className="text-xs text-green-600 mt-1">✓ Arquivo enviado</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Diagrama Unifilar</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files[0]);
                                            if (url) setFormData({ ...formData, diagram_file_url: url });
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                    {formData.diagram_file_url && <p className="text-xs text-green-600 mt-1">✓ Arquivo enviado</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Memorial Descritivo</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files[0]);
                                            if (url) setFormData({ ...formData, memorial_file_url: url });
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                    {formData.memorial_file_url && <p className="text-xs text-green-600 mt-1">✓ Arquivo enviado</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 8: Kit and Materials */}
                    {currentStep === 8 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Kit e Materiais da Usina</h2>
                            <CustomerKit formData={formData} setFormData={setFormData} />
                        </div>
                    )}

                    {/* Step 9: Financial */}
                    {currentStep === 9 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Informações Financeiras</h2>
                            <CustomerFinancial formData={formData} setFormData={setFormData} />
                        </div>
                    )}

                    {/* Step 10: Stations and Equipment */}
                    {currentStep === 10 && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Usinas e Equipamentos</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Vincule usinas do Solarman e inversores cadastrados a este cliente.
                                </p>
                            </div>

                            {/* Solarman Stations */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Usinas Solarman
                                </h3>
                                <StationSelector
                                    customerId={id}
                                    linkedStations={linkedStations}
                                    onUpdate={fetchCustomer}
                                    onAdd={!id ? handleStationAdd : undefined}
                                    onRemove={!id ? handleStationRemove : undefined}
                                />
                            </div>

                            {/* Registered Inverters */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-500" />
                                    Inversores Cadastrados
                                </h3>
                                <InverterSelector
                                    customerId={id}
                                    linkedInverters={linkedInverters}
                                    onUpdate={fetchCustomer}
                                    onAdd={!id ? handleInverterAdd : undefined}
                                    onRemove={!id ? handleInverterRemove : undefined}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 11: Review */}
                    {currentStep === 11 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Revisão Final</h2>
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <Check className="h-8 w-8 text-green-600" />
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pronto para salvar!</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    Revise as informações preenchidas. Você pode voltar a qualquer etapa para fazer alterações.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Tipo de Cliente</p>
                                        <p className="text-gray-600 dark:text-gray-400">{customerType === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Nome/Razão Social</p>
                                        <p className="text-gray-600 dark:text-gray-400">{formData.full_name || formData.company_name || '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Email</p>
                                        <p className="text-gray-600 dark:text-gray-400">{formData.email || '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Telefone</p>
                                        <p className="text-gray-600 dark:text-gray-400">{formatPhoneDisplay(formData.phone) || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    <NavigationButtons />
                </div>
            </div>
        </div>
    );
}
