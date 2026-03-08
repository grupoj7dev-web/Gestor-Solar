import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    TrendingUp, Zap, AlertTriangle, Clock, CheckCircle,
    BarChart3, Download, Calendar, Activity, FileText
} from 'lucide-react';
import { api } from '../lib/api';
import { useNotification } from '../contexts/NotificationContext';

export function CustomerReports() {
    const { customer } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month'); // month, quarter, year
    const { info } = useNotification();
    const [reportData, setReportData] = useState({
        availability: 0,
        pr: 0,
        kwhPerKwp: 0,
        alarms: { critical: 0, warning: 0, info: 0 },
        tickets: { total: 0, open: 0, closed: 0, avgResolutionTime: 0 },
        sla: { compliance: 0, mtta: 0, mttr: 0 }
    });

    useEffect(() => {
        if (customer?.stations?.length > 0) {
            fetchReportData();
        } else {
            setLoading(false);
        }
    }, [customer, period]);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const station = customer.stations[0];
            if (!station?.station_id) return;

            const response = await api.get(`/stations/${station.station_id}/reports`, {
                params: { period }
            });

            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        // TODO: Implementar exportao para PDF
        info('Exportacao de PDF em desenvolvimento.');
    };

    const KPICard = ({ icon: Icon, title, value, unit, color = 'blue', trend }) => (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${color}-50`}>
                    <Icon className={`h-6 w-6 text-${color}-600`} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className={`h-4 w-4 ${trend < 0 ? 'rotate-180' : ''}`} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">
                {value}
                {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
            </p>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Relatrios</h1>
                    <p className="text-gray-500 mt-1">KPIs e mtricas de desempenho</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="month">ltimo Ms</option>
                        <option value="quarter">ltimo Trimestre</option>
                        <option value="year">ltimo Ano</option>
                    </select>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Exportar PDF
                    </button>
                </div>
            </div>

            {/* Disponibilidade e Performance */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Disponibilidade e Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard
                        icon={Activity}
                        title="Disponibilidade"
                        value={reportData.availability}
                        unit="%"
                        color="green"
                        trend={2.3}
                    />
                    <KPICard
                        icon={TrendingUp}
                        title="Performance Ratio (PR)"
                        value={reportData.pr}
                        unit="%"
                        color="blue"
                        trend={-1.2}
                    />
                    <KPICard
                        icon={Zap}
                        title="kWh/kWp"
                        value={reportData.kwhPerKwp}
                        unit="kWh/kWp"
                        color="yellow"
                        trend={3.5}
                    />
                </div>
            </div>

            {/* Alarmes */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Alarmes por Severidade</h2>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-50">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Crticos</p>
                                <p className="text-2xl font-bold text-gray-900">{reportData.alarms.critical}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-orange-50">
                                <AlertTriangle className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Ateno</p>
                                <p className="text-2xl font-bold text-gray-900">{reportData.alarms.warning}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-50">
                                <AlertTriangle className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Informativos</p>
                                <p className="text-2xl font-bold text-gray-900">{reportData.alarms.info}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SLA */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">SLA e Tempo de Resposta</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard
                        icon={CheckCircle}
                        title="Cumprimento SLA"
                        value={reportData.sla.compliance}
                        unit="%"
                        color="green"
                    />
                    <KPICard
                        icon={Clock}
                        title="MTTA (Tempo Mdio de Atendimento)"
                        value={reportData.sla.mtta}
                        unit="h"
                        color="blue"
                    />
                    <KPICard
                        icon={Clock}
                        title="MTTR (Tempo Mdio de Resoluo)"
                        value={reportData.sla.mttr}
                        unit="h"
                        color="purple"
                    />
                </div>
            </div>

            {/* Chamados */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Chamados</h2>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Total</p>
                            <p className="text-3xl font-bold text-gray-900">{reportData.tickets.total}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Abertos</p>
                            <p className="text-3xl font-bold text-orange-600">{reportData.tickets.open}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Fechados</p>
                            <p className="text-3xl font-bold text-green-600">{reportData.tickets.closed}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Tempo Mdio Resoluo</p>
                            <p className="text-3xl font-bold text-blue-600">{reportData.tickets.avgResolutionTime}h</p>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}


