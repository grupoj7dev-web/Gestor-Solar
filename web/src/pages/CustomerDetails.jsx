import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, tickets } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft, User, Building, MapPin, Phone, Mail,
    Zap, Activity, Ticket, Edit, Calendar, Clock
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function CustomerDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [customerTickets, setCustomerTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [customerRes, ticketsRes] = await Promise.all([
                api.get(`/customers/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                tickets.getAll({ customer_id: id })
            ]);

            setCustomer(customerRes.data);
            setCustomerTickets(ticketsRes);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (phone) => {
        if (!phone) return 'Não informado';
        if (phone.length === 11) return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    };

    const formatDoc = (doc, type) => {
        if (!doc) return 'Não informado';
        if (type === 'pf') return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Cliente não encontrado</h2>
                <button onClick={() => navigate('/customers')} className="mt-4 text-blue-600 hover:underline">
                    Voltar para lista
                </button>
            </div>
        );
    }

    const isPF = customer.customer_type === 'pf';

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header Background */}
            <div className={`h-48 ${isPF ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-purple-600 to-purple-800'}`}></div>

            <div className="max-w-7xl mx-auto px-6 -mt-24">
                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="flex items-start gap-6">
                                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white shadow-lg ${isPF ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                    {isPF ? <User className="h-10 w-10" /> : <Building className="h-10 w-10" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl font-bold text-gray-900">
                                            {isPF ? customer.full_name : customer.company_name}
                                        </h1>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${isPF ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                            {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 font-medium flex items-center gap-2">
                                        {formatDoc(isPF ? customer.cpf : customer.cnpj, customer.customer_type)}
                                        {customer.trade_name && <span className="text-gray-400">• {customer.trade_name}</span>}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/customers/wizard/edit/${id}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                                Editar
                            </button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mt-10 pt-8 border-t border-gray-100">
                            {/* Contact */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contato</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="p-2 bg-gray-50 rounded-lg"><Mail className="h-4 w-4 text-gray-500" /></div>
                                        <span className="font-medium">{customer.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="p-2 bg-gray-50 rounded-lg"><Phone className="h-4 w-4 text-gray-500" /></div>
                                        <span className="font-medium">{formatPhone(customer.phone)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Endereço</h3>
                                <div className="flex items-start gap-3 text-gray-700">
                                    <div className="p-2 bg-gray-50 rounded-lg"><MapPin className="h-4 w-4 text-gray-500" /></div>
                                    <div>
                                        <p className="font-medium">{customer.street}, {customer.number}</p>
                                        <p className="text-sm text-gray-500">{customer.neighborhood} - {customer.city}/{customer.state}</p>
                                        <p className="text-sm text-gray-500">CEP: {customer.cep}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Contact */}
                            {(customer.additional_contact_name || customer.additional_contact_phone) && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contato Adicional</h3>
                                    <div className="space-y-3">
                                        {customer.additional_contact_name && (
                                            <div className="flex items-center gap-3 text-gray-700">
                                                <div className="p-2 bg-gray-50 rounded-lg"><User className="h-4 w-4 text-gray-500" /></div>
                                                <span className="font-medium">{customer.additional_contact_name}</span>
                                            </div>
                                        )}
                                        {customer.additional_contact_phone && (
                                            <div className="flex items-center gap-3 text-gray-700">
                                                <div className="p-2 bg-gray-50 rounded-lg"><Phone className="h-4 w-4 text-gray-500" /></div>
                                                <span className="font-medium">{formatPhone(customer.additional_contact_phone)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column: Linked Items */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Inverters */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-yellow-50 rounded-lg"><Zap className="h-5 w-5 text-yellow-600" /></div>
                                <h3 className="font-bold text-gray-900">Inversores Vinculados</h3>
                                <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {customer.inverters?.length || 0}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {customer.inverters?.map((link) => (
                                    <div key={link.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="font-bold text-gray-900 text-sm">{link.inverter.brand} {link.inverter.model}</p>
                                        <p className="text-xs text-gray-500 mt-1">SN: {link.inverter.serial_number}</p>
                                        {link.notes && <p className="text-xs text-gray-400 mt-2 italic">"{link.notes}"</p>}
                                    </div>
                                ))}
                                {(!customer.inverters || customer.inverters.length === 0) && (
                                    <p className="text-sm text-gray-500 text-center py-4">Nenhum inversor vinculado</p>
                                )}
                            </div>
                        </div>

                        {/* Stations */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-50 rounded-lg"><Activity className="h-5 w-5 text-green-600" /></div>
                                <h3 className="font-bold text-gray-900">Plantas Solarman</h3>
                                <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {customer.stations?.length || 0}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {customer.stations?.map((link) => (
                                    <div key={link.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="font-bold text-gray-900 text-sm">{link.station_name}</p>
                                        <p className="text-xs text-gray-500 mt-1">ID: {link.station_id}</p>
                                        {link.notes && <p className="text-xs text-gray-400 mt-2 italic">"{link.notes}"</p>}
                                    </div>
                                ))}
                                {(!customer.stations || customer.stations.length === 0) && (
                                    <p className="text-sm text-gray-500 text-center py-4">Nenhuma planta vinculada</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Tickets */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg"><Ticket className="h-5 w-5 text-blue-600" /></div>
                                    <h3 className="font-bold text-gray-900">Histórico de Chamados</h3>
                                </div>
                                <button
                                    onClick={() => navigate('/tickets/new')}
                                    className="text-sm text-blue-600 font-medium hover:underline"
                                >
                                    + Novo Chamado
                                </button>
                            </div>

                            <div className="space-y-4">
                                {customerTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                    >
                                        <div className="flex-shrink-0">
                                            <StatusBadge status={ticket.status} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono text-gray-500">#{ticket.ticket_number}</span>
                                                <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                                    {ticket.description}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                {ticket.initial_attendant && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {ticket.initial_attendant.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ArrowLeft className="h-5 w-5 text-gray-300 rotate-180 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                                {customerTickets.length === 0 && (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Ticket className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">Nenhum chamado encontrado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
