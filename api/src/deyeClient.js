const axios = require('axios');
const crypto = require('crypto');
const {
  DEYE_BASE_URL,
  DEYE_APP_ID,
  DEYE_APP_SECRET,
  DEYE_EMAIL,
  DEYE_USERNAME,
  DEYE_MOBILE,
  DEYE_COUNTRY_CODE,
  DEYE_PASSWORD,
  DEYE_COMPANY_ID,
  DEYE_TOKEN_CACHE_PATH,
} = require('./config');
const { readToken, writeToken, isExpired } = require('./utils/tokenStore');

class DeyeClient {
  constructor() {
    this.baseURL = DEYE_BASE_URL;
    this.appId = DEYE_APP_ID;
    this.appSecret = DEYE_APP_SECRET;
    this.email = DEYE_EMAIL;
    this.username = DEYE_USERNAME;
    this.mobile = DEYE_MOBILE;
    this.countryCode = DEYE_COUNTRY_CODE;
    this.password = DEYE_PASSWORD;
    this.companyId = DEYE_COMPANY_ID;
    this.tokenPath = DEYE_TOKEN_CACHE_PATH;
    this.token = readToken(this.tokenPath);
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured() {
    const hasIdentity = Boolean(this.email || this.username || this.mobile);
    return Boolean(this.appId && this.appSecret && this.password && hasIdentity);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Credenciais Deye incompletas (DEYE_APP_ID/DEYE_APP_SECRET/DEYE_PASSWORD/identidade)');
    }
  }

  sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  baseLoginPayload() {
    const payload = {
      appSecret: this.appSecret,
      password: this.sha256(this.password),
    };
    if (this.email) payload.email = this.email;
    else if (this.username) payload.username = this.username;
    else if (this.mobile) {
      payload.mobile = this.mobile;
      if (this.countryCode) payload.countryCode = this.countryCode;
    }
    return payload;
  }

  async fetchCompanyId(accessToken) {
    const headers = { Authorization: `bearer ${accessToken}` };
    const res = await this.http.post('/account/info', {}, { headers });
    const orgs = res?.data?.orgInfoList || [];
    const first = orgs[0];
    return first ? String(first.companyId || first.orgId || first.id || '') : '';
  }

  async obtainToken(forceRenew = false) {
    this.assertConfigured();
    if (!forceRenew && this.token && !isExpired(this.token)) return this.token;

    const url = `/account/token?appId=${encodeURIComponent(this.appId)}`;
    const login = this.baseLoginPayload();

    // First step: get account token (personal scope), used to discover company if needed.
    const baseRes = await this.http.post(url, login);
    const baseData = baseRes.data || {};
    const baseToken = baseData.accessToken;
    if (!baseToken) {
      throw new Error(baseData.msg || 'Falha ao obter token Deye');
    }

    let effectiveCompanyId = this.companyId ? String(this.companyId) : '';
    if (!effectiveCompanyId) {
      try {
        effectiveCompanyId = await this.fetchCompanyId(baseToken);
      } catch (e) {
        // Keep personal scope if company lookup fails.
      }
    }

    let finalData = baseData;
    if (effectiveCompanyId) {
      const companyRes = await this.http.post(url, { ...login, companyId: effectiveCompanyId });
      finalData = companyRes.data || {};
      if (!finalData.accessToken) {
        throw new Error(finalData.msg || 'Falha ao obter token Deye com companyId');
      }
    }

    const expiresInSec = Number(finalData.expiresIn || 3600);
    const tokenObj = {
      accessToken: finalData.accessToken,
      tokenType: finalData.tokenType || 'bearer',
      refreshToken: finalData.refreshToken,
      companyId: effectiveCompanyId || null,
      obtainedAt: Date.now(),
      expiresAt: Date.now() + Math.max(300, expiresInSec - 120) * 1000,
    };

    this.token = tokenObj;
    writeToken(this.tokenPath, tokenObj);
    return tokenObj;
  }

  async ensureToken(forceRenew = false) {
    const token = await this.obtainToken(forceRenew);
    this.http.defaults.headers.Authorization = `${token.tokenType || 'bearer'} ${token.accessToken}`;
  }

  async post(path, payload = {}, retries = 1) {
    try {
      await this.ensureToken();
      const res = await this.http.post(path, payload);
      return res.data;
    } catch (error) {
      const code = error?.response?.data?.code;
      const isAuthIssue = code === '2101019' || error?.response?.status === 401 || error?.response?.status === 403;
      if (retries > 0 && isAuthIssue) {
        await this.ensureToken(true);
        return this.post(path, payload, retries - 1);
      }
      throw error;
    }
  }

  async stationList({ page = 1, size = 100 } = {}) {
    return this.post('/station/list', { page, size });
  }

  async stationListAll({ size = 100, maxPages = 30 } = {}) {
    let page = 1;
    let total = 0;
    const stationList = [];
    while (page <= maxPages) {
      const data = await this.stationList({ page, size });
      const list = data.stationList || [];
      if (typeof data.total === 'number') total = data.total;
      stationList.push(...list);
      if (list.length < size) break;
      if (total && stationList.length >= total) break;
      page += 1;
    }
    return { total: total || stationList.length, stationList };
  }

  async stationDevice({ stationIds, page = 1, size = 200 } = {}) {
    const payload = { stationIds: (stationIds || []).map(Number).filter(Number.isFinite), page, size };
    return this.post('/station/device', payload);
  }
}

module.exports = { DeyeClient };

