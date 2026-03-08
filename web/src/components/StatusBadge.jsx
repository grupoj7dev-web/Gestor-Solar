import React from 'react';

const statusConfig = {
    'open': {
        label: 'Aberto',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '🆕'
    },
    'in_opening': {
        label: 'Em Abertura',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '⚠️'
    },
    'in_execution': {
        label: 'Em Execução',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⚙️'
    },
    'visit_scheduled': {
        label: 'Visita Agendada',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '📅'
    },
    'concessionaria': {
        label: 'Concessionária',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: '🏢'
    },
    'delayed': {
        label: 'Atrasado',
        color: 'bg-red-50 text-red-600 border-red-200 animate-pulse',
        icon: '⏰'
    },
    'warranty': {
        label: 'Garantia',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '🛡️'
    },
    'closed': {
        label: 'Encerrado',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅'
    },
    'resolved': {
        label: 'Resolvido',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅'
    }
};

export function StatusBadge({ status, className = '' }) {
    const config = statusConfig[status] || {
        label: status,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '❓'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
}
