import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, MapPin } from 'lucide-react';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function BranchForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingCEP, setLoadingCEP] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
    });

    useEffect(() => {
        if (id) {
            fetchBranch();
        }
    }, [id]);

    const fetchBranch = async () => {
        try {
            const response = await api.get(`/branches/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setFormData(response.data);
        } catch (error) {
            console.error('Error fetching branch:', error);
            setError('Erro ao carregar filial');
        }
    };

    const handleCNPJChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 14) {
            setFormData({ ...formData, cnpj: value });
        }
    };

    const formatCNPJDisplay = (cnpj) => {
        if (!cnpj) return '';
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length <= 2) return cnpj;
        if (cnpj.length <= 5) return cnpj.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
        if (cnpj.length <= 8) return cnpj.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
        if (cnpj.length <= 12) return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    };

    const handleCEPChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 8) {
            setFormData({ ...formData, cep: value });
            if (value.length === 8) {
                fetchAddressByCEP(value);
            }
        }
    };

    const formatCEPDisplay = (cep) => {
        if (!cep) return '';
        cep = cep.replace(/\D/g, '');
        if (cep.length <= 5) return cep;
        return cep.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    };

    const fetchAddressByCEP = async (cep) => {
        setLoadingCEP(true);
        setError('');

        try {
            const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

            if (response.data.erro) {
                setError('CEP não encontrado');
                return;
            }

            setFormData({
                ...formData,
                cep,
                street: response.data.logradouro || '',
                neighborhood: response.data.bairro || '',
                city: response.data.localidade || '',
                state: response.data.uf || ''
            });
        } catch (err) {
            setError('Erro ao buscar CEP');
        } finally {
            setLoadingCEP(false);
        }
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.name || !formData.cnpj || !formData.cep || !formData.street || !formData.neighborhood || !formData.city || !formData.state) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        if (formData.cnpj.length !== 14) {
            setError('CNPJ deve conter 14 dígitos');
            return;
        }

        if (formData.cep.length !== 8) {
            setError('CEP deve conter 8 dígitos');
            return;
        }

        setLoading(true);

        try {
            if (id) {
                await api.put(`/branches/${id}`, formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            } else {
                await api.post('/branches', formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }

            navigate('/branches');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar filial');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/branches')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Voltar para lista</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {id ? 'Editar Filial' : 'Nova Filial'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Preencha os dados da filial</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Nome da Filial *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                placeholder="Ex: Matriz, Filial São Paulo"
                            />
                        </div>

                        {/* CNPJ */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                CNPJ *
                            </label>
                            <input
                                type="text"
                                value={formatCNPJDisplay(formData.cnpj)}
                                onChange={handleCNPJChange}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                            />
                        </div>

                        {/* CEP */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                CEP *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formatCEPDisplay(formData.cep)}
                                    onChange={handleCEPChange}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none pl-12"
                                    placeholder="00000-000"
                                    maxLength={9}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    {loadingCEP ? (
                                        <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                                    ) : (
                                        <MapPin className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Digite o CEP para preencher automaticamente o endereço</p>
                        </div>

                        {/* Street and Number */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Logradouro *
                                </label>
                                <input
                                    type="text"
                                    value={formData.street}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                    placeholder="Rua, Avenida"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Número
                                </label>
                                <input
                                    type="text"
                                    value={formData.number}
                                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                    placeholder="123"
                                />
                            </div>
                        </div>

                        {/* Complement */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Complemento
                            </label>
                            <input
                                type="text"
                                value={formData.complement}
                                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                placeholder="Sala, Andar, etc"
                            />
                        </div>

                        {/* Neighborhood */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Bairro *
                            </label>
                            <input
                                type="text"
                                value={formData.neighborhood}
                                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                placeholder="Centro"
                            />
                        </div>

                        {/* City and State */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    Cidade *
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                    placeholder="São Paulo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    UF *
                                </label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white uppercase focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                                    placeholder="SP"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 mt-8">
                    <button
                        onClick={() => navigate('/branches')}
                        className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Salvar Filial
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
