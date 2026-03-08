const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DEFAULT_ENV_FILE = process.env.NOVOKIT_ENV_FILE
  || 'C:\\Users\\danil\\OneDrive\\Área de Trabalho\\Jheferson\\kit\\root\\novokit09\\.env.local';

let cachedConfig = null;

function parseEnvFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8');
    const out = {};
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    });
    return out;
  } catch (_) {
    return {};
  }
}

function getConfig() {
  if (cachedConfig) return cachedConfig;

  const envFromFile = parseEnvFile(DEFAULT_ENV_FILE);
  const url = process.env.NOVOKIT_SUPABASE_URL
    || process.env.NOVOKIT_URL
    || envFromFile.SUPABASE_URL
    || envFromFile.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey = process.env.NOVOKIT_SERVICE_ROLE_KEY
    || process.env.NOVOKIT_SUPABASE_SERVICE_ROLE_KEY
    || envFromFile.SUPABASE_SERVICE_ROLE_KEY;

  const anonKey = process.env.NOVOKIT_SUPABASE_ANON_KEY
    || process.env.NOVOKIT_ANON_KEY
    || envFromFile.SUPABASE_ANON_KEY
    || envFromFile.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const apiKey = serviceRoleKey || anonKey || '';
  cachedConfig = {
    enabled: Boolean(url && apiKey),
    baseUrl: (url || '').replace(/\/$/, ''),
    apiKey
  };
  return cachedConfig;
}

function isEnabled() {
  return getConfig().enabled;
}

function parseUnknownColumn(error) {
  const msg = String(
    error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || ''
  );
  let match = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
  if (match) return match[1];
  match = msg.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation/i);
  if (match) return match[1];
  return null;
}

async function restRequest(method, resourcePath, { params, data, preferRepresentation = false } = {}) {
  const cfg = getConfig();
  if (!cfg.enabled) {
    throw new Error('Novokit integration is not configured');
  }

  const headers = {
    apikey: cfg.apiKey,
    Authorization: `Bearer ${cfg.apiKey}`
  };
  if (preferRepresentation) headers.Prefer = 'return=representation';

  const response = await axios({
    method,
    url: `${cfg.baseUrl}${resourcePath}`,
    params,
    data,
    headers,
    timeout: 15000
  });
  return response.data;
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanObject(obj) {
  const out = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out;
}

function normalizeTipoFromNovokit(value) {
  return String(value || '').toLowerCase().includes('micro') ? 'Microinversor' : 'String';
}

function normalizeTipoToNovokit(value) {
  return String(value || '').toLowerCase().includes('micro') ? 'Micro Inversor' : 'String';
}

function normalizeFasesFromNovokit(value) {
  return String(value || '').toLowerCase().includes('tri') ? 'Trifásica' : 'Monofásica';
}

function normalizeFasesToNovokit(value, tipo) {
  if (String(tipo || '').toLowerCase().includes('micro')) return 'Monofásico';
  return String(value || '').toLowerCase().includes('tri') ? 'Trifásico' : 'Monofásico';
}

function mapNovokitToLocal(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: normalizeTipoFromNovokit(row.tipo),
    marca: row.marca || '',
    modelo: row.modelo || '',
    potencia_nominal: row.potencia_kw ?? '',
    fases: normalizeFasesFromNovokit(row.fases),
    tensao: row.tensao || '220V',
    afci_integrado: Boolean(row.afci_integrado),
    nomenclature_config: {
      showTipo: row.tipo_no_nome !== false,
      showPotencia: row.potencia_no_nome !== false,
      showFases: row.fases_no_nome !== false,
      showTensao: Boolean(row.tensao_no_nome),
      showMarca: row.marca_no_nome !== false,
      showAfci: Boolean(row.afci_no_nome),
      showRsd: Boolean(row.mostrar_rsd),
      additional_info: {
        fornecedor_id: row.fornecedor_id || '',
        qtd_entrada_mod: row.dc_total_strings ?? '',
        potencia_modulo_aceita_w: row.potencia_modulo_aceita_w ?? '',
        preco_kit: row.preco_kit ?? '',
        preco_avulso: row.preco_avulso ?? '',
        garantia_anos: row.garantia ?? '',
        rsd_rapid_shutdown: Boolean(row.rsd_rapid_shutdown),
        dc_tensao_max_entrada: row.dc_tensao_max_entrada ?? row.dc_tensao_max ?? '',
        dc_faixa_mppt_min: row.dc_faixa_mppt_min ?? row.dc_faixa_op_min ?? '',
        dc_faixa_mppt_max: row.dc_faixa_mppt_max ?? row.dc_faixa_op_max ?? '',
        dc_tensao_partida: row.dc_tensao_partida ?? '',
        dc_tensao_nominal: row.dc_tensao_nominal ?? '',
        dc_corrente_max_mppt: row.dc_corrente_max_mppt ?? row.dc_imax_mppt ?? '',
        dc_isc_max_mppt: row.dc_isc_max_mppt ?? '',
        dc_num_mppts: row.dc_num_mppts ?? '',
        dc_entradas_por_mppt: row.dc_entradas_mppt ?? '',
        ac_potencia_nominal: row.ac_potencia_nominal ?? '',
        ac_potencia_max: row.ac_potencia_max ?? '',
        ac_tensao_nominal: row.ac_tensao_nominal ?? '',
        ac_faixa_tensao_min: row.ac_faixa_tensao_min ?? '',
        ac_faixa_tensao_max: row.ac_faixa_tensao_max ?? '',
        ac_frequencia_tipo: row.ac_frequencia_tipo ?? '60hz',
        ac_frequencia_min: row.ac_frequencia_min ?? '',
        ac_frequencia_max: row.ac_frequencia_max ?? '',
        ac_corrente_nominal: row.ac_corrente_nominal ?? '',
        ac_eficiencia_max: row.ac_eficiencia_max_brasil ?? row.eficiencia_max ?? '',
        prot_sobretensao_dc: Boolean(row.prot_sobretensao_dc),
        prot_polaridade_reversa: Boolean(row.prot_polaridade_reversa),
        prot_sobrecorrente_dc: Boolean(row.prot_sobrecorrente_dc),
        prot_isolamento: Boolean(row.prot_isolamento),
        prot_sobretensao_ac: Boolean(row.prot_sobretensao_ac),
        prot_sobrecorrente_ac: Boolean(row.prot_sobrecorrente_ac),
        prot_sobrefrequencia: Boolean(row.prot_sobrefrequencia),
        prot_subfrequencia: Boolean(row.prot_subfrequencia),
        prot_anti_ilhamento: Boolean(row.prot_anti_ilhamento),
        prot_superaquecimento: Boolean(row.prot_superaquecimento),
        grau_protecao: row.grau_protecao ?? '',
        consumo_noturno_w: row.consumo_noturno ?? '',
        temp_operacao_min: row.temperatura_op_min ?? '',
        temp_operacao_max: row.temperatura_op_max ?? '',
        dimensoes_mm: [row.dimensoes_comp, row.dimensoes_larg, row.dimensoes_esp].filter((v) => v !== null && v !== undefined).join(' x '),
        peso_kg: row.peso ?? ''
      }
    }
  };
}

function mapLocalToNovokit(payload) {
  const cfg = payload?.nomenclature_config || {};
  const info = cfg.additional_info || {};
  const tipo = normalizeTipoToNovokit(payload?.tipo);
  const fases = normalizeFasesToNovokit(payload?.fases, tipo);

  return cleanObject({
    fornecedor_id: info.fornecedor_id || null,
    tipo,
    fases,
    tensao: payload?.tensao || '220V',
    marca: payload?.marca || '',
    modelo: payload?.modelo || '',
    potencia_kw: toNumberOrNull(payload?.potencia_nominal),
    dc_total_strings: toNumberOrNull(info.qtd_entrada_mod),
    potencia_modulo_aceita_w: toNumberOrNull(info.potencia_modulo_aceita_w),
    preco_kit: toNumberOrNull(info.preco_kit),
    preco_avulso: toNumberOrNull(info.preco_avulso),
    garantia: toNumberOrNull(info.garantia_anos),
    afci_integrado: Boolean(payload?.afci_integrado),
    rsd_rapid_shutdown: Boolean(info.rsd_rapid_shutdown),
    marca_no_nome: cfg.showMarca !== false,
    tipo_no_nome: cfg.showTipo !== false,
    afci_no_nome: Boolean(cfg.showAfci),
    tensao_no_nome: Boolean(cfg.showTensao),
    fases_no_nome: cfg.showFases !== false,
    potencia_no_nome: cfg.showPotencia !== false,
    mostrar_rsd: Boolean(cfg.showRsd),
    dc_tensao_max_entrada: toNumberOrNull(info.dc_tensao_max_entrada),
    dc_faixa_mppt_min: toNumberOrNull(info.dc_faixa_mppt_min),
    dc_faixa_mppt_max: toNumberOrNull(info.dc_faixa_mppt_max),
    dc_tensao_partida: toNumberOrNull(info.dc_tensao_partida),
    dc_tensao_nominal: toNumberOrNull(info.dc_tensao_nominal),
    dc_corrente_max_mppt: toNumberOrNull(info.dc_corrente_max_mppt),
    dc_isc_max_mppt: toNumberOrNull(info.dc_isc_max_mppt),
    dc_num_mppts: toNumberOrNull(info.dc_num_mppts),
    dc_entradas_mppt: toNumberOrNull(info.dc_entradas_por_mppt),
    ac_potencia_nominal: toNumberOrNull(info.ac_potencia_nominal),
    ac_potencia_max: toNumberOrNull(info.ac_potencia_max),
    ac_tensao_nominal: toNumberOrNull(info.ac_tensao_nominal),
    ac_faixa_tensao_min: toNumberOrNull(info.ac_faixa_tensao_min),
    ac_faixa_tensao_max: toNumberOrNull(info.ac_faixa_tensao_max),
    ac_frequencia_tipo: info.ac_frequencia_tipo || '60hz',
    ac_frequencia_min: toNumberOrNull(info.ac_frequencia_min),
    ac_frequencia_max: toNumberOrNull(info.ac_frequencia_max),
    ac_corrente_nominal: toNumberOrNull(info.ac_corrente_nominal),
    eficiencia_max: toNumberOrNull(info.ac_eficiencia_max),
    prot_sobretensao_dc: Boolean(info.prot_sobretensao_dc),
    prot_polaridade_reversa: Boolean(info.prot_polaridade_reversa),
    prot_sobrecorrente_dc: Boolean(info.prot_sobrecorrente_dc),
    prot_isolamento: Boolean(info.prot_isolamento),
    prot_sobretensao_ac: Boolean(info.prot_sobretensao_ac),
    prot_sobrecorrente_ac: Boolean(info.prot_sobrecorrente_ac),
    prot_sobrefrequencia: Boolean(info.prot_sobrefrequencia),
    prot_subfrequencia: Boolean(info.prot_subfrequencia),
    prot_anti_ilhamento: Boolean(info.prot_anti_ilhamento),
    prot_superaquecimento: Boolean(info.prot_superaquecimento),
    grau_protecao: info.grau_protecao || null,
    consumo_noturno: toNumberOrNull(info.consumo_noturno_w),
    temperatura_op_min: toNumberOrNull(info.temp_operacao_min),
    temperatura_op_max: toNumberOrNull(info.temp_operacao_max),
    peso: toNumberOrNull(info.peso_kg)
  });
}

async function writeInversorWithFallback(method, id, payload) {
  let data = { ...payload };
  let lastError = null;

  for (let i = 0; i < 12; i += 1) {
    try {
      if (method === 'post') {
        const inserted = await restRequest('post', '/rest/v1/inversores', {
          data: [data],
          preferRepresentation: true
        });
        return Array.isArray(inserted) ? inserted[0] : inserted;
      }

      const updated = await restRequest('patch', '/rest/v1/inversores', {
        params: { id: `eq.${id}`, select: '*' },
        data,
        preferRepresentation: true
      });
      return Array.isArray(updated) ? updated[0] : updated;
    } catch (error) {
      lastError = error;
      const unknownColumn = parseUnknownColumn(error);
      if (!unknownColumn || !(unknownColumn in data)) break;
      delete data[unknownColumn];
    }
  }
  throw lastError;
}

async function fetchInverters() {
  let rows = [];
  try {
    rows = await restRequest('get', '/rest/v1/inversores', {
      params: { select: '*', order: 'created_at.desc' }
    });
  } catch (_) {
    rows = await restRequest('get', '/rest/v1/inversores', {
      params: { select: '*' }
    });
  }
  return (rows || []).map(mapNovokitToLocal);
}

async function fetchInverterById(id) {
  const rows = await restRequest('get', '/rest/v1/inversores', {
    params: { select: '*', id: `eq.${id}`, limit: 1 }
  });
  return mapNovokitToLocal((rows || [])[0] || null);
}

async function createInverter(payload) {
  const row = mapLocalToNovokit(payload);
  const created = await writeInversorWithFallback('post', null, row);
  return mapNovokitToLocal(created);
}

async function updateInverter(id, payload) {
  const row = mapLocalToNovokit(payload);
  const updated = await writeInversorWithFallback('patch', id, row);
  return mapNovokitToLocal(updated);
}

async function deleteInverter(id) {
  await restRequest('delete', '/rest/v1/inversores', {
    params: { id: `eq.${id}` }
  });
  return { message: 'Inverter deleted successfully' };
}

async function fetchFornecedoresOptions() {
  const rows = await restRequest('get', '/rest/v1/fornecedores', {
    params: { select: 'id,nome,tipos_material', order: 'nome.asc' }
  });
  const mapped = (rows || [])
    .filter((row) => {
      if (!row || !row.id) return false;
      if (!row.tipos_material) return true;
      return Array.isArray(row.tipos_material)
        ? row.tipos_material.includes('Kit Fotovoltaico')
        : true;
    })
    .map((row) => ({
      id: row.id,
      nome: row.nome || 'Fornecedor sem nome'
    }));
  return mapped;
}

module.exports = {
  isEnabled,
  fetchInverters,
  fetchInverterById,
  createInverter,
  updateInverter,
  deleteInverter,
  fetchFornecedoresOptions
};
