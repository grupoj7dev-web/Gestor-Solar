import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, Zap, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function Login() {
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingFirstUser, setCheckingFirstUser] = useState(true);

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        checkFirstUser();
    }, []);

    const checkFirstUser = async () => {
        try {
            const response = await api.get('/auth/check-first-user');
            if (!response.data.hasUsers) {
                navigate('/register-first', { replace: true });
            }
        } catch (error) {
            console.error('Error checking first user:', error);
        } finally {
            setCheckingFirstUser(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            if (!err.response) {
                setError('Nao foi possivel conectar ao servidor. Verifique se a API esta rodando na porta 4001.');
            } else {
                setError(err.response?.data?.error || 'Erro ao fazer login');
            }
        } finally {
            setLoading(false);
        }
    };

    if (checkingFirstUser) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600">
                        <Zap className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">Gestor Solar</h1>
                    <p className="font-medium text-gray-600 dark:text-gray-300">Sistema de Gestao de Usinas</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-lg">
                    <div className="mb-8">
                        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo de volta!</h2>
                        <p className="text-gray-600 dark:text-gray-300">Entre com suas credenciais para continuar</p>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Email</label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Senha</label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                                    placeholder="********"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Autenticando...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    <span>Entrar no Sistema</span>
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso seguro com criptografia</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Nao tem uma conta?{' '}
                            <button
                                onClick={() => navigate('/register')}
                                className="cursor-pointer border-none bg-transparent p-0 font-medium text-blue-600 transition-all hover:text-blue-700 hover:underline"
                            >
                                Cadastre-se agora
                            </button>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">(c) 2024 Gestor Solar. Todos os direitos reservados.</p>
            </div>
        </div>
    );
}
