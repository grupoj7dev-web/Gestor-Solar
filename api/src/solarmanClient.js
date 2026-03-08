const axios = require('axios');
const crypto = require('crypto');
const { BASE_URL, APP_ID, APP_SECRET, ORG_ID, EMAIL, USERNAME, MOBILE, PASSWORD, TOKEN_CACHE_PATH } = require('./config');
const { readToken, writeToken, isExpired } = require('./utils/tokenStore');

class SolarmanClient {
  constructor() {
    this.baseURL = BASE_URL;
    this.version = 'v1.0';
    this.language = 'en';
    this.token = readToken(TOKEN_CACHE_PATH);
    this.http = axios.create({
      baseURL: this.baseURL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000, // Increased to 60s
    });
  }

  sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  async ensureToken(forceRenew = false) {
    if (forceRenew || !this.token || isExpired(this.token)) {
      await this.obtainToken();
    }
    this.http.defaults.headers['Authorization'] = `${this.token.token_type} ${this.token.access_token}`;
  }

  async apiCall(method, url, data = null, retries = 3) {
    try {
      await this.ensureToken();
      const config = data ? { method, url, data } : { method, url };
      return await this.http(config);
    } catch (error) {
      // If auth error, try once more with fresh token
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token expired, renewing...');
        await this.ensureToken(true);
        const config = data ? { method, url, data } : { method, url };
        return await this.http(config);
      }

      // Retry logic for timeouts or server errors
      if (retries > 0 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
        console.log(`API call failed (${error.message}), retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        return this.apiCall(method, url, data, retries - 1);
      }

      throw error;
    }
  }

  async obtainToken() {
    const appIdQ = `appId=${encodeURIComponent(APP_ID)}&language=${encodeURIComponent(this.language)}`;
    const url = `/account/${this.version}/token?${appIdQ}`;
    const identity = EMAIL ? { email: EMAIL } : (MOBILE ? { mobile: MOBILE } : (USERNAME ? { username: USERNAME } : {}));
    const body = {
      appSecret: APP_SECRET,
      password: this.sha256(PASSWORD),
      ...identity,
    };
    if (ORG_ID) body.orgId = Number(ORG_ID);
    const res = await this.http.post(url, body);
    const data = res.data;
    const tokenObj = {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      refresh_token: data.refresh_token,
      obtainedAt: Date.now(),
      expiresAt: Date.now() + (55 * 24 * 60 * 60 * 1000),
    };
    this.token = tokenObj;
    writeToken(TOKEN_CACHE_PATH, tokenObj);
    return tokenObj;
  }

  async stationList({ page = 1, size = 20 } = {}) {
    await this.ensureToken();
    const url = `/station/${this.version}/list?language=${this.language}`;
    const res = await this.http.post(url, { page, size });
    return res.data;
  }

  async stationListAll({ size = 50 } = {}) {
    await this.ensureToken();
    const result = [];
    let page = 1;
    let total = undefined;
    while (true) {
      const data = await this.stationList({ page, size });
      const list = data.stationList || data.list || [];
      result.push(...list);
      if (typeof data.total === 'number') total = data.total;
      if (list.length < size) break;
      if (total && result.length >= total) break;
      page += 1;
    }
    return { total: total ?? result.length, stationList: result };
  }

  async stationRealTime(stationId) {
    await this.ensureToken();
    const url = `/station/${this.version}/realTime?language=${this.language}`;
    const res = await this.http.post(url, { stationId });
    return res.data;
  }

  async stationDevices({ stationId, page = 1, size = 10, deviceType }) {
    await this.ensureToken();
    const url = `/station/${this.version}/device?language=${this.language}`;
    const payload = { stationId, page, size };
    if (deviceType) payload.deviceType = deviceType;
    const res = await this.http.post(url, payload);
    return res.data;
  }

  async deviceCurrentData(payload) {
    await this.ensureToken();
    const url = `/device/${this.version}/currentData?language=${this.language}`;
    const res = await this.http.post(url, payload);
    return res.data;
  }

  async deviceHistorical(payload) {
    await this.ensureToken();
    const url = `/device/${this.version}/historical?language=${this.language}`;
    const res = await this.http.post(url, payload);
    return res.data;
  }

  async stationHistorical(payload) {
    await this.ensureToken();
    const url = `/station/${this.version}/history?language=${this.language}`;
    const body = { ...payload };
    const uid = this.getUserIdFromToken();
    if (uid && body.userId == null) body.userId = uid;
    const cid = ORG_ID ? Number(ORG_ID) : undefined;
    if (cid && body.companyId == null) body.companyId = cid;
    const res = await this.http.post(url, body);
    return res.data;
  }

  async stationAlarms(payload) {
    await this.ensureToken();
    const url = `/station/${this.version}/alert?language=${this.language}`;
    const body = { ...payload };
    const uid = this.getUserIdFromToken();
    if (uid && body.userId == null) body.userId = uid;
    const cid = ORG_ID ? Number(ORG_ID) : undefined;
    if (cid && body.companyId == null) body.companyId = cid;
    const res = await this.http.post(url, body);
    return res.data;
  }

  async deviceAlarmDetail(payload) {
    await this.ensureToken();
    const url = `/device/${this.version}/alarmDetail?language=${this.language}`;
    const res = await this.http.post(url, payload);
    return res.data;
  }

  decodeJwt(token) {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      let s = part.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      const json = Buffer.from(s, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  getUserIdFromToken() {
    if (!this.token || !this.token.access_token) return undefined;
    const payload = this.decodeJwt(this.token.access_token);
    const detail = payload && payload.detail ? payload.detail : {};
    return detail.userId || payload.userId;
  }

  async deviceAlertList({ deviceSn, startTimestamp, endTimestamp, page = 1, size = 10, deviceId, companyId, userId }) {
    await this.ensureToken();
    const url = `/device/${this.version}/alertList?language=${this.language}`;
    const payload = { deviceSn, startTimestamp, endTimestamp, page, size };
    if (deviceId) payload.deviceId = deviceId;
    const uid = userId || this.getUserIdFromToken();
    if (uid) payload.userId = uid;
    const cid = companyId || (ORG_ID ? Number(ORG_ID) : undefined);
    if (cid) payload.companyId = cid;
    const res = await this.http.post(url, payload);
    return res.data;
  }

  async deviceAlertDetail({ alertId, deviceSn, deviceId, companyId, userId }) {
    await this.ensureToken();
    const url = `/device/${this.version}/alertDetail?language=${this.language}`;
    const payload = { alertId };
    if (deviceSn) payload.deviceSn = deviceSn;
    if (deviceId) payload.deviceId = deviceId;
    const uid = userId || this.getUserIdFromToken();
    if (uid) payload.userId = uid;
    const cid = companyId || (ORG_ID ? Number(ORG_ID) : undefined);
    if (cid) payload.companyId = cid;
    const res = await this.http.post(url, payload);
    return res.data;
  }

  async deviceCommunication({ deviceSn, deviceId, companyId, userId }) {
    await this.ensureToken();
    const url = `/device/${this.version}/communication?language=${this.language}`;
    const payload = { deviceSn };
    if (deviceId) payload.deviceId = deviceId;
    const uid = userId || this.getUserIdFromToken();
    if (uid) payload.userId = uid;
    const cid = companyId || (ORG_ID ? Number(ORG_ID) : undefined);
    if (cid) payload.companyId = cid;
    const res = await this.http.post(url, payload);
    return res.data;
  }
  async deviceCurrentDataBySn(deviceSn) {
    return this.deviceCurrentData({ deviceSn });
  }
  async stationDevicesRealtime({ stationId, deviceType, size = 50 }) {
    const devices = await this.stationDevices({ stationId, page: 1, size, deviceType });
    const list = devices.deviceListItems || devices.deviceList || [];
    const entries = list.map(d => ({
      deviceSn: d.deviceSn || d.sn,
      deviceId: d.deviceId,
      deviceType: d.deviceType,
      name: d.name,
      connectStatus: d.connectStatus, // Include connection status (1=Online, 2=Offline)
      status: d.status
    })).filter(e => !!e.deviceSn);
    const data = await Promise.all(entries.map(async e => {
      const current = await this.deviceCurrentDataBySn(e.deviceSn);
      return { ...e, currentData: current };
    }));
    return { stationId, count: data.length, devices: data };
  }
}

module.exports = { SolarmanClient };

