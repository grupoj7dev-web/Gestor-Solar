import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, MapPin, User, Building, Trash2, ChevronRight, ChevronLeft, FileText, Home, Users, Briefcase, DollarSign, Package, Check } from 'lucide-react';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { InverterSelector } from '../components/InverterSelector';
import { StationSelector } from '../components/StationSelector';
import ContactList from '../components/ContactList';
import UnitList from '../components/UnitList';
import { CustomerFinancial } from '../components/CustomerFinancial';
import { CustomerKit } from '../components/CustomerKit';

export function CustomerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingCEP, setLoadingCEP] = useState(false);
    const [error, setError] = useState('');
    const [customerType, setCustomerType] = useState('pf'); // 'pf' or 'pj'
    const [linkedInverters, setLinkedInverters] = useState([]);
    const [linkedStations, setLinkedStations] = useState([]);
    const [uploadingContract, setUploadingContract] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [consumerUnits, setConsumerUnits] = useState(['']); // Array of unit numbers
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 10;

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
        { number: 10, title: 'Revisão', icon: Check }
    ];

    const [formData, setFormData] = useState({
        // Common fields
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
        // PF fields
        cpf: '',
        rg: '',
        full_name: '',
        birth_date: '',
        // PJ fields
        cnpj: '',
        company_name: '',
        trade_name: '',
        state_registration: '',
        municipal_registration: '',
        // Additional fields
        contract_file_url: '',
        document_type: '',
        document_file_url: '',
        observations: '',
        // Installation Holder
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
        // Project/Utility Documents
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
        // Financial
        sale_total_value: '',
        financial_conditions: [],
        kit_details: {}
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

            setFormData({
                email: data.email || '',
                phone: data.phone || '',
                cep: data.cep || '',
                street: data.street || '',
                number: data.number || '',
                complement: data.complement || '',
                neighborhood: data.neighborhood || '',
                city: data.city || '',
                state: data.state || '',
                additional_contact_name: data.additional_contact_name || '',
                additional_contact_phone: data.additional_contact_phone || '',
                additional_contact_email: data.additional_contact_email || '',
                cpf: data.cpf || '',
                rg: data.rg || '',
                full_name: data.full_name || '',
                birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
                cnpj: data.cnpj || '',
                company_name: data.company_name || '',
                trade_name: data.trade_name || '',
                state_registration: data.state_registration || '',
                municipal_registration: data.municipal_registration || '',
                contract_file_url: data.contract_file_url || '',
                document_type: data.document_type || '',
                document_file_url: data.document_file_url || '',
                observations: data.observations || '',
                has_different_holder: data.has_different_holder || false,
                holder_type: data.holder_type || 'pf',
                holder_name: data.holder_name || '',
                holder_document: data.holder_document || '',
                holder_rg: data.holder_rg || '',
                holder_state_registration: data.holder_state_registration || '',
                holder_email: data.holder_email || '',
                holder_phone: data.holder_phone || '',
                holder_zip: data.holder_zip || '',
                holder_address: data.holder_address || '',
                holder_number: data.holder_number || '',
                holder_complement: data.holder_complement || '',
                holder_neighborhood: data.holder_neighborhood || '',
                holder_city: data.holder_city || '',
                holder_state: data.holder_state || '',
                holder_relationship: data.holder_relationship || '',
                holder_relationship_other: data.holder_relationship_other || '',
                // New Document Fields
                contractor_id_file_url: data.contractor_id_file_url || '',
                holder_id_file_url: data.holder_id_file_url || '',
                plant_contract_file_url: data.plant_contract_file_url || '',
                other_documents: data.other_documents || [],
                contacts: data.contacts || [],
                // Project/Utility Documents
                proxy_file_url: data.proxy_file_url || '',
                art_file_url: data.art_file_url || '',
                module_inmetro_file_url: data.module_inmetro_file_url || '',
                inverter_datasheet_file_url: data.inverter_datasheet_file_url || '',
                module_datasheet_file_url: data.module_datasheet_file_url || '',
                generator_registration_file_url: data.generator_registration_file_url || '',
                diagram_file_url: data.diagram_file_url || '',
                memorial_file_url: data.memorial_file_url || '',
                access_request_file_url: data.access_request_file_url || '',
                other_project_documents: data.other_project_documents || [],
                // Financial
                sale_total_value: data.sale_total_value || '',
                financial_conditions: data.financial_conditions || [],
                kit_details: data.kit_details || {}
            });
            setCustomerType(data.customer_type);
            setLinkedInverters(data.inverters || []);
            setLinkedStations(data.stations || []);

            if (data.consumer_units && data.consumer_units.length > 0) {
                setConsumerUnits(data.consumer_units.map(u => u.unit_number));
            } else {
                setConsumerUnits(['']);
            }

        } catch (error) {
            console.error('Error fetching customer:', error);
            setError('Erro ao carregar cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleLinksUpdate = () => {
        if (id) {
            fetchCustomer();
        }
    };

    // Local link handlers
    const handleAddInverter = (inverter) => {
        setLinkedInverters([...linkedInverters, inverter]);
    };

    const handleRemoveInverter = (inverterId) => {
        setLinkedInverters(linkedInverters.filter(inv => inv.inverter_id !== inverterId));
    };

    const handleAddStation = (station) => {
        setLinkedStations([...linkedStations, station]);
    };

    const handleRemoveStation = (stationId) => {
        setLinkedStations(linkedStations.filter(st => st.station_id !== stationId));
    };

    const formatCPFDisplay = (cpf) => {
        if (!cpf) return '';
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length <= 3) return cpf;
        if (cpf.length <= 6) return cpf.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
        if (cpf.length <= 9) return cpf.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
        return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
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

    const formatCNPJDisplay = (cnpj) => {
        if (!cnpj) return '';
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length <= 2) return cnpj;
        if (cnpj.length <= 5) return cnpj.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
        if (cnpj.length <= 8) return cnpj.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
        if (cnpj.length <= 12) return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    };

    const handlePhoneChange = (field) => (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const formatPhoneDisplay = (phone) => {
        if (!phone) return '';
        phone = phone.replace(/\D/g, '');
        if (phone.length <= 2) return phone;
        if (phone.length <= 6) return phone.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
        if (phone.length <= 10) return phone.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        return phone.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
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

    const formatCEPDisplay = (cep) => {
        if (!cep) return '';
        cep = cep.replace(/\D/g, '');
        if (cep.length <= 5) return cep;
        return cep.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    };

    const fetchAddressByCEP = async (cep) => {
        setLoadingCEP(true);
        setError('');

        try {
            const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

            if (response.data.erro) {
                setError('CEP não encontrado');
                return;
            }

            setFormData({
                ...formData,
                cep,
                street: response.data.logradouro || '',
                neighborhood: response.data.bairro || '',
                city: response.data.localidade || '',
                state: response.data.uf || ''
            });
        } catch (err) {
            setError('Erro ao buscar CEP');
        } finally {
            setLoadingCEP(false);
        }
    };

    const handleHolderCEPChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 8) {
            setFormData({ ...formData, holder_zip: value });
            if (value.length === 8) {
                fetchHolderAddressByCEP(value);
            }
        }
    };

    const fetchHolderAddressByCEP = async (cep) => {
        setLoadingCEP(true); // Reusing same loading state for simplicity
        setError('');

        try {
            const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

            if (response.data.erro) {
                setError('CEP do titular não encontrado');
                return;
            }

            setFormData(prev => ({
                ...prev,
                holder_zip: cep,
                holder_address: response.data.logradouro || '',
                holder_neighborhood: response.data.bairro || '',
                holder_city: response.data.localidade || '',
                holder_state: response.data.uf || ''
            }));
        } catch (err) {
            setError('Erro ao buscar CEP do titular');
        } finally {
            setLoadingCEP(false);
        }
    };

    const handleGenericUpload = async (file) => {
        if (!file) return null;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            setError('Tipo de arquivo inválido. Use PDF ou imagem (JPG/PNG)');
            return null;
        }

        // Validate file size (max 10MB to be safe)
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
            console.error('Upload error:', err);
            setError('Erro ao fazer upload do arquivo');
            return null;
        }
    };

    const handleContractUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingContract(true);
        const url = await handleGenericUpload(file);
        if (url) setFormData({ ...formData, contract_file_url: url });
        setUploadingContract(false);
    };

    const handleDocumentUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingDocument(true);
        const url = await handleGenericUpload(file);
        if (url) setFormData({ ...formData, document_file_url: url });
        setUploadingDocument(false);
    };

    const handleUnitUpload = async (file) => {
        return await handleGenericUpload(file);
    };

    const handleSubmit = async () => {
        setError('');

        // Common validations
        if (!formData.email || !formData.phone || !formData.cep || !formData.street || !formData.neighborhood || !formData.city || !formData.state) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        // Type-specific validations
        if (customerType === 'pf') {
            if (!formData.cpf || !formData.full_name) {
                setError('CPF e nome completo são obrigatórios para Pessoa Física');
                return;
            }
            if (formData.cpf.length !== 11) {
                setError('CPF deve conter 11 dígitos');
                return;
            }
        } else {
            if (!formData.cnpj || !formData.company_name) {
                setError('CNPJ e razão social são obrigatórios para Pessoa Jurídica');
                return;
            }
            if (formData.cnpj.length !== 14) {
                setError('CNPJ deve conter 14 dígitos');
                return;
            }
        }

        if (formData.cep.length !== 8) {
            setError('CEP deve conter 8 dígitos');
            return;
        }

        // Holder validations
        if (formData.has_different_holder) {
            if (!formData.holder_name) {
                setError('Nome do titular é obrigatório');
                return;
            }

            if (formData.holder_type === 'pf') {
                if (!formData.holder_document || formData.holder_document.length !== 11) {
                    setError('CPF do titular inválido');
                    return;
                }
            } else {
                if (!formData.holder_document || formData.holder_document.length !== 14) {
                    setError('CNPJ do titular inválido');
                    return;
                }
            }

            if (!formData.holder_zip || formData.holder_zip.length !== 8) {
                setError('CEP do titular inválido');
                return;
            }
            if (!formData.holder_address) {
                setError('Endereço do titular é obrigatório');
                return;
            }
            if (!formData.holder_neighborhood) {
                setError('Bairro do titular é obrigatório');
                return;
            }
            if (!formData.holder_city) {
                setError('Cidade do titular é obrigatória');
                return;
            }
            if (!formData.holder_state) {
                setError('UF do titular é obrigatória');
                return;
            }
            if (!formData.holder_relationship) {
                setError('Grau de vínculo é obrigatório');
                return;
            }
            if (formData.holder_relationship === 'outro' && !formData.holder_relationship_other) {
                setError('Descrição do vínculo é obrigatória');
                return;
            }
        }

        setLoading(true);

        try {
            const payload = {
                ...formData,
                customer_type: customerType,
                inverters: !id ? linkedInverters : undefined,
                stations: !id ? linkedStations : undefined,
                consumer_units: consumerUnits.filter(u => u.trim() !== '')
            };

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


    // Step navigation
    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const canProceed = () => {
        if (currentStep === 1) {
            return customerType === 'pf' || customerType === 'pj';
        }
        // Add more validation as needed
        return true;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/customers')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Voltar para lista</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {id ? 'Editar Cliente' : 'Novo Cliente'}
                    </h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Customer Type Toggle */}
                {!id && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            Tipo de Cliente *
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setCustomerType('pf')}
                                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${customerType === 'pf'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <User className="h-5 w-5" />
                                <span className="font-semibold">Pessoa Física</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerType('pj')}
                                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${customerType === 'pj'
                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Building className="h-5 w-5" />
                                <span className="font-semibold">Pessoa Jurídica</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-8">
                    {/* Personal/Company Info */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            {customerType === 'pf' ? 'Contratante' : 'Dados da Empresa'}
                        </h2>
                        <div className="space-y-6">
                            {customerType === 'pf' ? (
                                <>
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                            Nome Completo *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                            placeholder="João da Silva"
                                        />
                                    </div>

                                    {/* CPF and RG */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                CPF *
                                            </label>
                                            <input
                                                type="text"
                                                value={formatCPFDisplay(formData.cpf)}
                                                onChange={handleCPFChange}
                                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                                placeholder="000.000.000-00"
                                                maxLength={14}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                RG
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.rg}
                                                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                                placeholder="00.000.000-0"
                                            />
                                        </div>
                                    </div>

                                    {/* Birth Date */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                            Data de Nascimento
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.birth_date}
                                            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Company Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                            Razão Social *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company_name}
                                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                            placeholder="Empresa LTDA"
                                        />
                                    </div>

                                    {/* Trade Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                            Nome Fantasia
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.trade_name}
                                            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                            placeholder="Empresa"
                                        />
                                    </div>

                                    {/* CNPJ */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                            CNPJ *
                                        </label>
                                        <input
                                            type="text"
                                            value={formatCNPJDisplay(formData.cnpj)}
                                            onChange={handleCNPJChange}
                                            className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                            placeholder="00.000.000/0000-00"
                                            maxLength={18}
                                        />
                                    </div>

                                    {/* Registrations */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Inscrição Estadual
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.state_registration}
                                                onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                                placeholder="000.000.000.000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                Inscrição Municipal
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.municipal_registration}
                                                onChange={(e) => setFormData({ ...formData, municipal_registration: e.target.value })}
                                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                                                placeholder="000.000.000"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Informações de Contato
                        </h2>
                        <div className="space-y-6">
                            {/* Email and Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Telefone *
                                    </label>
                                    <input
                                        type="text"
                                        value={formatPhoneDisplay(formData.phone)}
                                        onChange={handlePhoneChange('phone')}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Installation Holder Section */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Titular da Instalação
                        </h2>

                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                    A unidade consumidora da instalação pertence a outra pessoa ou endereço?
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.has_different_holder === true}
                                            onChange={() => setFormData({ ...formData, has_different_holder: true })}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">Sim</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.has_different_holder === false}
                                            onChange={() => setFormData({ ...formData, has_different_holder: false })}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">Não</span>
                                    </label>
                                </div>
                            </div>

                            {formData.has_different_holder && (
                                <div className="space-y-6">
                                    {/* Holder Type */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                            Tipo de Pessoa *
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, holder_type: 'pf' })}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.holder_type === 'pf'
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                    }`}
                                            >
                                                <User className="h-4 w-4" />
                                                <span className="font-semibold">Pessoa Física</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, holder_type: 'pj' })}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.holder_type === 'pj'
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Building className="h-4 w-4" />
                                                <span className="font-semibold">Pessoa Jurídica</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Holder Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                {formData.holder_type === 'pf' ? 'Nome Completo *' : 'Razão Social *'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.holder_name}
                                                onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                                                className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                placeholder={formData.holder_type === 'pf' ? 'Nome do titular' : 'Razão Social da empresa'}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                {formData.holder_type === 'pf' ? 'CPF *' : 'CNPJ *'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.holder_type === 'pf' ? formatCPFDisplay(formData.holder_document) : formatCNPJDisplay(formData.holder_document)}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if ((formData.holder_type === 'pf' && val.length <= 11) || (formData.holder_type === 'pj' && val.length <= 14)) {
                                                        setFormData({ ...formData, holder_document: val });
                                                    }
                                                }}
                                                className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                placeholder={formData.holder_type === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                                {formData.holder_type === 'pf' ? 'RG' : 'Inscrição Estadual'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.holder_type === 'pf' ? formData.holder_rg : formData.holder_state_registration}
                                                onChange={(e) => setFormData({ ...formData, [formData.holder_type === 'pf' ? 'holder_rg' : 'holder_state_registration']: e.target.value })}
                                                className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={formData.holder_email}
                                                onChange={(e) => setFormData({ ...formData, holder_email: e.target.value })}
                                                className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Telefone</label>
                                            <input
                                                type="text"
                                                value={formatPhoneDisplay(formData.holder_phone)}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length <= 11) setFormData({ ...formData, holder_phone: val });
                                                }}
                                                className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>

                                    {/* Holder Address */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <h3 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-4">Endereço do Titular</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">CEP *</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formatCEPDisplay(formData.holder_zip)}
                                                        onChange={handleHolderCEPChange}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 pl-12 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                        placeholder="00000-000"
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        {loadingCEP && formData.holder_zip.length === 8 ? (
                                                            <Loader2 className={`h-5 w-5 text-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-600 animate-spin`} />
                                                        ) : (
                                                            <MapPin className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Logradouro *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holder_address}
                                                        onChange={(e) => setFormData({ ...formData, holder_address: e.target.value })}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Número</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holder_number}
                                                        onChange={(e) => setFormData({ ...formData, holder_number: e.target.value })}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Bairro *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holder_neighborhood}
                                                        onChange={(e) => setFormData({ ...formData, holder_neighborhood: e.target.value })}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Complemento</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holder_complement}
                                                        onChange={(e) => setFormData({ ...formData, holder_complement: e.target.value })}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Cidade *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holder_city}
                                                        onChange={(e) => setFormData({ ...formData, holder_city: e.target.value })}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">UF *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.holder_state}
                                                        onChange={(e) => setFormData({ ...formData, holder_state: e.target.value.toUpperCase() })}
                                                        maxLength={2}
                                                        className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all uppercase`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Relationship */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Grau de Vínculo com a UC *</label>
                                        <select
                                            value={formData.holder_relationship}
                                            onChange={(e) => setFormData({ ...formData, holder_relationship: e.target.value })}
                                            className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="conjuge">Cônjuge do titular</option>
                                            <option value="empresa_casa">Empresa ou Casa do contratante</option>
                                            <option value="filho">Filho(a)</option>
                                            <option value="pai_mae">Pai ou Mãe</option>
                                            <option value="proprietario">Proprietário do imóvel</option>
                                            <option value="inquilino">Inquilino</option>
                                            <option value="outro">Outro</option>
                                        </select>

                                        {formData.holder_relationship === 'outro' && (
                                            <div className="mt-4">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Descreva o vínculo *</label>
                                                <input
                                                    type="text"
                                                    value={formData.holder_relationship_other}
                                                    onChange={(e) => setFormData({ ...formData, holder_relationship_other: e.target.value })}
                                                    className={`w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 px-4 py-3 outline-none focus:border-${formData.holder_type === 'pf' ? 'blue' : 'purple'}-500 transition-all`}
                                                    placeholder="Ex: Sócio, Administrador..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Endereço
                        </h2>
                        <div className="space-y-6">
                            {/* CEP */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    CEP *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formatCEPDisplay(formData.cep)}
                                        onChange={handleCEPChange}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none pl-12`}
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                        {loadingCEP ? (
                                            <Loader2 className={`h-5 w-5 text-${customerType === 'pf' ? 'blue' : 'purple'}-600 animate-spin`} />
                                        ) : (
                                            <MapPin className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Digite o CEP para preencher automaticamente o endereço</p>
                            </div>

                            {/* Street and Number */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Logradouro *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.street}
                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                        placeholder="Rua, Avenida"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Número
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                        placeholder="123"
                                    />
                                </div>
                            </div>

                            {/* Complement */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Complemento
                                </label>
                                <input
                                    type="text"
                                    value={formData.complement}
                                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                                    className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                    placeholder="Apto, Sala, etc"
                                />
                            </div>

                            {/* Neighborhood */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Bairro *
                                </label>
                                <input
                                    type="text"
                                    value={formData.neighborhood}
                                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                    className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                    placeholder="Centro"
                                />
                            </div>

                            {/* City and State */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Cidade *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                        placeholder="São Paulo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        UF *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 uppercase focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                        placeholder="SP"
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Contact (Verified List) */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Contatos Adicionais
                        </h2>
                        <div className="space-y-6">
                            <ContactList
                                contacts={formData.contacts}
                                onChange={(newContacts) => setFormData({ ...formData, contacts: newContacts })}
                                customerId={id}
                            />
                        </div>
                    </div>

                    {/* UCs do Contrato (Detailed Units) */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            UCs do Contrato
                        </h2>
                        <div className="space-y-6">
                            <UnitList
                                units={formData.consumer_units || []}
                                onChange={(newUnits) => setFormData({ ...formData, consumer_units: newUnits })}
                                onUpload={handleUnitUpload}
                            />
                        </div>
                    </div>

                    {/* Documentos Contrato */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Documentos Contrato
                        </h2>
                        <div className="space-y-6">

                            {/* Contractor ID */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Anexar CNH/Identidade do Contratante
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files?.[0]);
                                            if (url) setFormData({ ...formData, contractor_id_file_url: url });
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {formData.contractor_id_file_url && (
                                        <a href={formData.contractor_id_file_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm font-medium">
                                            ✓ Ver Arquivo
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Holder ID (Conditional) */}
                            {formData.has_different_holder && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Anexar CNH/Identidade do Responsável pela UC
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={async (e) => {
                                                const url = await handleGenericUpload(e.target.files?.[0]);
                                                if (url) setFormData({ ...formData, holder_id_file_url: url });
                                            }}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                        />
                                        {formData.holder_id_file_url && (
                                            <a href={formData.holder_id_file_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm font-medium">
                                                ✓ Ver Arquivo
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Plant Contract */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Contrato da Usina
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const url = await handleGenericUpload(e.target.files?.[0]);
                                            if (url) setFormData({ ...formData, plant_contract_file_url: url });
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {formData.plant_contract_file_url && (
                                        <a href={formData.plant_contract_file_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm font-medium">
                                            ✓ Ver Arquivo
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Other Documents */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
                                    Outros Documentos
                                </label>
                                <div className="space-y-3">
                                    {(formData.other_documents || []).map((doc, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                            <input
                                                type="text"
                                                placeholder="Nome do Documento"
                                                value={doc.name || ''}
                                                onChange={(e) => {
                                                    const newDocs = [...(formData.other_documents || [])];
                                                    newDocs[index].name = e.target.value;
                                                    setFormData({ ...formData, other_documents: newDocs });
                                                }}
                                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                                            />
                                            {doc.url ? (
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                                                    Ver
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-400">Sem arquivo</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newDocs = formData.other_documents.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, other_documents: newDocs });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newDocs = [...(formData.other_documents || []), { name: '', url: '' }];
                                                setFormData({ ...formData, other_documents: newDocs });
                                            }}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                                        >
                                            + Adicionar Documento
                                        </button>
                                    </div>

                                    {/* Helper to upload to the last empty slot or specific slot */}
                                    {(formData.other_documents || []).map((doc, index) => !doc.url && (
                                        <div key={`upload-${index}`} className="mt-2 text-sm">
                                            <span className="mr-2 text-gray-600">Para "{doc.name || 'Novo Documento'}":</span>
                                            <input
                                                type="file"
                                                onChange={async (e) => {
                                                    const url = await handleGenericUpload(e.target.files?.[0]);
                                                    if (url) {
                                                        const newDocs = [...(formData.other_documents || [])];
                                                        newDocs[index].url = url;
                                                        if (!newDocs[index].name) newDocs[index].name = 'Documento ' + (index + 1);
                                                        setFormData({ ...formData, other_documents: newDocs });
                                                    }
                                                }}
                                                className="text-xs text-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Projetos e Docs da Concessionária */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Projetos e Docs da Concessionária
                        </h2>
                        <div className="space-y-6">
                            {[
                                { label: 'Procuração', field: 'proxy_file_url' },
                                { label: 'ART', field: 'art_file_url' },
                                { label: 'Certificado / INMETRO do Módulo FV', field: 'module_inmetro_file_url' },
                                { label: 'DataSheet do Inversor', field: 'inverter_datasheet_file_url' },
                                { label: 'DataSheet do Módulo FV', field: 'module_datasheet_file_url' },
                                { label: 'Dados para Registro da Central Geradora', field: 'generator_registration_file_url' },
                                { label: 'Diagrama Unifilar / Projeto', field: 'diagram_file_url' },
                                { label: 'Memorial Descritivo', field: 'memorial_file_url' },
                                { label: 'Formulário de Solicitação de Acesso', field: 'access_request_file_url' }
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        {item.label}
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={async (e) => {
                                                const url = await handleGenericUpload(e.target.files?.[0]);
                                                if (url) setFormData({ ...formData, [item.field]: url });
                                            }}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                                        />
                                        {formData[item.field] && (
                                            <a href={formData[item.field]} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm font-medium whitespace-nowrap">
                                                ✓ Ver Arquivo
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Other Project Documents */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
                                    Outros Documentos de Projeto
                                </label>
                                <div className="space-y-3">
                                    {(formData.other_project_documents || []).map((doc, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                            <input
                                                type="text"
                                                placeholder="Nome do Documento"
                                                value={doc.name || ''}
                                                onChange={(e) => {
                                                    const newDocs = [...(formData.other_project_documents || [])];
                                                    newDocs[index].name = e.target.value;
                                                    setFormData({ ...formData, other_project_documents: newDocs });
                                                }}
                                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                            {doc.url ? (
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                                                    Ver
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-400">Sem arquivo</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newDocs = formData.other_project_documents.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, other_project_documents: newDocs });
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newDocs = [...(formData.other_project_documents || []), { name: '', url: '' }];
                                                setFormData({ ...formData, other_project_documents: newDocs });
                                            }}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
                                        >
                                            + Adicionar Documento
                                        </button>
                                    </div>

                                    {(formData.other_project_documents || []).map((doc, index) => !doc.url && (
                                        <div key={`upload-proj-${index}`} className="mt-2 text-sm">
                                            <span className="mr-2 text-gray-600 dark:text-gray-400">Para "{doc.name || 'Novo Documento'}":</span>
                                            <input
                                                type="file"
                                                onChange={async (e) => {
                                                    const url = await handleGenericUpload(e.target.files?.[0]);
                                                    if (url) {
                                                        const newDocs = [...(formData.other_project_documents || [])];
                                                        newDocs[index].url = url;
                                                        if (!newDocs[index].name) newDocs[index].name = 'Documento ' + (index + 1);
                                                        setFormData({ ...formData, other_project_documents: newDocs });
                                                    }
                                                }}
                                                className="text-xs text-gray-500 dark:text-gray-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kit e Materiais da Usina */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Kit e Materiais da Usina
                        </h2>
                        <CustomerKit formData={formData} setFormData={setFormData} />
                    </div>

                    {/* Financial Tab */}
                    <div>
                        <CustomerFinancial formData={formData} setFormData={setFormData} />
                    </div>

                    {/* Additional Information */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Informações Adicionais
                        </h2>
                        <div className="space-y-6">
                            {/* Contract */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Contrato (PDF ou Imagem)
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleContractUpload}
                                        disabled={uploadingContract}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
                                    />
                                    {uploadingContract && (
                                        <p className="text-sm text-blue-600 mt-2">Fazendo upload...</p>
                                    )}
                                    {formData.contract_file_url && !uploadingContract && (
                                        <a href={formData.contract_file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 mt-2 block hover:underline">
                                            ✓ Arquivo enviado - Clique para visualizar
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Document Type and File */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Tipo de Documento
                                    </label>
                                    <select
                                        value={formData.document_type}
                                        onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="rg">RG / Identidade</option>
                                        <option value="cnh">CNH</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                        Documento (PDF ou Imagem)
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleDocumentUpload}
                                        disabled={uploadingDocument}
                                        className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
                                    />
                                    {uploadingDocument && (
                                        <p className="text-sm text-blue-600 mt-2">Fazendo upload...</p>
                                    )}
                                    {formData.document_file_url && !uploadingDocument && (
                                        <a href={formData.document_file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 mt-2 block hover:underline">
                                            ✓ Arquivo enviado - Clique para visualizar
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Observations */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    value={formData.observations}
                                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                    className={`w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-${customerType === 'pf' ? 'blue' : 'purple'}-500 focus:ring-4 focus:ring-${customerType === 'pf' ? 'blue' : 'purple'}-100 transition-all outline-none`}
                                    placeholder="Observações adicionais sobre o cliente..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linking Sections */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Inversor Exemplo
                        </h2>
                        <InverterSelector
                            customerId={id}
                            linkedInverters={linkedInverters}
                            onUpdate={handleLinksUpdate}
                            onAdd={!id ? handleAddInverter : undefined}
                            onRemove={!id ? handleRemoveInverter : undefined}
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Plantas Solarman Vinculadas
                        </h2>
                        <StationSelector
                            customerId={id}
                            linkedStations={linkedStations}
                            onUpdate={handleLinksUpdate}
                            onAdd={!id ? handleAddStation : undefined}
                            onRemove={!id ? handleRemoveStation : undefined}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 mt-8">
                    <button
                        onClick={() => navigate('/customers')}
                        className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`flex items-center gap-2 ${customerType === 'pf' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'} text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
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
                </div>
            </div>
        </div>
    );
}
