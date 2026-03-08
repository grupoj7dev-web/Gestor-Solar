import axios from 'axios';

const API_BASE = '/api';

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to automatically include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const solarman = {
    getToken: async () => {
        const res = await api.post('/auth/token');
        return res.data;
    },
    getStations: async () => {
        const res = await api.get('/stations/available');
        return res.data;
    },
    getLinkedStations: async () => {
        const res = await api.get('/stations/linked');
        return res.data;
    },
    linkStation: async (customerId, data) => {
        const res = await api.post(`/customers/${customerId}/stations`, data);
        return res.data;
    },
    unlinkStation: async (customerId, stationId) => {
        const res = await api.delete(`/customers/${customerId}/stations/${stationId}`);
        return res.data;
    },
    getStationRealtime: async (stationId) => {
        const res = await api.get(`/stations/${stationId}/realtime`);
        return res.data;
    },
    getStationHistory: async (stationId, params) => {
        // params should be { timeType, startTime, endTime, ... }
        // Backend expects query parameters
        const res = await api.get(`/stations/${stationId}/history`, { params });
        return res.data;
    },
    getStationDevices: async (stationId) => {
        const res = await api.get(`/stations/${stationId}/devices?size=100`);
        return res.data;
    },
    getStationDevicesRealtime: async (stationId) => {
        const res = await api.get(`/stations/${stationId}/devices/realtime`);
        return res.data;
    },
    getStationAlarms: async (stationId) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30); // Last 30 days
        const formatDate = (d) => d.toISOString().split('T')[0];

        const params = {
            startTime: formatDate(start),
            endTime: formatDate(end)
        };
        const res = await api.get(`/stations/${stationId}/alerts`, { params });
        return res.data;
    },
    analyzeAlert: async (alertData) => {
        const res = await api.post('/analyze-alert', alertData);
        return res.data;
    }
};

export const tickets = {
    getAll: async (params) => {
        const res = await api.get('/tickets', { params });
        return res.data;
    },
    getById: async (id) => {
        const res = await api.get(`/tickets/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await api.post('/tickets', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await api.put(`/tickets/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/tickets/${id}`);
        return res.data;
    },
    getHistory: async (id) => {
        const res = await api.get(`/tickets/${id}/history`);
        return res.data;
    },
    sendWhatsApp: async (id, data) => {
        const res = await api.post(`/tickets/${id}/send-whatsapp`, data);
        return res.data;
    },
    sendSurvey: async (id, data) => {
        const res = await api.post(`/tickets/${id}/send-satisfaction-survey`, data);
        return res.data;
    },
    updateStatus: async (id, data) => {
        const res = await api.put(`/tickets/${id}/status`, data);
        return res.data;
    },
    addInitialResponse: async (id, data) => {
        const res = await api.put(`/tickets/${id}/initial-response`, data);
        return res.data;
    },
    close: async (id, data) => {
        const res = await api.put(`/tickets/${id}/close`, data);
        return res.data;
    },

    // Column Management
    getColumns: () => api.get('/tickets/columns').then(res => res.data),
    createColumn: (data) => api.post('/tickets/columns', data),
    updateColumn: (id, data) => api.put(`/tickets/columns/${id}`, data),
    deleteColumn: (id) => api.delete(`/tickets/columns/${id}`)
};

export const invoices = {
    getAll: async (customerId, filters = {}) => {
        const res = await api.get(`/customers/${customerId}/invoices`, { params: filters });
        return res.data;
    },
    getById: async (id) => {
        const res = await api.get(`/invoices/${id}`);
        return res.data;
    },
    create: async (customerId, data) => {
        const res = await api.post(`/customers/${customerId}/invoices`, data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await api.put(`/invoices/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`/invoices/${id}`);
        return res.data;
    },
    getComparison: async (id) => {
        const res = await api.get(`/invoices/${id}/comparison`);
        return res.data;
    }
};

export const stats = {
    getDashboard: async () => {
        const res = await api.get('/stats/dashboard', { params: { _t: Date.now() } });
        return res.data;
    }
};

export const integrations = {
    getStatus: async () => {
        const res = await api.get('/integrations');
        return res.data;
    },
    getSolarmanStations: async (params = {}) => {
        const res = await api.get('/stations/available', { params });
        return res.data;
    },
    getSolisStations: async (params = {}) => {
        const res = await api.get('/integrations/solis/stations', { params });
        return res.data;
    },
    getSolisInverters: async (params = {}) => {
        const res = await api.get('/integrations/solis/inverters', { params });
        return res.data;
    },
    getDeyeStations: async (params = {}) => {
        const res = await api.get('/integrations/deye/stations', { params });
        return res.data;
    }
};
