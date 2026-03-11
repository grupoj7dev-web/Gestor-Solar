const axios = require('axios');
const {
  ISOLARCLOUD_BASE_URL,
  ISOLARCLOUD_APP_KEY,
  ISOLARCLOUD_ACCESS_KEY,
  ISOLARCLOUD_RSA_PRIVATE_KEY,
  ISOLARCLOUD_USERNAME,
  ISOLARCLOUD_PASSWORD,
  ISOLARCLOUD_TOKEN,
  ISOLARCLOUD_MOCK,
  ISOLARCLOUD_LOGIN_ENDPOINT,
  ISOLARCLOUD_LOGIN_METHOD,
  ISOLARCLOUD_LOGIN_BODY_USER_FIELD,
  ISOLARCLOUD_LOGIN_BODY_PASS_FIELD,
  ISOLARCLOUD_TOKEN_FIELD,
  ISOLARCLOUD_TOKEN_HEADER,
  ISOLARCLOUD_TOKEN_PREFIX,
  ISOLARCLOUD_STATIONS_ENDPOINT,
} = require('./config');

class ISolarCloudClient {
  constructor() {
    this.baseURL = ISOLARCLOUD_BASE_URL;
    this.appKey = ISOLARCLOUD_APP_KEY;
    this.accessKey = ISOLARCLOUD_ACCESS_KEY;
    this.rsaPrivateKey = ISOLARCLOUD_RSA_PRIVATE_KEY;
    this.username = ISOLARCLOUD_USERNAME;
    this.password = ISOLARCLOUD_PASSWORD;
    this.token = ISOLARCLOUD_TOKEN || null;
    this.mock = ISOLARCLOUD_MOCK;
    this.loginEndpoint = ISOLARCLOUD_LOGIN_ENDPOINT;
    this.loginMethod = String(ISOLARCLOUD_LOGIN_METHOD || 'POST').toUpperCase();
    this.loginUserField = ISOLARCLOUD_LOGIN_BODY_USER_FIELD;
    this.loginPassField = ISOLARCLOUD_LOGIN_BODY_PASS_FIELD;
    this.tokenField = ISOLARCLOUD_TOKEN_FIELD;
    this.tokenHeader = ISOLARCLOUD_TOKEN_HEADER;
    this.tokenPrefix = ISOLARCLOUD_TOKEN_PREFIX;
    this.stationsEndpoint = ISOLARCLOUD_STATIONS_ENDPOINT;
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
      throw new Error('Credenciais iSolarCloud incompletas (token ou username/password)');
    }
  }

  getMockStations() {
    return [
      {
        id: 'isolarcloud-mock-001',
        name: 'iSolarCloud Mock - Usina Alpha',
        location: 'Campinas, SP',
        status: 'online',
        capacity: 110.5,
        provider: 'isolarcloud-sungrow',
      },
      {
        id: 'isolarcloud-mock-002',
        name: 'iSolarCloud Mock - Usina Beta',
        location: 'Sao Jose dos Campos, SP',
        status: 'offline',
        capacity: 72.8,
        provider: 'isolarcloud-sungrow',
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
        id: String(item.id || item.stationId || item.psId || item.plantId || ''),
        name: item.name || item.stationName || item.psName || 'iSolarCloud',
        location: item.location || item.address || item.city || '',
        status: isOnline ? 'online' : 'offline',
        capacity: item.capacity || item.installedCapacity || item.power || null,
        provider: 'isolarcloud-sungrow',
      };
    }).filter((station) => station.id);
  }

  buildAuthHeaders(token) {
    const headers = {};
    if (this.appKey) headers['X-App-Key'] = this.appKey;
    if (this.accessKey) headers['X-Access-Key'] = this.accessKey;
    if (this.rsaPrivateKey) headers['X-RSA-Key'] = this.rsaPrivateKey;
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
    if (this.mock) return { token: 'isolarcloud-mock-token' };
    this.assertConfigured();

    const tokenFresh = this.token && (Date.now() - this.tokenObtainedAt < 50 * 60 * 1000);
    if (!force && tokenFresh) return { token: this.token };
    if (!this.username || !this.password) return { token: this.token };

    const payload = {
      [this.loginUserField]: this.username,
      [this.loginPassField]: this.password,
    };
    if (this.appKey) payload.appKey = this.appKey;
    if (this.accessKey) payload.accessKey = this.accessKey;

    const method = this.loginMethod === 'GET' ? 'get' : 'post';
    const response = method === 'get'
      ? await this.http.get(this.loginEndpoint, { params: payload, headers: this.buildAuthHeaders(null) })
      : await this.http.post(this.loginEndpoint, payload, { headers: this.buildAuthHeaders(null) });

    const newToken = this.extractTokenFromAuthResponse(response);
    if (!newToken) throw new Error('Nao foi possivel extrair token de login iSolarCloud');

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

    const route = String(endpoint || this.stationsEndpoint || '/openapi/powerStation/list');
    const data = await this.getWithAuth(route, true);
    return this.normalizeStationsPayload(data);
  }
}

module.exports = { ISolarCloudClient };
