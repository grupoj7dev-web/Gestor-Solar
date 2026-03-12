import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, AlertCircle, File, CreditCard, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { normalizeFileUrl } from '../lib/fileUrl';

export function CustomerDocuments() {
    const { customer } = useOutletContext();
    const [downloading, setDownloading] = useState({});
    const { error: notifyError } = useNotification();

    const documents = [
        {
            id: 'contract',
            title: 'Contrato de Prestao de Servios',
            description: 'Documento legal que formaliza o acordo entre as partes',
            icon: FileText,
            url: normalizeFileUrl(customer?.contract_file_url),
            type: 'PDF',
            color: 'blue'
        },
        {
            id: 'identification',
            title: customer?.document_type === 'cnh' ? 'Carteira Nacional de Habilitao' : customer?.document_type === 'rg' ? 'Registro Geral' : 'Documento de Identificao',
            description: customer?.document_type === 'cnh' ? 'CNH - Documento de identificao com foto' : customer?.document_type === 'rg' ? 'RG - Documento de identificao civil' : 'Documento de identificao pessoal',
            icon: CreditCard,
            url: normalizeFileUrl(customer?.document_file_url),
            type: customer?.document_type?.toUpperCase() || 'DOC',
            color: 'purple'
        }
    ];

    const handleView = (url) => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleDownload = async (docId, url, filename) => {
        if (!url) return;

        setDownloading(prev => ({ ...prev, [docId]: true }));

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading file:', error);
            notifyError('Erro ao baixar o arquivo.');
        } finally {
            setDownloading(prev => ({ ...prev, [docId]: false }));
        }
    };

    const colorClasses = {
        blue: {
            bg: 'bg-blue-50',
            icon: 'text-blue-600',
            badge: 'bg-blue-100 text-blue-700',
            button: 'bg-blue-600 hover:bg-blue-700'
        },
        purple: {
            bg: 'bg-purple-50',
            icon: 'text-purple-600',
            badge: 'bg-purple-100 text-purple-700',
            button: 'bg-purple-600 hover:bg-purple-700'
        }
    };

    const hasAnyDocument = documents.some(doc => doc.url);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Documentos</h1>
                <p className="text-gray-500 mt-1 text-sm">Contratos e documentos de identificao do cliente</p>
            </div>

            {!hasAnyDocument ? (
                <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-6">
                        <File className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum documento disponvel</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Os documentos do cliente sero exibidos aqui quando forem cadastrados no sistema.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {documents.map((doc) => {
                        const colors = colorClasses[doc.color];
                        const isAvailable = !!doc.url;

                        return (
                            <div
                                key={doc.id}
                                className={`bg-white rounded-2xl border ${isAvailable ? 'border-gray-100 shadow-sm hover:shadow-md' : 'border-gray-200 bg-gray-50'} transition-all overflow-hidden`}
                            >
                                {/* Header with icon and status */}
                                <div className={`${isAvailable ? colors.bg : 'bg-gray-100'} p-6 border-b ${isAvailable ? 'border-gray-100' : 'border-gray-200'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-14 h-14 ${isAvailable ? 'bg-white' : 'bg-gray-200'} rounded-xl flex items-center justify-center shadow-sm`}>
                                                <doc.icon className={`h-7 w-7 ${isAvailable ? colors.icon : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {doc.title}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {doc.description}
                                                </p>
                                            </div>
                                        </div>

                                        {isAvailable ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.badge}`}>
                                                    {doc.type}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-5 w-5 text-gray-400" />
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-200 text-gray-600">
                                                    Indisponvel
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-6">
                                    {isAvailable ? (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleView(doc.url)}
                                                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 ${colors.button} text-white rounded-xl transition-all text-sm font-medium shadow-sm`}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Visualizar
                                            </button>
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.url, `${doc.title}.pdf`)}
                                                disabled={downloading[doc.id]}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className={`h-4 w-4 ${downloading[doc.id] ? 'animate-bounce' : ''}`} />
                                                {downloading[doc.id] ? 'Baixando...' : 'Baixar'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-3 rounded-xl">
                                            <AlertCircle className="h-4 w-4" />
                                            <span>Este documento ainda no foi cadastrado no sistema</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}



