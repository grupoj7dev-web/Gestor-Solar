import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Info, Sun, TrendingUp, Receipt, AlertCircle,
    FileText, Zap, Ticket, Folder, Shield, Settings, ArrowLeft
} from 'lucide-react';

export function CustomerSidebar({ customer }) {
    const navigate = useNavigate();
    const location = useLocation();
    const customerId = customer?.id;

    const menuItems = [
        { icon: LayoutDashboard, label: 'Status', path: `/customers/${customerId}/status` },
        { icon: Info, label: 'Informações', path: `/customers/${customerId}/info` },
        { icon: Sun, label: 'Usina Fotovoltaica', path: `/customers/${customerId}/plant` },
        { icon: TrendingUp, label: 'Histórico de Geração', path: `/customers/${customerId}/generation` },
        { icon: AlertCircle, label: 'Alertas', path: `/customers/${customerId}/alerts` },

        { icon: Zap, label: 'Unidades Consumidoras', path: `/customers/${customerId}/consumer-units` },
        { icon: Ticket, label: 'Chamados', path: `/customers/${customerId}/tickets` },
        { icon: Folder, label: 'Documentos', path: `/customers/${customerId}/documents` },
        { icon: Settings, label: 'Parâmetros', path: `/customers/${customerId}/settings` },
    ];

    const isActive = (path) => location.pathname === path;

    const customerName = customer?.customer_type === 'pf'
        ? customer?.full_name
        : customer?.company_name;

    return (
        <div className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col h-screen">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <button
                    onClick={() => navigate('/customers')}
                    className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Voltar</span>
                </button>
                <h2 className="text-lg font-bold text-white truncate" title={customerName}>
                    {customerName || 'Cliente'}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                    {customer?.customer_type === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
            </div>

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto py-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-all ${active
                                ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white border-l-4 border-transparent'
                                }`}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 text-center">
                    Dashboard do Cliente
                </div>
            </div>
        </div>
    );
}
