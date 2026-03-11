const axios = require('axios');
const {
  SOLPLANET_MONITOR_BASE_URL,
  SOLPLANET_MONITOR_APP_KEY,
  SOLPLANET_MONITOR_APP_SECRET,
  SOLPLANET_MONITOR_USERNAME,
  SOLPLANET_MONITOR_PASSWORD,
  SOLPLANET_MONITOR_TOKEN,
  SOLPLANET_MONITOR_MOCK,
  SOLPLANET_MONITOR_LOGIN_ENDPOINT,
  SOLPLANET_MONITOR_LOGIN_METHOD,
  SOLPLANET_MONITOR_LOGIN_BODY_USER_FIELD,
  SOLPLANET_MONITOR_LOGIN_BODY_PASS_FIELD,
  SOLPLANET_MONITOR_TOKEN_FIELD,
  SOLPLANET_MONITOR_TOKEN_HEADER,
  SOLPLANET_MONITOR_TOKEN_PREFIX,
  SOLPLANET_MONITOR_STATIONS_ENDPOINT,
} = require('./config');

class SolplanetMonitoringClient {
  constructor() {
    this.baseURL = SOLPLANET_MONITOR_BASE_URL;
    this.appKey = SOLPLANET_MONITOR_APP_KEY;
    this.appSecret = SOLPLANET_MONITOR_APP_SECRET;
    this.username = SOLPLANET_MONITOR_USERNAME;
    this.password = SOLPLANET_MONITOR_PASSWORD;
    this.token = SOLPLANET_MONITOR_TOKEN || null;
    this.mock = SOLPLANET_MONITOR_MOCK;
    this.loginEndpoint = SOLPLANET_MONITOR_LOGIN_ENDPOINT;
    this.loginMethod = String(SOLPLANET_MONITOR_LOGIN_METHOD || 'POST').toUpperCase();
    this.loginUserField = SOLPLANET_MONITOR_LOGIN_BODY_USER_FIELD;
    this.loginPassField = SOLPLANET_MONITOR_LOGIN_BODY_PASS_FIELD;
    this.tokenField = SOLPLANET_MONITOR_TOKEN_FIELD;
    this.tokenHeader = SOLPLANET_MONITOR_TOKEN_HEADER;
    this.tokenPrefix = SOLPLANET_MONITOR_TOKEN_PREFIX;
    this.stationsEndpoint = SOLPLANET_MONITOR_STATIONS_ENDPOINT;
    this.tokenObtainedAt = this.token ? Date.now() : 0;

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured() {
    if (this.mock) return true;
    return Boolean(this.token || (this.username && this.password));
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Credenciais Solplanet incompletas (token ou username/password)');
    }
  }

  getMockStations() {
    return [
      { id: 'solplanet-mock-001', name: 'Solplanet Mock - Usina Norte', location: 'Belo Horizonte, MG', status: 'online', capacity: 93.5, provider: 'solplanet-monitoramento' },
      { id: 'solplanet-mock-002', name: 'Solplanet Mock - Usina Sul', location: 'Curitiba, PR', status: 'offline', capacity: 147.8, provider: 'solplanet-monitoramento' },
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
        name: item.name || item.stationName || item.plantName || 'Solplanet',
        location: item.location || item.address || item.city || '',
        status: isOnline ? 'online' : 'offline',
        capacity: item.capacity || item.installedCapacity || item.power || null,
        provider: 'solplanet-monitoramento',
      };
    }).filter((station) => station.id);
  }

  buildAuthHeaders(token) {
    const headers = {};
    if (this.appKey) headers['X-App-Key'] = this.appKey;
    if (this.appSecret) headers['X-App-Secret'] = this.appSecret;
    if (token) {
      if (String(this.tokenHeader || '').toLowerCase() === 'authorization') {
        headers.Authorization = `${this.tokenPrefix || 'Bearer '}${token}`;
      } else {
        headers[this.tokenHeader] = token;
      }
    }
    return headers;
  }

  extractTokenFromAuthResponse(response) {
    const data = response?.data || {};
    const headerToken = response?.headers?.['x-access-token']
      || response?.headers?.['x-token']
      || response?.headers?.authorization;
    const bodyToken = data?.[this.tokenField]
      || data?.token
      || data?.accessToken
      || data?.access_token
      || data?.data?.token
      || data?.data?.accessToken
      || data?.result?.token;

    const raw = headerToken || bodyToken;
    if (!raw || typeof raw !== 'string') return null;
    return raw.replace(/^Bearer\s+/i, '').trim();
  }

  async authenticate(force = false) {
    if (this.mock) return { token: 'solplanet-mock-token' };
    this.assertConfigured();

    const tokenFresh = this.token && (Date.now() - this.tokenObtainedAt < 50 * 60 * 1000);
    if (!force && tokenFresh) return { token: this.token };
    if (!this.username || !this.password) return { token: this.token };

    const payload = {
      [this.loginUserField]: this.username,
      [this.loginPassField]: this.password,
    };
    if (this.appKey) payload.appKey = this.appKey;
    if (this.appSecret) payload.appSecret = this.appSecret;

    const method = this.loginMethod === 'GET' ? 'get' : 'post';
    const response = method === 'get'
      ? await this.http.get(this.loginEndpoint, { params: payload, headers: this.buildAuthHeaders(null) })
      : await this.http.post(this.loginEndpoint, payload, { headers: this.buildAuthHeaders(null) });

    const newToken = this.extractTokenFromAuthResponse(response);
    if (!newToken) throw new Error('Nao foi possivel extrair token de login Solplanet');

    this.token = newToken;
    this.tokenObtainedAt = Date.now();
    return { token: this.token };
  }

  async getWithAuth(route, retry = true) {
    if (!this.mock) await this.authenticate(false);

    try {
      const response = await this.http.get(route, { headers: this.buildAuthHeaders(this.token) });
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      if (retry && (status === 401 || status === 403)) {
        await this.authenticate(true);
        const response = await this.http.get(route, { headers: this.buildAuthHeaders(this.token) });
        return response.data;
      }
      throw error;
    }
  }

  async stationList({ endpoint } = {}) {
    if (this.mock) return this.getMockStations();
    this.assertConfigured();

    const route = String(endpoint || this.stationsEndpoint || '/monitoring/stations');
    const data = await this.getWithAuth(route, true);
    return this.normalizeStationsPayload(data);
  }
}

module.exports = { SolplanetMonitoringClient };
