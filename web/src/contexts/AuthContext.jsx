import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            verifyToken(token);
        } else {
            setLoading(false);
        }
    }, []);

    const verifyToken = async (token) => {
        try {
            const response = await api.get('/auth/verify', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        return user;
    };

    const register = async (name, email, password) => {
        const response = await api.post('/auth/register', { name, email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        return user;
    };

    const registerFirst = async (name, email, password) => {
        const response = await api.post('/auth/register-first', { name, email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const getToken = () => token;

    const hasPermission = (module) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.modules?.includes(module) || false;
    };

    const isAdmin = () => {
        return user?.role === 'admin';
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            registerFirst,
            logout,
            getToken,
            hasPermission,
            isAdmin
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
