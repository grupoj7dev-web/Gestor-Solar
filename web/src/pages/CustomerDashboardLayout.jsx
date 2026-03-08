import React, { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { CustomerSidebar } from '../components/CustomerSidebar';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function CustomerDashboardLayout() {
    const { id } = useParams();
    const { getToken } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomer();
    }, [id]);

    const fetchCustomer = async () => {
        try {
            const response = await api.get(`/customers/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setCustomer(response.data);
        } catch (error) {
            console.error('Error fetching customer:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <CustomerSidebar customer={customer} />
            <main className="flex-1 overflow-y-auto">
                <Outlet context={{ customer, refreshCustomer: fetchCustomer }} />
            </main>
        </div>
    );
}
