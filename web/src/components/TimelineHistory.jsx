import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

const getStatusConfig = (status) => {
    const configs = {
        'initial_response_added': {
            label: 'Resposta Inicial',
            color: 'bg-purple-500',
            icon: MessageSquare,
            textColor: 'text-purple-700',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200'
        },
        'in_opening': {
            label: 'Em Abertura',
            color: 'bg-yellow-500',
            icon: Clock,
            textColor: 'text-yellow-700',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200'
        },
        'in_execution': {
            label: 'Em Execução',
            color: 'bg-blue-500',
            icon: Clock,
            textColor: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        },
        'visit_scheduled': {
            label: 'Visita Agendada',
            color: 'bg-indigo-500',
            icon: Clock,
            textColor: 'text-indigo-700',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200'
        },
        'closed': {
            label: 'Encerrado',
            color: 'bg-green-500',
            icon: CheckCircle,
            textColor: 'text-green-700',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        'delayed': {
            label: 'Atrasado',
            color: 'bg-red-500',
            icon: AlertCircle,
            textColor: 'text-red-700',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        },
        'warranty': {
            label: 'Garantia',
            color: 'bg-orange-500',
            icon: AlertCircle,
            textColor: 'text-orange-700',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200'
        },
        'concessionaria': {
            label: 'Concessionária',
            color: 'bg-indigo-500',
            icon: Clock,
            textColor: 'text-indigo-700',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200'
        }
    };

    return configs[status] || {
        label: status,
        color: 'bg-gray-500',
        icon: AlertCircle,
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
    };
};

export function TimelineHistory({ history, ticketCreatedAt }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Histórico do Chamado
            </h2>
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pl-6 py-2">
                {history.map((item, idx) => {
                    const config = getStatusConfig(item.status);
                    const Icon = config.icon;

                    return (
                        <div key={idx} className="relative">
                            <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full ${config.color} border-4 border-white shadow-sm`}></div>

                            <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`h-4 w-4 ${config.textColor}`} />
                                    <p className={`text-sm font-bold ${config.textColor}`}>
                                        {config.label}
                                    </p>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {new Date(item.created_at).toLocaleString('pt-BR')}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {item.comment}
                                </p>

                                {item.changed_by_employee && (
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <span className="font-medium">Responsável:</span>
                                        {item.changed_by_employee.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Ticket Created */}
                <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-gray-400 border-4 border-white shadow-sm"></div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-gray-600" />
                            <p className="text-sm font-bold text-gray-700">Chamado Criado</p>
                            <span className="text-xs text-gray-500 ml-auto">
                                {new Date(ticketCreatedAt).toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600">Início do atendimento</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
