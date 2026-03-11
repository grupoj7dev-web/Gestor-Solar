const axios = require('axios');
const {
  TSUNESS_BASE_URL,
  TSUNESS_API_KEY,
  TSUNESS_API_SECRET,
  TSUNESS_USERNAME,
  TSUNESS_PASSWORD,
  TSUNESS_TOKEN,
  TSUNESS_MOCK,
  TSUNESS_STATIONS_ENDPOINT,
} = require('./config');

class TsunessClient {
  constructor() {
    this.baseURL = TSUNESS_BASE_URL;
    this.apiKey = TSUNESS_API_KEY;
    this.apiSecret = TSUNESS_API_SECRET;
    this.username = TSUNESS_USERNAME;
    this.password = TSUNESS_PASSWORD;
    this.token = TSUNESS_TOKEN || null;
    this.mock = TSUNESS_MOCK;
    this.stationsEndpoint = TSUNESS_STATIONS_ENDPOINT;

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured() {
    if (this.mock) return true;
    return Boolean(this.token || (this.apiKey && this.apiSecret && this.username && this.password));
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Credenciais TSUNESS incompletas');
    }
  }

  getMockStations() {
    return [
      {
        id: 'tsuness-mock-001',
        name: 'TSUNESS Mock - Planta Leste',
        location: 'Goiania, GO',
        status: 'online',
        capacity: 56.3,
        provider: 'tsuness',
      },
      {
        id: 'tsuness-mock-002',
        name: 'TSUNESS Mock - Planta Oeste',
        location: 'Ribeirao Preto, SP',
        status: 'offline',
        capacity: 84.7,
        provider: 'tsuness',
      },
    ];
  }

  normalizeStationsPayload(data) {
    const rows = data?.stations || data?.stationList || data?.items || data?.data || data?.content || [];
    if (!Array.isArray(rows)) return [];

    return rows.map((item) => {
      const rawStatus = item.status ?? item.onlineStatus ?? item.stationStatus ?? item.state;
      const statusText = String(rawStatus ?? '').toLowerCase();
      const isOnline = rawStatus === 1 || rawStatus === '1' || statusText.includes('online') || statusText.includes('normal');
      return {
        id: String(item.id || item.stationId || item.plantId || ''),
        name: item.name || item.stationName || item.plantName || 'TSUNESS',
        location: item.location || item.address || item.city || '',
        status: isOnline ? 'online' : 'offline',
        capacity: item.capacity || item.installedCapacity || item.power || null,
        provider: 'tsuness',
      };
    }).filter((station) => station.id);
  }

  async stationList({ endpoint } = {}) {
    if (this.mock) return this.getMockStations();
    this.assertConfigured();

    const route = String(endpoint || this.stationsEndpoint || '/monitoring/stations');
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
    if (this.apiSecret) headers['X-Api-Secret'] = this.apiSecret;

    const response = await this.http.get(route, { headers });
    return this.normalizeStationsPayload(response.data);
  }
}

module.exports = { TsunessClient };
