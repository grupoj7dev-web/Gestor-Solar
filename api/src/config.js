const dotenv = require('dotenv');
const path = require('path');

// Load env files from common startup directories so the API works
// whether started from project root or from the `api` folder.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../backend.env'),
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath });
}

function required(name, fallback) {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

module.exports = {
  BASE_URL: required('SOLARMAN_BASE_URL', 'https://globalapi.solarmanpv.com'),
  APP_ID: required('SOLARMAN_APP_ID'),
  APP_SECRET: required('SOLARMAN_APP_SECRET'),
  ORG_ID: process.env.SOLARMAN_ORG_ID || undefined,
  EMAIL: process.env.SOLARMAN_EMAIL || undefined,
  USERNAME: process.env.SOLARMAN_USERNAME || undefined,
  MOBILE: process.env.SOLARMAN_MOBILE || undefined,
  PASSWORD: required('SOLARMAN_PASSWORD'),
  TOKEN_CACHE_PATH: process.env.SOLARMAN_TOKEN_CACHE || path.join('var', 'token.json'),
  SOLIS_BASE_URL: process.env.SOLIS_BASE_URL || 'https://www.soliscloud.com:13333',
  SOLIS_API_ID: process.env.SOLIS_API_ID || undefined,
  SOLIS_API_SECRET: process.env.SOLIS_API_SECRET || undefined,
  SOLIS_STATION_ID: process.env.SOLIS_STATION_ID || undefined,
  DEYE_BASE_URL: process.env.DEYE_BASE_URL || 'https://us1-developer.deyecloud.com/v1.0',
  DEYE_APP_ID: process.env.DEYE_APP_ID || undefined,
  DEYE_APP_SECRET: process.env.DEYE_APP_SECRET || undefined,
  DEYE_EMAIL: process.env.DEYE_EMAIL || undefined,
  DEYE_USERNAME: process.env.DEYE_USERNAME || undefined,
  DEYE_MOBILE: process.env.DEYE_MOBILE || undefined,
  DEYE_COUNTRY_CODE: process.env.DEYE_COUNTRY_CODE || undefined,
  DEYE_PASSWORD: process.env.DEYE_PASSWORD || undefined,
  DEYE_COMPANY_ID: process.env.DEYE_COMPANY_ID || undefined,
  DEYE_TOKEN_CACHE_PATH: process.env.DEYE_TOKEN_CACHE || path.join('var', 'deye-token.json'),
};
