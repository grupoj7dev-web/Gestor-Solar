import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tickets } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import {
    Plus, Search, Filter, Clock, User, FileText,
    Calendar, ChevronRight
} from 'lucide-react';
import { VirtualizedList } from '../components/VirtualizedList';

export function TicketList() {
    const [ticketList, setTicketList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadTickets();
    }, [filterStatus]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;

            const data = await tickets.getAll(params);
            setTicketList(data);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = ticketList.filter(ticket => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            (ticket.ticket_number || '').toLowerCase().includes(search) ||
            (ticket.description || '').toLowerCase().includes(search) ||
            (ticket.customer?.full_name || '').toLowerCase().includes(search) ||
            (ticket.non_customer_name || '').toLowerCase().includes(search)
        );
    });

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-50 border-red-100';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Média';
            case 'low': return 'Baixa';
            default: return priority;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Chamados</h1>
                        <p className="text-gray-600 mt-1">Gerencie solicitações e atendimentos</p>
                    </div>
                    <Link
                        to="/tickets/new"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="h-5 w-5" />
                        Novo Chamado
                    </Link>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por número, cliente ou descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                                >
                                    <option value="">Todos os Status</option>
                                    <option value="open">Aberto</option>
                                    <option value="in_opening">Em Abertura</option>
                                    <option value="in_execution">Em Execução</option>
                                    <option value="visit_scheduled">Visita Agendada</option>
                                    <option value="concessionaria">Concessionária</option>
                                    <option value="delayed">Atrasado</option>
                                    <option value="warranty">Garantia</option>
                                    <option value="closed">Encerrado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhum chamado encontrado</h3>
                        <p className="text-gray-500">Tente ajustar os filtros ou crie um novo chamado.</p>
                    </div>
                ) : (
                    <VirtualizedList
                        items={filteredTickets}
                        itemHeight={180}
                        containerClassName="h-[68vh] overflow-auto"
                        className="grid gap-4"
                        renderItem={(ticket) => (
                            <Link
                                key={ticket.id}
                                to={`/tickets/${ticket.id}`}
                                className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono text-sm font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                #{ticket.ticket_number}
                                            </span>
                                            <StatusBadge status={ticket.status} />
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getPriorityColor(ticket.priority)}`}>
                                                {getPriorityLabel(ticket.priority)}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                                            {ticket.reason?.title || 'Sem motivo especificado'}
                                        </h3>

                                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                            {ticket.description}
                                        </p>

                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <User className="h-4 w-4" />
                                                <span className="truncate max-w-[200px]">
                                                    {ticket.customer
                                                        ? (ticket.customer.full_name || ticket.customer.company_name)
                                                        : (ticket.non_customer_name || 'Cliente Desconhecido')
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            {ticket.execution_deadline && (
                                                <div className="flex items-center gap-1.5 text-orange-600">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        Prazo: {new Date(ticket.execution_deadline).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="self-center">
                                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        )}
                    />
                )}
            </div>
        </div>
    );
}
