const express = require('express');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const { SolarmanClient } = require('../solarmanClient');
const { SolisClient } = require('../solisClient');
const { DeyeClient } = require('../deyeClient');

const router = express.Router();
const solarman = new SolarmanClient();
const solis = new SolisClient();
const deye = new DeyeClient();
const SOLARMAN_SERIAL_CACHE_PATH = path.resolve(process.cwd(), 'var', 'solarman-serial-presence.json');
const SERIAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function parsePageTotal(result) {
  return result?.data?.page?.total ?? result?.data?.total ?? null;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function mapLimit(items, limit, worker) {
  const result = [];
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const current = idx++;
      result[current] = await worker(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => run());
  await Promise.all(workers);
  return result;
}

async function findSerialsExistingInSolarman(serials) {
  const now = Date.now();
  const cache = readJson(SOLARMAN_SERIAL_CACHE_PATH, { entries: {} });
  const entries = cache.entries || {};

  const unknown = [];
  const existsSet = new Set();

  for (const sn of serials) {
    const key = String(sn);
    const cached = entries[key];
    if (cached && now - Number(cached.checkedAt || 0) < SERIAL_CACHE_TTL_MS) {
      if (cached.exists) existsSet.add(key);
      continue;
    }
    unknown.push(key);
  }

  if (unknown.length > 0) {
    await mapLimit(unknown, 8, async (sn) => {
      let exists = false;
      try {
        const comm = await solarman.deviceCommunication({ deviceSn: sn });
        exists = Boolean(comm?.communication?.deviceSn || comm?.deviceSn);
      } catch (e) {
        exists = false;
      }
      entries[sn] = { exists, checkedAt: Date.now() };
      if (exists) existsSet.add(sn);
    });
    writeJson(SOLARMAN_SERIAL_CACHE_PATH, { entries, updatedAt: new Date().toISOString() });
  }

  return existsSet;
}

async function listDeyeStationsDeduped({ page = 1, size = 200, all = false } = {}) {
  const stationsRes = all
    ? await deye.stationListAll({ size, maxPages: 100 })
    : await deye.stationList({ page, size });
  const stationList = stationsRes?.stationList || [];
  if (stationList.length === 0) {
    return {
      originalTotal: stationsRes?.total || 0,
      filteredTotal: 0,
      removedByDuplicateInverter: 0,
      stations: [],
    };
  }

  const stationIds = stationList
    .map((s) => Number(s.id || s.stationId))
    .filter((n) => Number.isFinite(n));

  const stationToSerialCandidates = new Map();
  const chunkSize = 10;
  for (let i = 0; i < stationIds.length; i += chunkSize) {
    const chunk = stationIds.slice(i, i + chunkSize);
    const deviceRes = await deye.stationDevice({ stationIds: chunk, page: 1, size: 200 });
    const devices = deviceRes?.deviceListItems || deviceRes?.deviceList || [];
    devices.forEach((d) => {
      const sid = String(d.stationId || d.id || '');
      const sn = String(d.deviceSn || '').trim();
      if (!sid || !sn) return;
      if (!stationToSerialCandidates.has(sid)) {
        stationToSerialCandidates.set(sid, { inverter: new Set(), other: new Set() });
      }
      const entry = stationToSerialCandidates.get(sid);
      const type = String(d.deviceType || '').toUpperCase();
      if (type.includes('INVERTER')) entry.inverter.add(sn);
      else entry.other.add(sn);
    });
  }

  const allSerials = new Set();
  for (const entry of stationToSerialCandidates.values()) {
    const source = entry.inverter.size > 0 ? entry.inverter : entry.other;
    source.forEach((sn) => allSerials.add(sn));
  }

  const existingInSolarman = await findSerialsExistingInSolarman(Array.from(allSerials));

  const filteredStations = [];
  let removedByDuplicateInverter = 0;

  for (const s of stationList) {
    const sid = String(s.id || s.stationId || '');
    const serialEntry = stationToSerialCandidates.get(sid);
    const source = serialEntry
      ? (serialEntry.inverter.size > 0 ? serialEntry.inverter : serialEntry.other)
      : new Set();
    const overlaps = Array.from(source).some((sn) => existingInSolarman.has(sn));
    if (overlaps) {
      removedByDuplicateInverter += 1;
      continue;
    }

    const generationPower = Number(s.generationPower || 0);
    const statusRaw = String(s.status || s.stationStatus || '').toLowerCase();
    const online = generationPower > 0 || statusRaw.includes('online') || statusRaw.includes('normal');
    filteredStations.push({
      id: String(s.id || s.stationId),
      name: s.name || s.stationName || `Deye ${s.id || s.stationId}`,
      location: s.locationAddress || s.location || s.address || '',
      status: online ? 'online' : 'offline',
      capacity: s.installedCapacity || s.capacity || null,
      provider: 'deye',
      source: 'deye',
      duplicateFiltered: false,
    });
  }

  return {
    originalTotal: stationsRes?.total || stationList.length,
    filteredTotal: filteredStations.length,
    removedByDuplicateInverter,
    stations: filteredStations,
  };
}

router.get('/', authMiddleware, async (req, res) => {
  const status = {
    solarman: { configured: true, connected: false, details: {} },
    solis: { configured: solis.isConfigured(), connected: false, details: {} },
    deye: { configured: deye.isConfigured(), connected: false, details: {} },
  };

  try {
    const solarmanList = await solarman.stationList({ page: 1, size: 1 });
    status.solarman.connected = true;
    status.solarman.details.totalStations = solarmanList?.total ?? null;
  } catch (error) {
    status.solarman.details.error = error.message;
  }

  if (!status.solis.configured) {
    // Keep evaluating Deye even when Solis is disabled.
  } else {
    try {
      const stations = await solis.userStationList({ pageNo: 1, pageSize: 1 });
      const inverters = await solis.inverterList({ pageNo: 1, pageSize: 1, stationId: undefined });
      status.solis.connected = solis.isSuccess(stations) && solis.isSuccess(inverters);
      status.solis.details.stationsTotal = parsePageTotal(stations);
      status.solis.details.invertersTotal = parsePageTotal(inverters);
      status.solis.details.apiCode = stations?.code ?? null;
      status.solis.details.apiMessage = stations?.msg ?? null;
    } catch (error) {
      status.solis.details.error = error.message;
    }
  }

  if (status.deye.configured) {
    try {
      const stationRes = await deye.stationList({ page: 1, size: 1 });
      const dedupePreview = await listDeyeStationsDeduped({ page: 1, size: 50 });
      status.deye.connected = true;
      status.deye.details.stationsTotal = stationRes?.total ?? null;
      status.deye.details.filteredStationsTotal = dedupePreview.filteredTotal;
      status.deye.details.removedByDuplicateInverter = dedupePreview.removedByDuplicateInverter;
    } catch (error) {
      status.deye.details.error = error.message;
    }
  }

  return res.json(status);
});

router.get('/solis/stations', authMiddleware, async (req, res) => {
  try {
    const pageNo = Number(req.query.pageNo || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const result = await solis.userStationList({ pageNo, pageSize });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/solis/inverters', authMiddleware, async (req, res) => {
  try {
    const pageNo = Number(req.query.pageNo || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;
    const result = await solis.inverterList({ pageNo, pageSize, stationId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deye/stations', authMiddleware, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 200);
    const all = String(req.query.all || 'true').toLowerCase() === 'true';
    const data = await listDeyeStationsDeduped({ page, size, all });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
