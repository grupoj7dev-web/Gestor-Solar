const axios = require('axios');
const {
  ELEKEEPER_BASE_URL,
  ELEKEEPER_DEVELOPER_ID,
  ELEKEEPER_API_KEY,
  ELEKEEPER_API_SECRET,
  ELEKEEPER_USERNAME,
  ELEKEEPER_PASSWORD,
  ELEKEEPER_TOKEN,
  ELEKEEPER_MOCK,
  ELEKEEPER_LOGIN_ENDPOINT,
  ELEKEEPER_LOGIN_METHOD,
  ELEKEEPER_LOGIN_BODY_USER_FIELD,
  ELEKEEPER_LOGIN_BODY_PASS_FIELD,
  ELEKEEPER_TOKEN_FIELD,
  ELEKEEPER_TOKEN_HEADER,
  ELEKEEPER_TOKEN_PREFIX,
  ELEKEEPER_STATIONS_ENDPOINT,
} = require('./config');

class ElekeeperClient {
  constructor() {
    this.baseURL = ELEKEEPER_BASE_URL;
    this.developerId = ELEKEEPER_DEVELOPER_ID;
    this.apiKey = ELEKEEPER_API_KEY;
    this.apiSecret = ELEKEEPER_API_SECRET;
    this.username = ELEKEEPER_USERNAME;
    this.password = ELEKEEPER_PASSWORD;
    this.token = ELEKEEPER_TOKEN || null;
    this.mock = ELEKEEPER_MOCK;
    this.loginEndpoint = ELEKEEPER_LOGIN_ENDPOINT;
    this.loginMethod = String(ELEKEEPER_LOGIN_METHOD || 'POST').toUpperCase();
    this.loginUserField = ELEKEEPER_LOGIN_BODY_USER_FIELD;
    this.loginPassField = ELEKEEPER_LOGIN_BODY_PASS_FIELD;
    this.tokenField = ELEKEEPER_TOKEN_FIELD;
    this.tokenHeader = ELEKEEPER_TOKEN_HEADER;
    this.tokenPrefix = ELEKEEPER_TOKEN_PREFIX;
    this.stationsEndpoint = ELEKEEPER_STATIONS_ENDPOINT;
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
      throw new Error('Credenciais Elekeeper incompletas (token ou username/password)');
    }
  }

  getMockStations() {
    return [
      {
        id: 'elekeeper-mock-001',
        name: 'Elekeeper Mock - Planta Delta',
        location: 'Recife, PE',
        status: 'online',
        capacity: 68.2,
        provider: 'elekeeper-saj',
      },
      {
        id: 'elekeeper-mock-002',
        name: 'Elekeeper Mock - Planta Gama',
        location: 'Salvador, BA',
        status: 'offline',
        capacity: 49.7,
        provider: 'elekeeper-saj',
      },
    ];
  }

  normalizeStationsPayload(data) {
    const rows = data?.stations || data?.stationList || data?.items || data?.data || data?.content || data?.resultData || [];
    if (!Array.isArray(rows)) return [];
    return rows.map((item) => {
      const rawStatus = item.status ?? item.stationStatus ?? item.onlineStatus ?? item.state;
      const statusText = String(rawStatus ?? '').toLowerCase();
      const isOnline = rawStatus === 1 || rawStatus === '1' || statusText.includes('online') || statusText.includes('normal');
      return {
        id: String(item.id || item.stationId || item.plantId || item.psId || ''),
        name: item.name || item.stationName || item.plantName || item.psName || 'Elekeeper',
        location: item.location || item.address || item.city || '',
        status: isOnline ? 'online' : 'offline',
        capacity: item.capacity || item.installedCapacity || item.power || null,
        provider: 'elekeeper-saj',
      };
    }).filter((station) => station.id);
  }

  buildAuthHeaders(token) {
    const headers = {};
    if (this.developerId) headers['X-Developer-Id'] = this.developerId;
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
    if (this.apiSecret) headers['X-Api-Secret'] = this.apiSecret;
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
      || data?.resultData?.token;

    const raw = headerToken || bodyToken;
    if (!raw || typeof raw !== 'string') return null;
    return raw.replace(/^Bearer\s+/i, '').trim();
  }

  async authenticate(force = false) {
    if (this.mock) return { token: 'elekeeper-mock-token' };
    this.assertConfigured();

    const tokenFresh = this.token && (Date.now() - this.tokenObtainedAt < 50 * 60 * 1000);
    if (!force && tokenFresh) return { token: this.token };
    if (!this.username || !this.password) return { token: this.token };

    const payload = {
      [this.loginUserField]: this.username,
      [this.loginPassField]: this.password,
    };
    if (this.apiKey) payload.apiKey = this.apiKey;
    if (this.developerId) payload.developerId = this.developerId;

    const method = this.loginMethod === 'GET' ? 'get' : 'post';
    const response = method === 'get'
      ? await this.http.get(this.loginEndpoint, { params: payload, headers: this.buildAuthHeaders(null) })
      : await this.http.post(this.loginEndpoint, payload, { headers: this.buildAuthHeaders(null) });

    const newToken = this.extractTokenFromAuthResponse(response);
    if (!newToken) throw new Error('Nao foi possivel extrair token de login Elekeeper');

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

    const route = String(endpoint || this.stationsEndpoint || '/openapi/power/stations');
    const data = await this.getWithAuth(route, true);
    return this.normalizeStationsPayload(data);
  }
}

module.exports = { ElekeeperClient };
