const axios = require('axios');
const {
  AURORA_VISION_BASE_URL,
  AURORA_VISION_API_KEY,
  AURORA_VISION_USERNAME,
  AURORA_VISION_PASSWORD,
  AURORA_VISION_MOCK,
  AURORA_VISION_STATIONS_ENDPOINT,
} = require('./config');

class AuroraVisionClient {
  constructor() {
    this.baseURL = AURORA_VISION_BASE_URL;
    this.apiKey = AURORA_VISION_API_KEY;
    this.username = AURORA_VISION_USERNAME;
    this.password = AURORA_VISION_PASSWORD;
    this.mock = AURORA_VISION_MOCK;
    this.stationsEndpoint = AURORA_VISION_STATIONS_ENDPOINT;
    this.token = null;
    this.tokenObtainedAt = 0;

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured() {
    if (this.mock) return true;
    return Boolean(this.apiKey && this.username && this.password);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Credenciais Aurora Vision incompletas (AURORA_VISION_API_KEY/USERNAME/PASSWORD)');
    }
  }

  getMockStations() {
    return [
      {
        id: 'aurora-mock-001',
        name: 'Aurora Mock - Planta Centro',
        location: 'Sao Paulo, SP',
        status: 'online',
        capacity: 125.4,
        provider: 'aurora-vision',
      },
      {
        id: 'aurora-mock-002',
        name: 'Aurora Mock - Planta Interior',
        location: 'Campinas, SP',
        status: 'offline',
        capacity: 78.2,
        provider: 'aurora-vision',
      },
    ];
  }

  async authenticate(force = false) {
    if (this.mock) return { token: 'aurora-mock-token' };
    this.assertConfigured();

    const tokenFresh = this.token && (Date.now() - this.tokenObtainedAt < 50 * 60 * 1000);
    if (!force && tokenFresh) return { token: this.token };

    const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    const response = await this.http.get('/authenticate', {
      headers: {
        Authorization: `Basic ${auth}`,
        'X-AuroraVision-ApiKey': this.apiKey,
      },
    });

    const tokenHeader = response.headers?.['x-auroravision-token'];
    const tokenBody = response.data?.token || response.data?.auroraVisionToken;
    const token = tokenHeader || tokenBody;

    if (!token) {
      throw new Error('Token Aurora Vision nao encontrado na resposta de autenticacao');
    }

    this.token = token;
    this.tokenObtainedAt = Date.now();
    return { token };
  }

  normalizeStationsPayload(data) {
    const rows = data?.sites || data?.stations || data?.items || data?.entities || data?.content || data?.data || [];
    if (!Array.isArray(rows)) return [];
    return rows.map((item) => {
      const rawStatus = item.status ?? item.siteStatus ?? item.onlineStatus ?? item.state;
      const statusText = String(rawStatus ?? '').toLowerCase();
      const isOnline = rawStatus === 1 || rawStatus === '1' || statusText.includes('online') || statusText.includes('normal');

      return {
        id: String(item.id || item.siteId || item.entityId || item.plantId || ''),
        name: item.name || item.siteName || item.entityName || 'Aurora Vision',
        location: item.location || item.address || item.city || '',
        status: isOnline ? 'online' : 'offline',
        capacity: item.capacity || item.installedCapacity || item.power || null,
        provider: 'aurora-vision',
      };
    }).filter((item) => item.id);
  }

  async stationList({ endpoint } = {}) {
    if (this.mock) return this.getMockStations();

    const { token } = await this.authenticate();
    const route = String(endpoint || this.stationsEndpoint || '/sites');
    try {
      const response = await this.http.get(route, {
        headers: {
          'X-AuroraVision-ApiKey': this.apiKey,
          'X-AuroraVision-Token': token,
        },
      });
      return this.normalizeStationsPayload(response.data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        const renewed = await this.authenticate(true);
        const retried = await this.http.get(route, {
          headers: {
            'X-AuroraVision-ApiKey': this.apiKey,
            'X-AuroraVision-Token': renewed.token,
          },
        });
        return this.normalizeStationsPayload(retried.data);
      }
      throw error;
    }
  }
}

module.exports = { AuroraVisionClient };
