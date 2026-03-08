const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { SolarmanClient } = require('./solarmanClient');
const { readToken } = require('./utils/tokenStore');
const { TOKEN_CACHE_PATH } = require('./config');
const { callGemini } = require('./services/gemini-client');

const app = express();
app.disable('etag');
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(cors());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'var', 'storage')));

// Create a main router for all business logic
const router = express.Router();

// Register new routes
const authRoutes = require('./routes/auth');
const inverterRoutes = require('./routes/inverters');
const branchRoutes = require('./routes/branches');
const employeeRoutes = require('./routes/employees');
const customerRoutes = require('./routes/customers');
const contactRoutes = require('./routes/contacts'); // New route
const stationRoutes = require('./routes/stations');
const ticketRoutes = require('./routes/tickets');
const ticketReasonRoutes = require('./routes/ticket-reasons');
const uploadRoutes = require('./routes/upload');
const invoiceRoutes = require('./routes/invoices');
const jotaRoutes = require('./routes/jota');
const statsRoutes = require('./routes/stats');
const aiVisionRoutes = require('./routes/ai-vision');
const superJotaRoutes = require('./routes/super-jota');
const moduleRoutes = require('./routes/modules');
const integrationRoutes = require('./routes/integrations');

router.use('/auth', authRoutes);
router.use('/inverters', inverterRoutes);
router.use('/branches', branchRoutes);
router.use('/employees', employeeRoutes);
router.use('/customers', customerRoutes);
router.use('/customers/:id/contacts', contactRoutes); // Mount contacts sub-route
router.use('/stations', stationRoutes);

router.use('/tickets', ticketRoutes);
router.use('/ticket-reasons', ticketReasonRoutes);
router.use('/upload', uploadRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/jota', jotaRoutes);
router.use('/stats', statsRoutes);
router.use('/ai-vision', aiVisionRoutes);
router.use('/super-jota', superJotaRoutes);
router.use('/modules', moduleRoutes);
router.use('/integrations', integrationRoutes);

const client = new SolarmanClient();

router.post('/auth/token', async (req, res) => {
  try {
    const token = await client.obtainToken();
    res.json({ success: true, token });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/auth/token', async (req, res) => {
  try {
    const cached = readToken(TOKEN_CACHE_PATH);
    if (!cached) return res.status(404).json({ success: false, error: 'Token não encontrado' });
    const full = String(req.query.full || '').toLowerCase() === 'true';
    if (full) return res.json(cached);
    return res.json({ token_type: cached.token_type, obtainedAt: cached.obtainedAt, expiresAt: cached.expiresAt });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stations', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 100);
    const data = await client.stationList({ page, size });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Explicitly define available stations route here to avoid router issues
router.get('/stations/available', async (req, res) => {
  try {
    const size = Number(req.query.size || 100);
    const data = await client.stationListAll({ size });
    const stations = (data.stationList || []).map(s => ({
      id: String(s.id),
      name: s.name,
      location: s.location,
      status: s.generationPower > 0 ? 'online' : 'offline',
      capacity: s.installedCapacity
    }));
    res.json(stations);
  } catch (error) {
    console.error('Error fetching available stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations from Solarman' });
  }
});

router.get('/stations/all', async (req, res) => {
  try {
    const size = Number(req.query.size || 50);
    const data = await client.stationListAll({ size });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stations/:stationId/realtime', async (req, res) => {
  try {
    const data = await client.stationRealTime(Number(req.params.stationId));
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stations/:stationId/devices', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { page, size, deviceType } = req.query;
    const data = await client.stationDevices({ stationId: Number(stationId), page: Number(page || 1), size: Number(size || 10), deviceType });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stations/:stationId/devices/realtime', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { deviceType, size } = req.query;
    const data = await client.stationDevicesRealtime({ stationId: Number(stationId), deviceType, size: Number(size || 50) });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/stations/history', async (req, res) => {
  try {
    const data = await client.stationHistorical(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stations/:stationId/history', async (req, res) => {
  try {
    const stationId = Number(req.params.stationId);
    const timeType = Number(req.query.timeType || 2);
    const now = new Date();
    const toISODate = (d) => new Date(d).toISOString().slice(0, 10);
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const defaultMonth = `${y}-${m}`;
    const defaultYear = `${y}`;
    let payload = { stationId, timeType };
    if (timeType === 1) {
      const day = String(req.query.day || toISODate(now));
      payload.startTime = day;
      payload.endTime = String(req.query.end || day);
    } else if (timeType === 3) {
      const start = String(req.query.startTime || req.query.start || defaultMonth);
      const end = String(req.query.endTime || req.query.end || start);
      payload.startTime = start;
      payload.endTime = end;
    } else if (timeType === 4) {
      const start = String(req.query.startTime || req.query.start || defaultYear);
      const end = String(req.query.endTime || req.query.end || start);
      payload.startTime = start;
      payload.endTime = end;
    } else {
      const start = String(req.query.startTime || req.query.start || toISODate(now));
      const end = String(req.query.endTime || req.query.end || start);
      payload.startTime = start;
      payload.endTime = end;
    }
    const data = await client.stationHistorical(payload);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/stations/:stationId/alarms', async (req, res) => {
  try {
    const payload = { stationId: Number(req.params.stationId), ...req.body };
    const data = await client.stationAlarms(payload);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/stations/:stationId/alerts', async (req, res) => {
  try {
    const stationId = Number(req.params.stationId);
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 20);
    const startTime = String(req.query.start || req.query.startTime || '');
    const endTime = String(req.query.end || req.query.endTime || startTime);
    if (!startTime) return res.status(400).json({ success: false, error: 'Parâmetro start/startTime é obrigatório' });
    const data = await client.stationAlarms({ stationId, page, size, startTime, endTime });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/devices/current', async (req, res) => {
  try {
    const data = await client.deviceCurrentData(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/devices/:deviceSn/realtime', async (req, res) => {
  try {
    const data = await client.deviceCurrentDataBySn(req.params.deviceSn);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/devices/:deviceSn/communication', async (req, res) => {
  try {
    const full = String(req.query.full || '').toLowerCase() === 'true';
    const data = await client.deviceCommunication({ deviceSn: req.params.deviceSn });
    if (full) return res.json(data);
    const c = data.communication || {};
    return res.json({
      deviceSn: c.deviceSn,
      deviceId: c.deviceId,
      deviceType: c.deviceType,
      deviceState: c.deviceState,
      updateTime: c.updateTime,
      timeZone: c.timeZone,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/devices/:deviceSn/communication/inverters', async (req, res) => {
  try {
    const data = await client.deviceCommunication({ deviceSn: req.params.deviceSn });
    const c = data.communication || {};
    const list = Array.isArray(c.childList) ? c.childList : [];
    const onlyInv = list.filter(x => String(x.deviceType).includes('INVERTER'));
    const now = Math.floor(Date.now() / 1000);
    const staleSec = Number(req.query.staleSec || 900);
    const mapped = onlyInv.map(x => {
      const stale = typeof x.updateTime === 'number' ? (now - x.updateTime > staleSec) : true;
      let status;
      if (Number(x.deviceState) === 3) status = 'offline';
      else if (stale) status = 'online sem comunicação';
      else status = 'online';
      return { deviceSn: x.deviceSn, status };
    });
    res.json({ count: mapped.length, inverters: mapped });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/devices/:deviceSn/alarms', async (req, res) => {
  try {
    const { deviceSn } = req.params;
    const now = Math.floor(Date.now() / 1000);
    const rangeDays = Number(req.query.days || 30);
    const endTimestamp = Number(req.query.endTimestamp || now);
    const startTimestamp = Number(req.query.startTimestamp || (endTimestamp - rangeDays * 24 * 60 * 60));
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 10);
    const data = await client.deviceAlertList({ deviceSn, startTimestamp, endTimestamp, page, size });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/devices/:deviceSn/alarms/:alertId', async (req, res) => {
  try {
    const { deviceSn, alertId } = req.params;
    const data = await client.deviceAlertDetail({ alertId: Number(alertId), deviceSn });
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/devices/history', async (req, res) => {
  try {
    const data = await client.deviceHistorical(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/devices/:deviceSn/history', async (req, res) => {
  try {
    const { deviceSn } = req.params;
    const timeType = Number(req.query.timeType || 2);
    const now = new Date();
    const toISODate = (d) => new Date(d).toISOString().slice(0, 10);
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const defaultMonth = `${y}-${m}`;
    const defaultYear = `${y}`;
    let payload = { deviceSn, timeType };
    if (timeType === 5) {
      const endTs = req.query.endTs ? Number(req.query.endTs) : Math.floor(Date.now() / 1000);
      const startTs = req.query.startTs ? Number(req.query.startTs) : (endTs - 3600);
      payload.startTime = String(startTs);
      payload.endTime = String(endTs);
    } else if (timeType === 3) {
      const start = String(req.query.start || defaultMonth);
      const end = String(req.query.end || start);
      payload.startTime = start;
      payload.endTime = end;
    } else if (timeType === 4) {
      const start = String(req.query.start || defaultYear);
      const end = String(req.query.end || start);
      payload.startTime = start;
      payload.endTime = end;
    } else {
      const start = String(req.query.startTime || req.query.start || toISODate(now));
      const end = String(req.query.end || start);
      payload.startTime = start;
      payload.endTime = end;
    }
    const data = await client.deviceHistorical(payload);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/devices/alarms/detail', async (req, res) => {
  try {
    const data = await client.deviceAlarmDetail(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/analyze-alert', async (req, res) => {
  try {
    const { alertName, deviceType, message, stationId, deviceSn } = req.body;

    let deviceInfo = '';

    // If we have stationId and deviceSn, try to fetch specific device details
    if (stationId && deviceSn) {
      try {
        // Fetch all devices for this station
        const devicesRes = await client.stationDevices({ stationId, size: 100 });
        const list = devicesRes.deviceListItems || devicesRes.deviceList || [];

        // Find the matching device
        const device = list.find(d => d.deviceSn === deviceSn || d.sn === deviceSn);

        if (device) {
          deviceInfo = `
      Marca do Inversor: ${device.deviceBrand || 'Desconhecida'}
      Modelo do Inversor: ${device.deviceModel || 'Desconhecido'}
      Nome do Dispositivo: ${device.deviceName || 'N/A'}
      Número de Série: ${deviceSn}`;
        }
      } catch (err) {
        console.error('Error fetching device details for analysis:', err);
        // Continue without device info if fetch fails
      }
    }

    const prompt = `
      Analise o seguinte erro de um inversor solar/sistema fotovoltaico:
      Erro: ${alertName}
      Tipo de Dispositivo: ${deviceType}
      Mensagem Extra: ${message || 'N/A'}${deviceInfo}
      
      Retorne um JSON com dois campos:
      1. "meaning": Explicação técnica simples do que significa o erro, considerando a marca/modelo se disponível.
      2. "advice": Passos práticos para resolver ou verificar o problema, específicos para esta marca se possível.
      
      Responda em Português do Brasil. Mantenha curto e direto.
    `;

    const result = await callGemini(prompt, { expectJson: true });
    res.json(result);
  } catch (e) {
    console.error('OpenAI Error:', e);
    res.status(500).json({ success: false, error: 'Falha na análise de IA' });
  }
});

// --- Rules Endpoints ---
const { getRules, addRule, deleteRule } = require('./utils/rulesStore');

router.get('/rules', (req, res) => {
  try {
    const rules = getRules();
    res.json(rules);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/rules', (req, res) => {
  try {
    const { name, parameter, operator, value, severity } = req.body;
    if (!name || !parameter || !operator || !value) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });
    }
    const newRule = addRule({ name, parameter, operator, value, severity });
    res.json(newRule);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/rules/:id', (req, res) => {
  try {
    const success = deleteRule(req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Regra não encontrada' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// MOUNT ROUTER AT /api and /
app.use('/api', router);

module.exports = app;
