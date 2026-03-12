import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    User, Building, Mail, Phone, MapPin, FileText, Zap, Download, ExternalLink, File,
    Users, DollarSign, Package, CheckCircle, XCircle, Home, Briefcase
} from 'lucide-react';
import { normalizeFileUrl } from '../lib/fileUrl';

export function CustomerInfo() {
    const { customer } = useOutletContext();

    const isPF = customer?.customer_type === 'pf';

    const formatDoc = (doc, type) => {
        if (!doc) return 'Não informado';
        if (type === 'pf') return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatPhone = (phone) => {
        if (!phone) return 'Não informado';
        if (phone.length === 11) return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    };

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getFileType = (url) => {
        if (!url) return null;
        const extension = url.split('.').pop().toLowerCase();
        return extension === 'pdf' ? 'pdf' : 'image';
    };

    const DocumentCard = ({ title, url, type }) => {
        if (!url) {
            return (
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200">
                    <div className="flex flex-col items-center justify-center text-center py-4">
                        <FileText className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <p className="text-xs text-gray-400 mt-1">Não enviado</p>
                    </div>
                </div>
            );
        }

        const resolvedUrl = normalizeFileUrl(url);
        const fileType = getFileType(resolvedUrl);
        const isImage = fileType === 'image';

        return (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-400 transition-all group">
                <div className="relative bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                    {isImage ? (
                        <img src={resolvedUrl} alt={title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6">
                            <File className="h-16 w-16 text-red-500 mb-2" />
                            <p className="text-xs font-medium text-gray-500 uppercase">PDF</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Visualizar
                        </a>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-900">{title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {type && `${type.toUpperCase()} • `}
                                {isImage ? 'Imagem' : 'PDF'}
                            </p>
                        </div>
                        <a
                            href={resolvedUrl}
                            download
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Baixar arquivo"
                        >
                            <Download className="h-5 w-5 text-gray-600" />
                        </a>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Informações do Cliente</h1>
                    <p className="text-gray-500 mt-1">Dados cadastrais e documentos</p>
                </div>

                {/* Main Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                    <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                        <div className={`p-4 rounded-2xl ${isPF ? 'bg-blue-50' : 'bg-purple-50'}`}>
                            {isPF ? <User className="h-8 w-8 text-blue-600" /> : <Building className="h-8 w-8 text-purple-600" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isPF ? customer.full_name : customer.company_name}
                            </h2>
                            <p className="text-gray-500">{formatDoc(isPF ? customer.cpf : customer.cnpj, customer.customer_type)}</p>
                            {isPF && customer.rg && (
                                <p className="text-sm text-gray-400 mt-1">RG: {customer.rg}</p>
                            )}
                            {!isPF && customer.trade_name && (
                                <p className="text-sm text-gray-400 mt-1">Nome Fantasia: {customer.trade_name}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Contato</h3>
                            <div className="flex items-center gap-3 text-gray-700">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-700">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <span>{formatPhone(customer.phone)}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Endereço</h3>
                            <div className="flex items-start gap-3 text-gray-700">
                                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                                <div>
                                    <p>{customer.street}, {customer.number}</p>
                                    {customer.complement && <p>{customer.complement}</p>}
                                    <p>{customer.neighborhood}</p>
                                    <p>{customer.city}/{customer.state}</p>
                                    <p className="text-sm text-gray-500">CEP: {customer.cep}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Holder Info (if different) */}
                {customer.has_different_holder && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Home className="h-6 w-6 text-amber-600" />
                            <h3 className="text-xl font-bold text-gray-900">Titular da Instalação</h3>
                            <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-3 py-1 rounded-full font-medium">
                                Diferente do Contratante
                            </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Nome</p>
                                    <p className="text-gray-900 font-semibold">{customer.holder_name || 'Não informado'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Documento</p>
                                    <p className="text-gray-900">{formatDoc(customer.holder_document, customer.holder_type)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Grau de Vínculo</p>
                                    <p className="text-gray-900 capitalize">{customer.holder_relationship || 'Não informado'}</p>
                                </div>
                            </div>
                            {(customer.holder_email || customer.holder_phone) && (
                                <div className="space-y-3">
                                    {customer.holder_email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{customer.holder_email}</span>
                                        </div>
                                    )}
                                    {customer.holder_phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{formatPhone(customer.holder_phone)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Contacts */}
                {customer.contacts && customer.contacts.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Users className="h-6 w-6 text-indigo-500" />
                            <h3 className="text-xl font-bold text-gray-900">Contatos Adicionais</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {customer.contacts.map((contact, i) => (
                                <div key={i} className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                                    <p className="font-semibold text-gray-900 mb-2">{contact.name}</p>
                                    <div className="space-y-2">
                                        {contact.phone && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-700">{formatPhone(contact.phone)}</span>
                                                {contact.phone_verified_at && (
                                                    <CheckCircle className="h-4 w-4 text-green-500" title="Verificado" />
                                                )}
                                            </div>
                                        )}
                                        {contact.email && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-700">{contact.email}</span>
                                                {contact.email_verified_at && (
                                                    <CheckCircle className="h-4 w-4 text-green-500" title="Verificado" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Consumer Units - Enhanced */}
                {customer.consumer_units && customer.consumer_units.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Zap className="h-6 w-6 text-yellow-500" />
                            <h3 className="text-xl font-bold text-gray-900">Unidades Consumidoras</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {customer.consumer_units.map((u, i) => (
                                <div key={i} className={`rounded-xl p-5 border-2 ${u.unit_type === 'geradora' ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">UC {i + 1}</p>
                                            <p className="text-2xl font-bold text-gray-900">{u.unit_number}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {u.is_primary && (
                                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                                                    Principal
                                                </span>
                                            )}
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.unit_type === 'geradora' ? 'bg-yellow-200 text-yellow-800' : 'bg-purple-200 text-purple-800'}`}>
                                                {u.unit_type === 'geradora' ? 'Geradora' : 'Beneficiária'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {u.unit_type === 'geradora' ? (
                                            <>
                                                {u.generation_kwh_month && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Geração:</span>
                                                        <span className="font-semibold text-gray-900">{u.generation_kwh_month} kWh/mês</span>
                                                    </div>
                                                )}
                                                {u.plant_power_kwp && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Potência:</span>
                                                        <span className="font-semibold text-gray-900">{u.plant_power_kwp} kWp</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {u.expected_rateio_kwh_month && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Rateio Previsto:</span>
                                                        <span className="font-semibold text-gray-900">{u.expected_rateio_kwh_month} kWh/mês</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {u.bill_file_url && (
                                            <a
                                                href={normalizeFileUrl(u.bill_file_url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-2"
                                            >
                                                <FileText className="h-4 w-4" />
                                                <span className="text-xs font-medium">Ver Fatura</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Documents - Complete */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <FileText className="h-6 w-6 text-blue-500" />
                        <h3 className="text-xl font-bold text-gray-900">Documentos</h3>
                    </div>

                    {/* Contract Documents */}
                    <div className="mb-8">
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-400" />
                            Documentos Contratuais
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <DocumentCard title="ID do Contratante" url={customer.contractor_id_file_url} />
                            <DocumentCard title="ID do Titular" url={customer.holder_id_file_url} />
                            <DocumentCard title="Contrato da Usina" url={customer.plant_contract_file_url} />
                        </div>
                    </div>

                    {/* Project Documents */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-gray-400" />
                            Documentos do Projeto
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <DocumentCard title="Procuração" url={customer.proxy_file_url} />
                            <DocumentCard title="ART" url={customer.art_file_url} />
                            <DocumentCard title="INMETRO Módulo" url={customer.module_inmetro_file_url} />
                            <DocumentCard title="Datasheet Inversor" url={customer.inverter_datasheet_file_url} />
                            <DocumentCard title="Datasheet Módulo" url={customer.module_datasheet_file_url} />
                            <DocumentCard title="Registro Gerador" url={customer.generator_registration_file_url} />
                            <DocumentCard title="Diagrama" url={customer.diagram_file_url} />
                            <DocumentCard title="Memorial" url={customer.memorial_file_url} />
                            <DocumentCard title="Solicitação de Acesso" url={customer.access_request_file_url} />
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                {(customer.sale_total_value || (customer.financial_conditions && customer.financial_conditions.length > 0)) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <DollarSign className="h-6 w-6 text-green-500" />
                            <h3 className="text-xl font-bold text-gray-900">Informações Financeiras</h3>
                        </div>

                        {customer.sale_total_value && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 mb-6">
                                <p className="text-sm font-medium text-gray-600 mb-1">Valor Total da Venda</p>
                                <p className="text-3xl font-bold text-green-700">{formatCurrency(customer.sale_total_value)}</p>
                            </div>
                        )}

                        {customer.financial_conditions && customer.financial_conditions.length > 0 && (
                            <div className="space-y-4">
                                {customer.financial_conditions.map((condition, i) => (
                                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-gray-900">
                                                    Condição {i + 1} - {condition.type?.toUpperCase()}
                                                </h4>
                                                <span className="text-sm text-gray-500">
                                                    {condition.installments_count || condition.installments?.length} parcelas
                                                </span>
                                            </div>
                                        </div>
                                        {condition.installments && condition.installments.length > 0 && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Parcela</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {condition.installments.map((inst, j) => (
                                                            <tr key={j} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 text-sm text-gray-900">{inst.number}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inst.date)}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(inst.value)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {inst.confirmed ? (
                                                                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                                            <CheckCircle className="h-3 w-3" />
                                                                            Confirmado
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                                                                            <XCircle className="h-3 w-3" />
                                                                            Pendente
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Kit Details */}
                {customer.kit_details && (Object.keys(customer.kit_details.inverter1 || {}).length > 0 || Object.keys(customer.kit_details.modules || {}).length > 0) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Package className="h-6 w-6 text-purple-500" />
                            <h3 className="text-xl font-bold text-gray-900">Detalhes do Kit</h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Inverters */}
                            {customer.kit_details.inverter1 && Object.keys(customer.kit_details.inverter1).length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-blue-600" />
                                        Inversor 1
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        {customer.kit_details.inverter1.brand && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Marca:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter1.brand}</span>
                                            </div>
                                        )}
                                        {customer.kit_details.inverter1.model && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Modelo:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter1.model}</span>
                                            </div>
                                        )}
                                        {customer.kit_details.inverter1.power && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Potência:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter1.power} kW</span>
                                            </div>
                                        )}
                                        {customer.kit_details.inverter1.qty && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Quantidade:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter1.qty}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {customer.kit_details.inverter2 && Object.keys(customer.kit_details.inverter2).length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-blue-600" />
                                        Inversor 2
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        {customer.kit_details.inverter2.brand && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Marca:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter2.brand}</span>
                                            </div>
                                        )}
                                        {customer.kit_details.inverter2.model && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Modelo:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter2.model}</span>
                                            </div>
                                        )}
                                        {customer.kit_details.inverter2.power && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Potência:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter2.power} kW</span>
                                            </div>
                                        )}
                                        {customer.kit_details.inverter2.qty && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Quantidade:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.inverter2.qty}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Modules */}
                            {customer.kit_details.modules && Object.keys(customer.kit_details.modules).length > 0 && (
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Package className="h-5 w-5 text-green-600" />
                                        Módulos Fotovoltaicos
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        {customer.kit_details.modules.brand && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Marca:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.modules.brand}</span>
                                            </div>
                                        )}
                                        {customer.kit_details.modules.model && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Modelo:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.modules.model}</span>
                                            </div>
                                        )}
                                        {customer.kit_details.modules.power && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Potência:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.modules.power} W</span>
                                            </div>
                                        )}
                                        {customer.kit_details.modules.qty && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Quantidade:</span>
                                                <span className="font-semibold text-gray-900">{customer.kit_details.modules.qty}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Observations */}
                {customer.observations && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Observações</h3>
                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{customer.observations}</p>
                    </div>
                )}
            </div>
        </div>
    );
}


