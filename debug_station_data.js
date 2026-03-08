require('dotenv').config();

// Importa o solarman client diretamente
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SOLARMAN_BASE_URL = 'https://globalapi.solarmanpv.com';
const SOLARMAN_APP_ID = process.env.SOLARMAN_APP_ID;
const SOLARMAN_APP_SECRET = process.env.SOLARMAN_APP_SECRET;
const SOLARMAN_EMAIL = process.env.SOLARMAN_EMAIL;
const SOLARMAN_PASSWORD = process.env.SOLARMAN_PASSWORD;

let accessToken = null;

async function getAccessToken() {
    if (accessToken) return accessToken;

    try {
        const response = await axios.post(`${SOLARMAN_BASE_URL}/account/v1.0/token`, {
            appSecret: SOLARMAN_APP_SECRET,
            email: SOLARMAN_EMAIL,
            password: SOLARMAN_PASSWORD
        }, {
            params: { language: 'pt' },
            headers: { 'Content-Type': 'application/json' }
        });

        accessToken = response.data.access_token;
        return accessToken;
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        throw error;
    }
}

async function getStations() {
    const token = await getAccessToken();
    const response = await axios.post(
        `${SOLARMAN_BASE_URL}/station/v1.0/list`,
        { page: 1, size: 20 },
        {
            params: { language: 'pt' },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }
    );
    return response.data;
}

async function getStationRealtime(stationId) {
    const token = await getAccessToken();
    const response = await axios.post(
        `${SOLARMAN_BASE_URL}/station/v1.0/realTime`,
        { stationId },
        {
            params: { language: 'pt' },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }
    );
    return response.data;
}

async function debugStationData() {
    try {
        console.log('\n=== BUSCANDO ESTAÇÕES ===');
        const stationsRes = await getStations();
        console.log('Estações encontradas:', stationsRes.stationList?.length || 0);

        if (stationsRes.stationList && stationsRes.stationList.length > 0) {
            const station = stationsRes.stationList[0];
            console.log('\n=== PRIMEIRA ESTAÇÃO ===');
            console.log('ID:', station.id);
            console.log('Nome:', station.name);
            console.log('Total Energy:', station.totalEnergy);
            console.log('Generation Power:', station.generationPower);

            const stationId = station.id;
            console.log(`\n=== DADOS EM TEMPO REAL DA ESTAÇÃO ${stationId} ===`);

            const realtime = await getStationRealtime(stationId);
            console.log('\n=== TODOS OS CAMPOS ===');
            console.log(JSON.stringify(realtime, null, 2));

            console.log('\n=== CAMPOS DE ENERGIA ===');
            console.log('generationPower (W):', realtime.generationPower);
            console.log('dayEnergy (kWh):', realtime.dayEnergy);
            console.log('generationTotal (kWh):', realtime.generationTotal);
            console.log('totalEnergy (kWh):', realtime.totalEnergy);
            console.log('monthEnergy (kWh):', realtime.monthEnergy);
            console.log('yearEnergy (kWh):', realtime.yearEnergy);
        }
    } catch (error) {
        console.error('Erro:', error.response?.data || error.message);
    }
}

debugStationData();
