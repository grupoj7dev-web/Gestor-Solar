import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Link2, RotateCw, Zap } from 'lucide-react';
import { integrations as integrationApi } from '../../lib/api';
import { LoadingState, ErrorState } from '../../components/feedback';

function cardStyle(connected, configured) {
    if (!configured) {
        return {
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            label: 'Nao configurada',
            Icon: AlertTriangle
        };
    }
    if (connected) {
        return {
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-200 dark:border-emerald-800',
            label: 'Ativa',
            Icon: CheckCircle2
        };
    }
    return {
        color: 'text-red-600',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        label: 'Com falha',
        Icon: AlertTriangle
    };
}

export function Integrations() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [status, setStatus] = useState(null);

    const loadStatus = useCallback(async () => {
        setError('');
        try {
            const data = await integrationApi.getStatus();
            setStatus(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Falha ao carregar status das integracoes.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const cards = useMemo(() => {
        if (!status) return [];
        return [
            {
                id: 'solarman',
                name: 'Solarman',
                description: 'Plataforma principal para monitoramento de usinas e inversores.',
                connected: Boolean(status.solarman?.connected),
                configured: true,
                details: [
                    `Total de usinas: ${status.solarman?.details?.totalStations ?? '-'}`,
                ]
            },
            {
                id: 'solis',
                name: 'Solis',
                description: 'Integracao adicional para telemetria e consulta de dados dos inversores.',
                connected: Boolean(status.solis?.connected),
                configured: Boolean(status.solis?.configured),
                details: [
                    `Total de usinas: ${status.solis?.details?.stationsTotal ?? '-'}`,
                    `Total de inversores: ${status.solis?.details?.invertersTotal ?? '-'}`,
                    status.solis?.details?.apiMessage ? `Mensagem API: ${status.solis.details.apiMessage}` : null,
                    status.solis?.details?.error ? `Erro: ${status.solis.details.error}` : null,
                ].filter(Boolean)
            },
            {
                id: 'deye',
                name: 'Deye Cloud',
                description: 'Integracao adicional de usinas e inversores da Deye.',
                connected: Boolean(status.deye?.connected),
                configured: Boolean(status.deye?.configured),
                details: [
                    `Total de usinas (origem): ${status.deye?.details?.stationsTotal ?? '-'}`,
                    `Usinas apos deduplicacao: ${status.deye?.details?.filteredStationsTotal ?? '-'}`,
                    `Removidas por duplicidade (inversor): ${status.deye?.details?.removedByDuplicateInverter ?? '-'}`,
                    status.deye?.details?.error ? `Erro: ${status.deye.details.error}` : null,
                ].filter(Boolean)
            }
        ];
    }, [status]);

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <LoadingState title="Carregando integracoes" description="Consultando status em tempo real." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <ErrorState
                    title="Falha ao carregar integracoes"
                    description={error}
                    onRetry={loadStatus}
                />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integracoes</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Provedores externos conectados ao sistema.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setRefreshing(true);
                        loadStatus();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    disabled={refreshing}
                >
                    <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cards.map((item) => {
                    const style = cardStyle(item.connected, item.configured);
                    const StatusIcon = style.Icon;
                    return (
                        <article
                            key={item.id}
                            className={`rounded-xl border p-6 bg-white dark:bg-gray-800 shadow-sm ${style.border}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${style.bg}`}>
                                        <Link2 className={`h-5 w-5 ${style.color}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {item.name}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.color}`}>
                                    <StatusIcon className="h-4 w-4" />
                                    {style.label}
                                </span>
                            </div>

                            <div className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Status de conexao monitorado
                                </div>
                                {item.details.map((line) => (
                                    <div key={line} className="text-xs text-gray-500 dark:text-gray-400">{line}</div>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
