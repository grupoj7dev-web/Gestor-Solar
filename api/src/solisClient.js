const axios = require('axios');
const crypto = require('crypto');
const {
  SOLIS_BASE_URL,
  SOLIS_API_ID,
  SOLIS_API_SECRET,
  SOLIS_STATION_ID,
} = require('./config');

class SolisClient {
  constructor() {
    this.baseURL = SOLIS_BASE_URL;
    this.apiId = SOLIS_API_ID;
    this.apiSecret = SOLIS_API_SECRET;
    this.defaultStationId = SOLIS_STATION_ID;
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured() {
    return Boolean(this.apiId && this.apiSecret);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Credenciais da Solis ausentes (SOLIS_API_ID e SOLIS_API_SECRET)');
    }
  }

  md5Base64(value) {
    return crypto.createHash('md5').update(value).digest('base64');
  }

  hmacBase64(value) {
    return crypto.createHmac('sha1', this.apiSecret).update(value).digest('base64');
  }

  signedHeaders(path, bodyString) {
    const date = new Date().toUTCString();
    const contentMd5 = this.md5Base64(bodyString);
    const contentType = 'application/json';
    const stringToSign = `POST\n${contentMd5}\n${contentType}\n${date}\n${path}`;
    const signature = this.hmacBase64(stringToSign);

    return {
      'Content-Type': contentType,
      'Content-MD5': contentMd5,
      Date: date,
      Authorization: `API ${this.apiId}:${signature}`,
    };
  }

  async post(path, payload = {}) {
    this.assertConfigured();
    const body = JSON.stringify(payload);
    const headers = this.signedHeaders(path, body);
    const res = await this.http.post(path, body, { headers });
    return res.data;
  }

  async userStationList({ pageNo = 1, pageSize = 20 } = {}) {
    return this.post('/v1/api/userStationList', { pageNo, pageSize });
  }

  async inverterList({ pageNo = 1, pageSize = 20, stationId } = {}) {
    const hasExplicitStation = stationId != null && String(stationId).trim() !== '';
    const effectiveStationId = hasExplicitStation ? stationId : this.defaultStationId;
    const payload = { pageNo, pageSize };
    if (effectiveStationId) payload.stationId = String(effectiveStationId);
    const result = await this.post('/v1/api/inverterList', payload);

    // Some accounts have no authority over a specific stationId.
    // In this case retry without station filter to keep the integration operational.
    if (!hasExplicitStation && payload.stationId && result?.msg === 'No authority') {
      return this.post('/v1/api/inverterList', { pageNo, pageSize });
    }

    return result;
  }

  isSuccess(response) {
    return response && (response.code === 0 || response.code === '0');
  }
}

module.exports = { SolisClient };
