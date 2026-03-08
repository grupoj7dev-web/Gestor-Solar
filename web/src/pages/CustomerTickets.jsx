import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Calendar, User, Plus, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { tickets } from '../lib/api';

const StatusIndicator = ({ status }) => {
    const styles = {
        'open': { color: 'text-blue-600', bg: 'bg-blue-600', label: 'Em Aberto' },
        'in_opening': { color: 'text-red-600', bg: 'bg-red-600', label: 'Em Abertura' },
        'in_execution': { color: 'text-amber-600', bg: 'bg-amber-600', label: 'Em Execução' },
        'visit_scheduled': { color: 'text-purple-600', bg: 'bg-purple-600', label: 'Visita Agendada' },
        'concessionaria': { color: 'text-indigo-600', bg: 'bg-indigo-600', label: 'Concessionária' },
        'delayed': { color: 'text-red-600', bg: 'bg-red-600', label: 'Atrasado' },
        'warranty': { color: 'text-orange-600', bg: 'bg-orange-600', label: 'Garantia' },
        'closed': { color: 'text-green-600', bg: 'bg-green-600', label: 'Encerrado' }
    };

    const style = styles[status] || styles['open'];

    return (
        <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${style.bg}`} />
            <span className={`text-sm font-medium ${style.color}`}>{style.label}</span>
        </div>
    );
};

export function CustomerTickets() {
    const { customer } = useOutletContext();
    const navigate = useNavigate();
    const [customerTickets, setCustomerTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, [customer]);

    const fetchTickets = async () => {
        try {
            const data = await tickets.getAll({ customer_id: customer.id });
            setCustomerTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
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
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Chamados</h1>
                    <p className="text-gray-500 mt-1 text-sm">Gerencie suas solicitações de suporte</p>
                </div>
                <button
                    onClick={() => navigate('/tickets/new')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Novo Chamado
                </button>
            </div>

            {customerTickets.length === 0 ? (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-6">
                        <MessageSquare className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">Nenhum chamado</h3>
                    <p className="text-gray-500 text-sm mb-6">Você ainda não possui solicitações de suporte.</p>
                    <button
                        onClick={() => navigate('/tickets/new')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        Criar primeiro chamado
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {customerTickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                            className="group bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <StatusIndicator status={ticket.status} />
                                        <span className="text-xs font-mono text-gray-400">
                                            #{ticket.ticket_number}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {ticket.description}
                                    </h3>

                                    <div className="flex items-center gap-6 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        {ticket.initial_attendant && (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{ticket.initial_attendant.name}</span>
                                            </div>
                                        )}
                                        {ticket.reason && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                <span className="text-xs bg-gray-50 px-2 py-1 rounded">
                                                    {ticket.reason.title}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-shrink-0 self-center">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
