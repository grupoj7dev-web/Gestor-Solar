import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { tickets, api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Search, Filter, AlertCircle, CheckCircle, Clock,
    MoreVertical, Calendar, User, Zap, Settings
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ColumnManager } from '../components/ColumnManager';
import Swal from 'sweetalert2';

export function TicketKanban() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [allTickets, setAllTickets] = useState([]);
    const [columns, setColumns] = useState([]); // Array of column definitions
    const [ticketsByColumn, setTicketsByColumn] = useState({}); // Map of tickets by column ID
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [draggingId, setDraggingId] = useState(null);
    const [showColumnManager, setShowColumnManager] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [ticketsData, columnsData] = await Promise.all([
                tickets.getAll(),
                tickets.getColumns()
            ]);

            setAllTickets(ticketsData);
            setColumns(columnsData);
            organizeTickets(ticketsData, columnsData);
        } catch (error) {
            console.error('Error loading data:', error);
            Swal.fire('Erro', 'Falha ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    };

    const organizeTickets = (ticketList, columnList) => {
        const newTicketsByColumn = {};

        // Initialize all columns
        columnList.forEach(col => {
            newTicketsByColumn[col.id] = [];
        });

        // Distribute tickets
        ticketList.forEach(ticket => {
            // Find column that matches ticket status
            const column = columnList.find(c => c.status_key === ticket.status);
            if (column) {
                newTicketsByColumn[column.id].push(ticket);
            } else {
                // Fallback for tickets with status not in any column (shouldn't happen often)
                // Maybe put in first column or a "Uncategorized" bucket?
                // For now, let's just log it
                console.warn(`Ticket ${ticket.ticket_number} has status '${ticket.status}' which doesn't match any column.`);
            }
        });

        setTicketsByColumn(newTicketsByColumn);
    };

    useEffect(() => {
        if (allTickets.length > 0 && columns.length > 0) {
            const filtered = allTickets.filter(t =>
                t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            organizeTickets(filtered, columns);
        }
    }, [searchTerm, allTickets, columns]);

    const handleDragStart = (e, ticketId) => {
        e.dataTransfer.setData('ticketId', ticketId);
        setDraggingId(ticketId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, targetColumnId) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('ticketId');
        setDraggingId(null);

        const sourceColumnId = Object.keys(ticketsByColumn).find(key =>
            ticketsByColumn[key].find(t => t.id === ticketId)
        );

        if (sourceColumnId === targetColumnId) return;

        // Find target column definition to get status_key
        const targetColumn = columns.find(c => c.id === targetColumnId);
        if (!targetColumn) return;

        const newStatus = targetColumn.status_key;

        // Optimistic update
        const ticket = allTickets.find(t => t.id === ticketId);
        const updatedTicket = { ...ticket, status: newStatus };
        const newAllTickets = allTickets.map(t => t.id === ticketId ? updatedTicket : t);

        setAllTickets(newAllTickets);
        organizeTickets(newAllTickets, columns);

        try {
            // Call API
            await tickets.updateStatus(ticketId, {
                status: newStatus,
                changed_by_name: user.email || 'Usuário',
                comment: `Movido para ${targetColumn.title}`
            });
        } catch (error) {
            console.error('Error updating status:', error);
            const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Falha ao atualizar status';
            Swal.fire('Erro ao Mover Chamado', errorMessage, 'error');
            loadData(); // Revert
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Kanban de Chamados</h1>
                    <button
                        onClick={() => setShowColumnManager(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Gerenciar Colunas"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar chamados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                        />
                    </div>
                    <button
                        onClick={() => navigate('/tickets/new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                        + Novo Chamado
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-6 h-full min-w-max">
                    {columns.map(column => (
                        <div
                            key={column.id}
                            className={`w-80 flex flex-col rounded-xl border ${column.color} bg-opacity-50 h-full`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/50 rounded-t-xl">
                                <h3 className="font-bold text-gray-800">{column.title}</h3>
                                <span className="bg-white px-2 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm">
                                    {ticketsByColumn[column.id]?.length || 0}
                                </span>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                <AnimatePresence>
                                    {ticketsByColumn[column.id]?.map(ticket => (
                                        <motion.div
                                            key={ticket.id}
                                            layoutId={ticket.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, ticket.id)}
                                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                                            className={`
                                                bg-white p-4 rounded-lg shadow-sm border border-gray-200 
                                                cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow
                                                ${draggingId === ticket.id ? 'opacity-50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-mono text-gray-500">#{ticket.ticket_number}</span>
                                                {ticket.priority === 'high' && (
                                                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                                        Urgente
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="font-bold text-gray-900 mb-1 line-clamp-2">
                                                {ticket.customer?.full_name || ticket.customer?.company_name || ticket.non_customer_name}
                                            </h4>

                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                {ticket.description}
                                            </p>

                                            <div className="flex flex-col gap-2 mt-auto">
                                                {ticket.execution_deadline && (
                                                    <div className={`flex items-center gap-1 text-xs ${new Date(ticket.execution_deadline) < new Date() && ticket.status !== 'closed'
                                                        ? 'text-red-600 font-bold'
                                                        : 'text-gray-500'
                                                        }`}>
                                                        <Clock className="h-3 w-3" />
                                                        <span>{new Date(ticket.execution_deadline).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <User className="h-3 w-3" />
                                                        <span>{ticket.initial_attendant?.name?.split(' ')[0] || 'N/A'}</span>
                                                    </div>
                                                    {ticket.customer?.customer_type && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                            {ticket.customer.customer_type === 'integrator' ? 'Integrador' : 'Final'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {showColumnManager && (
                    <ColumnManager
                        onClose={() => setShowColumnManager(false)}
                        onUpdate={loadData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
