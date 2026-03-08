import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tickets, api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { TimelineHistory } from '../components/TimelineHistory';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import {
    ArrowLeft, Calendar, Clock, User, Phone, MapPin,
    FileText, MessageCircle, Send, CheckCircle, AlertTriangle,
    History, Save, XCircle, Star
} from 'lucide-react';

export function TicketDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [history, setHistory] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [initialResponse, setInitialResponse] = useState('');
    const [statusForm, setStatusForm] = useState({
        status: '',
        visit_scheduled_at: '',
        visit_responsible_id: '',
        concessionaria_substatus: '',
        execution_deadline: '',
        comment: ''
    });
    const [closingForm, setClosingForm] = useState({
        closing_response: '',
        closing_status: 'attended',
        attendant_rating: 5
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load ticket data first
            const ticketData = await tickets.getById(id);
            setTicket(ticketData);

            // Try to load history (might fail if table doesn't exist)
            let historyData = [];
            try {
                historyData = await tickets.getHistory(id);
            } catch (historyError) {
                console.warn('Could not load ticket history:', historyError);
            }
            setHistory(historyData);

            // Load employees
            const employeesData = await api.get('/employees').then(res => res.data);
            setEmployees(employeesData);

            // Initialize forms with safe access to potentially missing fields
            setStatusForm(prev => ({
                ...prev,
                status: ticketData.status || 'open',
                visit_scheduled_at: ticketData.visit_scheduled_at ? ticketData.visit_scheduled_at.slice(0, 16) : '',
                visit_responsible_id: ticketData.visit_responsible_id || '',
                concessionaria_substatus: ticketData.concessionaria_substatus || '',
                execution_deadline: ticketData.execution_deadline ? ticketData.execution_deadline.slice(0, 16) : ''
            }));

            if (ticketData.initial_response) {
                setInitialResponse(ticketData.initial_response);
            }

        } catch (error) {
            console.error('Error loading ticket details:', error);
            Swal.fire('Erro', 'Não foi possível carregar os detalhes do chamado.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInitialResponse = async () => {
        try {
            console.log('📝 Sending initial response:', {
                ticketId: id,
                response: initialResponse,
                userId: user.id
            });

            const payload = {
                initial_response: initialResponse,
                changed_by_name: user.email || 'Usuário'
            };

            // Only include initial_response_by if user is an employee
            // For now, we'll skip it to avoid foreign key errors
            // TODO: Link users to employees or create employee records

            await tickets.addInitialResponse(id, payload);

            Swal.fire('Sucesso', 'Resposta inicial registrada!', 'success');
            loadData();
        } catch (error) {
            console.error('❌ Error details:', error);
            console.error('Response data:', error.response?.data);
            Swal.fire({
                title: 'Erro',
                text: error.response?.data?.details || 'Falha ao registrar resposta inicial.',
                icon: 'error'
            });
        }
    };

    const handleStatusUpdate = async () => {
        try {
            // Add user name to track who made the change
            const updateData = {
                ...statusForm,
                changed_by_name: user.email || 'Usuário'
            };

            await tickets.updateStatus(id, updateData);

            Swal.fire('Sucesso', 'Status atualizado!', 'success');
            loadData();
        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao atualizar status.', 'error');
        }
    };

    const handleCloseTicket = async () => {
        try {
            if (!closingForm.closing_response.trim()) {
                Swal.fire('Atenção', 'Por favor, informe uma resposta de fechamento.', 'warning');
                return;
            }

            const result = await Swal.fire({
                title: 'Encerrar Chamado?',
                text: "Esta ação finalizará o atendimento.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sim, encerrar!'
            });

            if (result.isConfirmed) {
                const payload = {
                    ...closingForm,
                    // Note: closed_by expects employee_id, not user_id
                    // We'll track who closed via changed_by_name instead
                    changed_by_name: user?.email || 'Usuário'
                };

                console.log('🔒 Closing ticket with payload:', payload);

                // Add user name to track who closed the ticket
                await tickets.close(id, payload);

                // Ask to send survey
                const surveyResult = await Swal.fire({
                    title: 'Chamado Encerrado!',
                    text: "Deseja enviar a pesquisa de satisfação para o cliente?",
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'Enviar Pesquisa',
                    cancelButtonText: 'Não enviar'
                });

                if (surveyResult.isConfirmed) {
                    const phone = ticket.customer?.phone || ticket.non_customer_phone;
                    if (phone) {
                        await tickets.sendSurvey(id, { phone });
                        Swal.fire('Enviado', 'Pesquisa enviada com sucesso!', 'success');
                    } else {
                        Swal.fire('Aviso', 'Cliente sem telefone cadastrado.', 'warning');
                    }
                }

                loadData();
            }
        } catch (error) {
            console.error('❌ Error closing ticket:', error);
            console.error('Error response:', error.response?.data);
            Swal.fire('Erro', error.response?.data?.error || 'Falha ao encerrar chamado.', 'error');
        }
    };



    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!ticket) return <div>Chamado não encontrado</div>;

    const isClosed = ticket.status === 'closed';

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/tickets')}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Chamado #{String(ticket.ticket_number || ticket.id).padStart(3, '0')}
                            </h1>
                            <StatusBadge status={ticket.status} />
                        </div>
                        <p className="text-gray-600">
                            Aberto em {new Date(ticket.created_at).toLocaleString('pt-BR')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Details & Forms */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Ticket Info Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Detalhes da Solicitação
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">
                                            {ticket.customer
                                                ? (ticket.customer.full_name || ticket.customer.company_name)
                                                : ticket.non_customer_name
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{ticket.customer?.phone || ticket.non_customer_phone || 'Sem telefone'}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Motivo</label>
                                    <p className="font-medium text-gray-900 mt-1">{ticket.reason?.title}</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                                    <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {ticket.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Initial Response Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-purple-600" />
                                Resposta Inicial
                            </h2>

                            {!ticket.initial_response && !isClosed ? (
                                <div className="space-y-4">
                                    <textarea
                                        value={initialResponse}
                                        onChange={(e) => setInitialResponse(e.target.value)}
                                        placeholder="Digite a resposta inicial para o cliente..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-32 text-gray-900 bg-white"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleInitialResponse}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
                                        >
                                            <Save className="h-4 w-4" />
                                            Salvar Resposta
                                        </button>
                                        <WhatsAppButton ticket={ticket} />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                    <p className="text-gray-800">{ticket.initial_response || 'Nenhuma resposta registrada.'}</p>
                                    {ticket.initial_response_at && (
                                        <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Registrado em {new Date(ticket.initial_response_at).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status Management */}
                        {!isClosed && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <History className="h-5 w-5 text-blue-600" />
                                    Atualizar Status
                                </h2>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Novo Status</label>
                                            <select
                                                value={statusForm.status}
                                                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                            >
                                                <option value="open">Aberto</option>
                                                <option value="in_opening">Em Abertura (Travado)</option>
                                                <option value="in_execution">Em Execução</option>
                                                <option value="visit_scheduled">Visita Agendada</option>
                                                <option value="concessionaria">Concessionária</option>
                                                <option value="delayed">Atrasado</option>
                                                <option value="warranty">Garantia</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Execução</label>
                                            <input
                                                type="datetime-local"
                                                value={statusForm.execution_deadline}
                                                onChange={(e) => setStatusForm({ ...statusForm, execution_deadline: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Conditional Fields */}
                                    {statusForm.status === 'visit_scheduled' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
                                            <div>
                                                <label className="block text-sm font-medium text-purple-900 mb-1">Data da Visita</label>
                                                <input
                                                    type="datetime-local"
                                                    value={statusForm.visit_scheduled_at}
                                                    onChange={(e) => setStatusForm({ ...statusForm, visit_scheduled_at: e.target.value })}
                                                    className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-purple-900 mb-1">Responsável pela Visita</label>
                                                <select
                                                    value={statusForm.visit_responsible_id}
                                                    onChange={(e) => setStatusForm({ ...statusForm, visit_responsible_id: e.target.value })}
                                                    className="w-full p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 bg-white"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {employees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {statusForm.status === 'concessionaria' && (
                                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                            <label className="block text-sm font-medium text-indigo-900 mb-1">Status Concessionária</label>
                                            <select
                                                value={statusForm.concessionaria_substatus}
                                                onChange={(e) => setStatusForm({ ...statusForm, concessionaria_substatus: e.target.value })}
                                                className="w-full p-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 bg-white"
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="awaiting_first">Aguardando 1º Atendimento</option>
                                                <option value="registered">Atendimento Registrado</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Comentário da Atualização</label>
                                        <textarea
                                            value={statusForm.comment}
                                            onChange={(e) => setStatusForm({ ...statusForm, comment: e.target.value })}
                                            placeholder="Descreva o motivo da mudança de status..."
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 text-gray-900 bg-white"
                                        />
                                    </div>

                                    <button
                                        onClick={handleStatusUpdate}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                    >
                                        Atualizar Status
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Closing Section */}
                        {!isClosed ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    Encerrar Chamado
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Resposta de Fechamento</label>
                                        <textarea
                                            value={closingForm.closing_response}
                                            onChange={(e) => setClosingForm({ ...closingForm, closing_response: e.target.value })}
                                            placeholder="Resposta final para o cliente..."
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-24 text-gray-900 bg-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                                            <select
                                                value={closingForm.closing_status}
                                                onChange={(e) => setClosingForm({ ...closingForm, closing_status: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 bg-white"
                                            >
                                                <option value="attended">Demanda Atendida</option>
                                                <option value="not_attended">Demanda Não Atendida</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-avaliação (1-5)</label>
                                            <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setClosingForm({ ...closingForm, attendant_rating: star })}
                                                        className={`focus:outline-none ${star <= closingForm.attendant_rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                                    >
                                                        <Star className="h-6 w-6 fill-current" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCloseTicket}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg shadow-lg shadow-green-200 transition-all"
                                    >
                                        Encerrar Chamado
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
                                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                                <h2 className="text-xl font-bold text-green-900">Chamado Encerrado</h2>
                                <p className="text-green-700 mt-2">
                                    Encerrado em {new Date(ticket.closed_at).toLocaleString('pt-BR')}
                                </p>
                                <div className="mt-4 text-left bg-white p-4 rounded-lg border border-green-100">
                                    <p className="text-sm font-bold text-gray-500 uppercase">Resposta Final</p>
                                    <p className="text-gray-800 mt-1">{ticket.closing_response}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: History & Info */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <TimelineHistory history={history} ticketCreatedAt={ticket.created_at} />
                    </div>
                </div>
            </div>
        </div>
    );
}
