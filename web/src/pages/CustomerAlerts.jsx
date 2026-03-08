import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    AlertTriangle, AlertCircle, Info, CheckCircle,
    Calendar, Server, Activity, RefreshCw, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { api, solarman } from '../lib/api';

const AlertCard = ({ alert, stationId }) => {
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const result = await solarman.analyzeAlert({
                alertName: alert.showName || alert.name,
                deviceType: alert.deviceType,
                message: alert.msg,
                stationId: stationId,
                deviceSn: alert.deviceSn
            });
            setAnalysis(result);
            setExpanded(true);
        } catch (e) {
            console.error('Error analyzing alert:', e);
        } finally {
            setAnalyzing(false);
        }
    };

    const getSeverityInfo = (level) => {
        switch (level) {
            case 1:
            case '1':
                return {
                    color: 'red',
                    label: 'Crítico',
                    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
                    bg: 'bg-red-50',
                    border: 'border-red-100'
                };
            case 2:
            case '2':
                return {
                    color: 'orange',
                    label: 'Atenção',
                    icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
                    bg: 'bg-orange-50',
                    border: 'border-orange-100'
                };
            default:
                return {
                    color: 'blue',
                    label: 'Info',
                    icon: <Info className="h-5 w-5 text-blue-600" />,
                    bg: 'bg-blue-50',
                    border: 'border-blue-100'
                };
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString('pt-BR');
    };

    const severity = getSeverityInfo(alert.level);

    return (
        <div className={`bg-white rounded-xl p-6 border ${severity.border} shadow-sm hover:shadow-md transition-all`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${severity.bg} flex-shrink-0`}>
                    {severity.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">
                                {alert.showName || alert.name || 'Alerta Desconhecido'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Código: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{alert.code}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${severity.bg} text-${severity.color}-700`}>
                                {severity.label}
                            </span>
                            {!analysis && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={analyzing}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                                >
                                    {analyzing ? (
                                        <>
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
                                            Analisando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3 w-3" />
                                            Analisar com I.A
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(alert.alertTime)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Server className="h-4 w-4 text-gray-400" />
                            <span className="truncate" title={alert.deviceSn}>
                                SN: {alert.deviceSn}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span>{alert.deviceType || 'Dispositivo'}</span>
                        </div>
                    </div>

                    {analysis && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 mb-3"
                            >
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                Análise com I.A
                            </button>

                            {expanded && (
                                <div className="space-y-3 bg-blue-50 rounded-lg p-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Diagnóstico:</h4>
                                        <p className="text-gray-700 text-sm">{analysis.meaning || analysis.diagnosis}</p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Solução Recomendada:</h4>
                                        <p className="text-gray-700 text-sm whitespace-pre-line">{analysis.advice || analysis.solution}</p>
                                    </div>

                                    {analysis.urgency && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm mb-1">Urgência:</h4>
                                            <p className="text-gray-700 text-sm">{analysis.urgency}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export function CustomerAlerts() {
    const { customer } = useOutletContext();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (customer?.stations?.length > 0) {
            fetchAlerts();
        } else {
            setLoading(false);
        }
    }, [customer]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const station = customer.stations[0];
            if (!station?.station_id) return;

            const response = await api.get(`/stations/${station.station_id}/alerts`);
            const alertsList = response.data.stationAlertItems || response.data.alertList || [];
            setAlerts(alertsList);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && alerts.length === 0) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Alertas</h1>
                    <p className="text-gray-500 mt-1">Histórico de eventos e falhas da usina</p>
                </div>
                <button
                    onClick={fetchAlerts}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="Atualizar lista"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            {alerts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tudo Certo!</h3>
                    <p className="text-gray-500">Nenhum alerta registrado nos últimos 30 dias.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map((alert, index) => (
                        <AlertCard
                            key={index}
                            alert={alert}
                            stationId={customer.stations[0]?.station_id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
