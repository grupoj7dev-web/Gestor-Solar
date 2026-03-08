import React from 'react';
import { Info } from 'lucide-react';

export function CustomerInformation() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Informações</h1>
                    <p className="text-gray-500 mt-1">Configurações e informações gerais</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Info className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Em Desenvolvimento</h3>
                    <p className="text-gray-500">As configurações estarão disponíveis em breve.</p>
                </div>
            </div>
        </div>
    );
}
