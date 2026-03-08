import { useState, useEffect } from 'react';
import { stats } from '../lib/api';

export function useDashboardStats() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('📊 Fetching dashboard stats...');
            const statsData = await stats.getDashboard();

            setData(statsData);
            setLoading(false);

        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setError(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch fresh data on mount
        fetchStats();
    }, []);

    return { data, loading, error, refetch: fetchStats };
}
