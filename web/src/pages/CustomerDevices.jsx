import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Cpu, Zap, AlertCircle } from 'lucide-react';

export function CustomerDevices() {
    const { customer } = useOutletContext();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dispositivos</h1>
                    <p className="text-gray-500 mt-1">Inversores e equipamentos vinculados</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customer?.inverters?.map((link) => (
                        <div key={link.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-yellow-50 rounded-xl">
                                    <Zap className="h-6 w-6 text-yellow-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{link.inverter.brand} {link.inverter.model}</h3>
                                    <p className="text-sm text-gray-500">SN: {link.inverter.serial_number}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Potência:</span>
                                    <span className="font-medium text-gray-900">{link.inverter.power_kw} kW</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tipo:</span>
                                    <span className="font-medium text-gray-900">{link.inverter.type}</span>
                                </div>
                            </div>
                            {link.notes && (
                                <p className="mt-4 text-xs text-gray-400 italic border-t border-gray-100 pt-4">
                                    "{link.notes}"
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {(!customer?.inverters || customer.inverters.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum dispositivo vinculado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
