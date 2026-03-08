import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FileText, Upload, X, User, Phone, AlertCircle, Clock, Flag } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

export function TicketForm() {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        isCustomer: true,
        customer_id: '',
        non_customer_name: '',
        non_customer_phone: '',
        uc_number: '',
        origin: 'whatsapp',
        initial_attendant_id: '',
        reason_id: '',
        description: '',
        generation_status: 'unknown',
        emotional_status: 'normal',
        expected_response_time: '1h',
        expected_execution_time: '',
        priority: 'medium'
    });

    // Dropdown options
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [reasons, setReasons] = useState([]);
    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        loadOptions();
    }, []);

    const loadOptions = async () => {
        setLoadingOptions(true);
        try {
            // Load customers
            let customersData = [];
            try {
                const customersRes = await api.get('/customers');
                if (Array.isArray(customersRes.data)) {
                    customersData = customersRes.data;
                } else {
                    console.warn('Customers API returned non-array:', customersRes.data);
                }
            } catch (error) {
                console.error('Error loading customers:', error.response?.data || error.message);
            }

            // Load employees
            let employeesData = [];
            try {
                const employeesRes = await api.get('/employees');
                if (Array.isArray(employeesRes.data)) {
                    employeesData = employeesRes.data;
                }
            } catch (error) {
                console.error('Error loading employees:', error.response?.data || error.message);
            }

            // Load reasons
            let reasonsData = [];
            try {
                const reasonsRes = await api.get('/ticket-reasons');
                if (Array.isArray(reasonsRes.data)) {
                    reasonsData = reasonsRes.data;
                }
            } catch (error) {
                console.error('Error loading reasons:', error.response?.data || error.message);
            }

            setCustomers(customersData);
            setEmployees(employeesData);
            setReasons(reasonsData);

        } catch (error) {
            console.error('General error loading options:', error);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const filePromises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    resolve({
                        file_name: file.name,
                        file_type: file.type,
                        file_url: reader.result
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then(newAttachments => {
            setAttachments([...attachments, ...newAttachments]);
        });
    };

    const removeAttachment = (index) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Build clean payload
            const payload = {
                customer_id: formData.isCustomer ? (formData.customer_id || null) : null,
                non_customer_name: formData.non_customer_name,
                non_customer_phone: formData.non_customer_phone,
                uc_number: formData.uc_number,
                origin: formData.origin,
                description: formData.description,
                generation_status: formData.generation_status,
                emotional_status: formData.emotional_status,
                expected_response_time: formData.expected_response_time,
                expected_execution_time: formData.expected_execution_time,
                priority: formData.priority,
                attachments: attachments.length > 0 ? attachments : undefined
            };

            // Only add optional fields if they have valid values
            if (formData.initial_attendant_id) {
                payload.initial_attendant_id = formData.initial_attendant_id;
            }
            if (formData.reason_id) {
                payload.reason_id = formData.reason_id;
            }

            await api.post('/tickets', payload);

            await Swal.fire({
                title: 'Chamado Aberto com Sucesso!',
                text: 'O chamado foi registrado e ja esta na fila de atendimento.',
                icon: 'success',
                confirmButtonColor: '#2563eb',
                confirmButtonText: 'Otimo!',
                backdrop: `
                    rgba(0,0,123,0.4)
                    url("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2Q5M2Q5M2Q5M2Q5M2Q5M2Q5M2Q5M2Q5M2Q5M2Q5M2Q5/26u4lOMA8JKSnL9Uk/giphy.gif")
                    left top
                    no-repeat
                `
            });

            // Reset form
            setFormData({
                customer_id: '',
                non_customer_name: '',
                non_customer_phone: '',
                uc_number: '',
                origin: 'alert',
                initial_attendant_id: '',
                reason_id: '',
                description: '',
                generation_status: 'unknown',
                emotional_status: 'normal',
                priority: 'medium',
                expected_response_time: '',
                expected_execution_time: '',
                isCustomer: true
            });
            setAttachments([]);

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('Error creating ticket:', error);

            // Log detailed error information
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                console.error('Response headers:', error.response.headers);
            } else if (error.request) {
                console.error('No response received:', error.request);
            } else {
                console.error('Error message:', error.message);
            }

            // Show user-friendly error
            const errorMessage = error.response?.data?.error
                || error.response?.data?.details
                || error.message
                || 'Erro desconhecido ao criar chamado';

            Swal.fire({
                title: 'Erro ao criar chamado',
                text: errorMessage,
                icon: 'error',
                confirmButtonColor: '#dc2626'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loadingOptions) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Carregando formulario...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                            <FileText className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Novo Chamado</h1>
                            <p className="text-gray-600 dark:text-gray-300">Registre uma nova solicitacao ou problema</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informacoes do Cliente</h2>
                        </div>

                        <div className="flex gap-6 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={formData.isCustomer}
                                    onChange={() => setFormData({ ...formData, isCustomer: true, customer_id: '', non_customer_name: '', non_customer_phone: '' })}
                                    className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Cliente Cadastrado</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={!formData.isCustomer}
                                    onChange={() => setFormData({ ...formData, isCustomer: false, customer_id: '' })}
                                    className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Nao e Cliente</span>
                            </label>
                        </div>

                        {formData.isCustomer ? (
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Selecionar Cliente *</label>
                                <select
                                    required
                                    value={formData.customer_id}
                                    onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id} className="py-2">
                                            {c.customer_type === 'pf' ? c.full_name : c.company_name}
                                            {c.customer_type === 'pf' && c.cpf ? ` - CPF: ${c.cpf}` : ''}
                                            {c.customer_type === 'pj' && c.cnpj ? ` - CNPJ: ${c.cnpj}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {customers.length === 0 && (
                                    <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Nenhum cliente cadastrado. Cadastre um cliente primeiro ou selecione "Nao e Cliente".
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Nome do Cliente *</label>
                                    <Input
                                        type="text"
                                        required
                                        value={formData.non_customer_name}
                                        onChange={e => setFormData({ ...formData, non_customer_name: e.target.value })}
                                        placeholder="Nome completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Telefone do Cliente *</label>
                                    <Input
                                        type="tel"
                                        required
                                        value={formData.non_customer_phone}
                                        onChange={e => setFormData({ ...formData, non_customer_phone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Numero da UC</label>
                            <Input
                                type="text"
                                value={formData.uc_number}
                                onChange={e => setFormData({ ...formData, uc_number: e.target.value })}
                                placeholder="UC Geradora ou UC Beneficiaria (opcional)"
                            />
                        </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Phone className="h-5 w-5 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalhes do Atendimento</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Origem do Atendimento *</label>
                                <select
                                    required
                                    value={formData.origin}
                                    onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                >
                                    <option value="alert">Registro Alerta</option>
                                    <option value="ai_agent">Agente de Suporte (IA)</option>
                                    <option value="call">Ligacao</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="in_person">Presencial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Atendimento Inicial</label>
                                <select
                                    value={formData.initial_attendant_id}
                                    onChange={e => setFormData({ ...formData, initial_attendant_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Motivo da Abertura *</label>
                            <select
                                required
                                value={formData.reason_id}
                                onChange={e => setFormData({ ...formData, reason_id: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                            >
                                <option value="">Selecione um motivo...</option>
                                {reasons.map(reason => (
                                    <option key={reason.id} value={reason.id}>{reason.title}</option>
                                ))}
                            </select>
                            {reasons.length === 0 && (
                                <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Nenhum motivo cadastrado. Va em Configuracoes para Motivos de Chamado.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Descricao do Atendimento *</label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={5}
                                placeholder="Descreva detalhadamente o problema relatado pelo cliente..."
                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Generation Status */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="h-5 w-5 text-green-600" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Status da Geracao</h3>
                            </div>
                            <select
                                value={formData.generation_status}
                                onChange={e => setFormData({ ...formData, generation_status: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                            >
                                <option value="normal">Geracao Normal</option>
                                <option value="partial">Geracao Parcial</option>
                                <option value="none">Sem Geracao</option>
                                <option value="unknown">Nao Informado</option>
                            </select>
                        </div>

                        {/* Emotional Status */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <User className="h-5 w-5 text-amber-600" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Estado Emocional</h3>
                            </div>
                            <select
                                value={formData.emotional_status}
                                onChange={e => setFormData({ ...formData, emotional_status: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                            >
                                <option value="tranquil">Tranquilo</option>
                                <option value="normal">Normal</option>
                                <option value="attentive">Atento</option>
                                <option value="critical">Critico</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Flag className="h-5 w-5 text-red-600" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Prioridade *</h3>
                            </div>
                            <select
                                required
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                    </div>

                    {/* Time Expectations */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Clock className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prazos Estimados</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Tempo Previsto Atendimento Inicial</label>
                                <select
                                    value={formData.expected_response_time}
                                    onChange={e => setFormData({ ...formData, expected_response_time: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                >
                                    <option value="30min">30 Minutos</option>
                                    <option value="1h">1 Hora</option>
                                    <option value="2h">2 Horas</option>
                                    <option value="3h">3 Horas</option>
                                    <option value="half_day">Meio Periodo</option>
                                    <option value="24h">24h / 1 dia</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Tempo Previsto para Execucao</label>
                                <select
                                    value={formData.expected_execution_time}
                                    onChange={e => setFormData({ ...formData, expected_execution_time: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                >
                                    <option value="">Nao Informado</option>
                                    <option value="24h">24h / 1 dia</option>
                                    <option value="48h">48h / 2 dias</option>
                                    <option value="72h">72h / 3 dias</option>
                                    <option value="96h">96h / 4 dias</option>
                                    <option value="120h">120h / 5 dias</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Upload className="h-5 w-5 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Anexos</h2>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <label className="cursor-pointer">
                                <span className="text-blue-600 hover:text-blue-700 font-bold text-lg">Clique para anexar</span>
                                <span className="text-gray-600 dark:text-gray-300"> ou arraste arquivos aqui</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*,.pdf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fotos, videos ou PDFs (max. 10MB cada)</p>
                        </div>

                        {attachments.length > 0 && (
                            <div className="mt-6 space-y-3">
                                {attachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <FileText className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">{att.file_name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(idx)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4">
                        <Button type="button" variant="outline" size="lg" className="flex-1 font-bold" onClick={() => navigate(-1)}>
                            Cancelar
                        </Button>
                        <Button type="submit" size="lg" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 font-bold shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-800" disabled={loading}>
                            {loading ? 'Criando Chamado...' : 'Criar Chamado'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

