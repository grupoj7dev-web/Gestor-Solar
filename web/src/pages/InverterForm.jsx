import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Link2, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { parameterDefinitions } from '../lib/parameterDefinitions';

const defaultNomenclature = {
  showTipo: true,
  showPotencia: true,
  showFases: true,
  showTensao: true,
  showMarca: true,
  showAfci: false,
  showRsd: false
};

const defaultInfo = {
  fornecedor_id: '',
  qtd_entrada_mod: '',
  potencia_modulo_aceita_w: '',
  preco_kit: '',
  preco_avulso: '',
  garantia_anos: '',
  rsd_rapid_shutdown: false,
  dc_tensao_max_entrada: '',
  dc_faixa_mppt_min: '',
  dc_faixa_mppt_max: '',
  dc_tensao_partida: '',
  dc_tensao_nominal: '',
  dc_corrente_max_mppt: '',
  dc_isc_max_mppt: '',
  dc_num_mppts: '',
  dc_entradas_por_mppt: '',
  ac_potencia_nominal: '',
  ac_potencia_max: '',
  ac_tensao_nominal: '',
  ac_faixa_tensao_min: '',
  ac_faixa_tensao_max: '',
  ac_frequencia_tipo: '60hz',
  ac_frequencia_min: '',
  ac_frequencia_max: '',
  ac_corrente_nominal: '',
  ac_eficiencia_max: '',
  prot_sobretensao_dc: false,
  prot_polaridade_reversa: false,
  prot_sobrecorrente_dc: false,
  prot_isolamento: false,
  prot_sobretensao_ac: false,
  prot_sobrecorrente_ac: false,
  prot_sobrefrequencia: false,
  prot_subfrequencia: false,
  prot_anti_ilhamento: false
};

const numericKeys = [
  'qtd_entrada_mod',
  'potencia_modulo_aceita_w',
  'preco_kit',
  'preco_avulso',
  'garantia_anos',
  'dc_tensao_max_entrada',
  'dc_faixa_mppt_min',
  'dc_faixa_mppt_max',
  'dc_tensao_partida',
  'dc_tensao_nominal',
  'dc_corrente_max_mppt',
  'dc_isc_max_mppt',
  'dc_num_mppts',
  'dc_entradas_por_mppt',
  'ac_potencia_nominal',
  'ac_potencia_max',
  'ac_tensao_nominal',
  'ac_faixa_tensao_min',
  'ac_faixa_tensao_max',
  'ac_frequencia_min',
  'ac_frequencia_max',
  'ac_corrente_nominal',
  'ac_eficiencia_max'
];

const emptyNewParameter = {
  parameter_id: '',
  operator: '>',
  value: '',
  severity: 'medium',
  unit: '',
  description: '',
  enabled: true,
  delay_seconds: '0',
  cooldown_seconds: '0',
  hysteresis: '0'
};

function normalizeInfo(raw) {
  return { ...defaultInfo, ...(raw || {}) };
}

function normalizeParameter(param) {
  return {
    ...(param || {}),
    parameter_id: String(param?.parameter_id || '').trim(),
    parameter_name: String(param?.parameter_name || '').trim(),
    operator: String(param?.operator || '>').trim(),
    value: Number(param?.value),
    severity: String(param?.severity || 'medium').toLowerCase(),
    unit: String(param?.unit || '').trim(),
    description: String(param?.description || '').trim(),
    enabled: param?.enabled !== false,
    delay_seconds: Number(param?.delay_seconds || 0),
    cooldown_seconds: Number(param?.cooldown_seconds || 0),
    hysteresis: Number(param?.hysteresis || 0),
    source_type: String(param?.source_type || 'specific').trim() || 'specific'
  };
}

function buildTensaoOptions(tipo, fases) {
  if (tipo === 'Microinversor') return ['220V', '127V'];
  if (fases === 'Trifásica') return ['380V', '220V'];
  return ['220V', '127V'];
}

function parameterKey(param) {
  return [
    param.parameter_id,
    param.operator,
    Number(param.value),
    param.severity,
    param.enabled !== false ? 1 : 0,
    Number(param.delay_seconds || 0),
    Number(param.cooldown_seconds || 0),
    Number(param.hysteresis || 0),
    String(param.unit || '')
  ].join('|');
}

function toPayloadParameter(param) {
  const normalized = normalizeParameter(param);
  return {
    parameter_id: normalized.parameter_id,
    parameter_name: normalized.parameter_name,
    operator: normalized.operator,
    value: Number(normalized.value),
    severity: normalized.severity,
    unit: normalized.unit || null,
    description: normalized.description || '',
    enabled: normalized.enabled !== false,
    delay_seconds: Number(normalized.delay_seconds || 0),
    cooldown_seconds: Number(normalized.cooldown_seconds || 0),
    hysteresis: Number(normalized.hysteresis || 0),
    source_type: normalized.source_type || 'specific',
    is_global: false
  };
}

export function InverterForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fornecedores, setFornecedores] = useState([]);
  const [parameterCatalog, setParameterCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [parameters, setParameters] = useState([]);
  const [pendingParameters, setPendingParameters] = useState([]);
  const [newParameter, setNewParameter] = useState({ ...emptyNewParameter });
  const [editingParameterKey, setEditingParameterKey] = useState('');

  const [formData, setFormData] = useState({
    tipo: 'String',
    marca: '',
    modelo: '',
    potencia_nominal: '',
    fases: 'Monofásica',
    tensao: '220V',
    afci_integrado: false,
    nomenclature_config: {
      ...defaultNomenclature,
      additional_info: { ...defaultInfo }
    }
  });

  const info = useMemo(
    () => normalizeInfo(formData.nomenclature_config?.additional_info),
    [formData.nomenclature_config]
  );

  const tensaoOptions = useMemo(
    () => buildTensaoOptions(formData.tipo, formData.fases),
    [formData.tipo, formData.fases]
  );

  const allParameters = useMemo(() => {
    const persisted = (parameters || []).map((p) => ({ ...normalizeParameter(p), _pending: false }));
    const pending = (pendingParameters || []).map((p) => ({ ...normalizeParameter(p), _pending: true }));
    return [...persisted, ...pending];
  }, [parameters, pendingParameters]);

  const filteredCatalog = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();
    if (!search) return parameterCatalog;
    return parameterCatalog.filter((item) => {
      const label = String(item.parameter_name || '').toLowerCase();
      const code = String(item.parameter_id || '').toLowerCase();
      const unit = String(item.unit || '').toLowerCase();
      return label.includes(search) || code.includes(search) || unit.includes(search);
    });
  }, [catalogSearch, parameterCatalog]);

  useEffect(() => {
    fetchFornecedores();
    fetchParameterCatalog();
    setSelectedTemplateKey('');
    setCatalogSearch('');
    setEditingParameterKey('');
    setNewParameter({ ...emptyNewParameter });
    if (id) {
      fetchInverter();
      fetchInverterParameters();
    } else {
      setParameters([]);
      setPendingParameters([]);
    }
  }, [id]);

  useEffect(() => {
    setFormData((prev) => {
      const next = { ...prev };
      if (next.tipo === 'Microinversor') {
        next.fases = 'Monofásica';
      }
      const validTensoes = buildTensaoOptions(next.tipo, next.fases);
      if (!validTensoes.includes(next.tensao)) {
        next.tensao = validTensoes[0];
      }
      return next;
    });
  }, [formData.tipo, formData.fases]);

  const fetchFornecedores = async () => {
    try {
      const { data } = await api.get('/inverters/fornecedores/options', {
        params: { _t: Date.now() }
      });
      setFornecedores(data || []);
    } catch (fetchError) {
      console.error('Error fetching suppliers:', fetchError);
    }
  };

  const fetchParameterCatalog = async () => {
    try {
      const { data } = await api.get('/inverters/parameters/catalog', {
        params: { _t: Date.now() }
      });
      setParameterCatalog((data || []).map((item) => normalizeParameter(item)));
    } catch (fetchError) {
      console.error('Error fetching parameter catalog:', fetchError);
      setParameterCatalog([]);
    }
  };

  const fetchInverter = async () => {
    try {
      const { data } = await api.get(`/inverters/${id}`, {
        params: { _t: Date.now() }
      });
      const config = data.nomenclature_config || {};
      setFormData({
        tipo: data.tipo || 'String',
        marca: data.marca || '',
        modelo: data.modelo || '',
        potencia_nominal: data.potencia_nominal || '',
        fases: data.tipo === 'Microinversor' ? 'Monofásica' : (data.fases || 'Monofásica'),
        tensao: data.tensao || '220V',
        afci_integrado: !!data.afci_integrado,
        nomenclature_config: {
          ...defaultNomenclature,
          ...config,
          additional_info: normalizeInfo(config.additional_info)
        }
      });
    } catch (fetchError) {
      console.error('Error fetching inverter:', fetchError);
      setError('Erro ao carregar inversor');
    }
  };

  const fetchInverterParameters = async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/inverters/${id}/parameters`, {
        params: { _t: Date.now() }
      });
      setParameters((data || []).map((item) => normalizeParameter(item)));
    } catch (fetchError) {
      console.error('Error fetching inverter parameters:', fetchError);
      setParameters([]);
    }
  };

  const setInfoField = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      nomenclature_config: {
        ...prev.nomenclature_config,
        additional_info: {
          ...normalizeInfo(prev.nomenclature_config?.additional_info),
          [key]: value
        }
      }
    }));
  };

  const existsParameter = (candidate, ignoreIdentity) => {
    const candidateKey = parameterKey(candidate);
    return allParameters.some((p) => {
      if (ignoreIdentity && (p.id === ignoreIdentity || p.temp_id === ignoreIdentity)) return false;
      return parameterKey(p) === candidateKey;
    });
  };

  const attachParameter = async (param) => {
    const normalized = normalizeParameter(param);
    if (existsParameter(normalized)) {
      setError('Este parâmetro já está vinculado ao inversor');
      return;
    }

    if (id) {
      await api.post(`/inverters/${id}/parameters`, toPayloadParameter(normalized));
      await fetchInverterParameters();
      await fetchParameterCatalog();
      return;
    }

    const tempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setPendingParameters((prev) => [...prev, { ...normalized, temp_id: tempId }]);
  };

  const handleLinkExistingParameter = async () => {
    setError('');
    if (!selectedTemplateKey) {
      setError('Selecione um parâmetro existente para vincular');
      return;
    }
    const template = parameterCatalog.find((item) => item.template_key === selectedTemplateKey);
    if (!template) {
      setError('Parâmetro selecionado não encontrado');
      return;
    }

    try {
      await attachParameter({
        parameter_id: template.parameter_id,
        parameter_name: template.parameter_name,
        operator: template.operator,
        value: template.value,
        severity: template.severity,
        unit: template.unit || '',
        description: template.description || '',
        enabled: template.enabled !== false,
        delay_seconds: template.delay_seconds || 0,
        cooldown_seconds: template.cooldown_seconds || 0,
        hysteresis: template.hysteresis || 0,
        source_type: template.source_type || (template.is_global ? 'global_rule' : 'template')
      });
      setSelectedTemplateKey('');
      setError('');
    } catch (linkError) {
      console.error('Error linking existing parameter:', linkError);
      setError(linkError.response?.data?.error || 'Erro ao vincular parâmetro existente');
    }
  };

  const resetParameterEditor = () => {
    setNewParameter({ ...emptyNewParameter });
    setEditingParameterKey('');
  };

  const handleStartEditParameter = (param) => {
    const key = param.id || param.temp_id;
    if (!key) return;
    const def = parameterDefinitions.find((p) => p.value === param.parameter_id);
    setEditingParameterKey(key);
    setNewParameter({
      parameter_id: param.parameter_id || '',
      operator: param.operator || '>',
      value: `${param.value ?? ''}`,
      severity: param.severity || 'medium',
      unit: param.unit || def?.unit || '',
      description: param.description || '',
      enabled: param.enabled !== false,
      delay_seconds: `${param.delay_seconds || 0}`,
      cooldown_seconds: `${param.cooldown_seconds || 0}`,
      hysteresis: `${param.hysteresis || 0}`
    });
  };

  const handleCreateSpecificParameter = async () => {
    setError('');
    if (!newParameter.parameter_id || newParameter.value === '') {
      setError('Preencha os campos do novo parâmetro');
      return;
    }

    try {
      const value = Number(newParameter.value);
      if (Number.isNaN(value)) {
        throw new Error('Valor do parâmetro inválido');
      }

      const def = parameterDefinitions.find((p) => p.value === newParameter.parameter_id);
      const customParam = normalizeParameter({
        parameter_id: newParameter.parameter_id,
        parameter_name: def?.label || newParameter.parameter_id,
        operator: newParameter.operator,
        value,
        severity: newParameter.severity,
        unit: newParameter.unit || def?.unit || '',
        description: newParameter.description,
        enabled: newParameter.enabled !== false,
        delay_seconds: Number(newParameter.delay_seconds || 0),
        cooldown_seconds: Number(newParameter.cooldown_seconds || 0),
        hysteresis: Number(newParameter.hysteresis || 0),
        source_type: 'specific'
      });

      if (editingParameterKey) {
        if (existsParameter(customParam, editingParameterKey)) {
          setError('Já existe um parâmetro com esta configuração');
          return;
        }

        const editingParam = allParameters.find((item) => item.id === editingParameterKey || item.temp_id === editingParameterKey);
        if (!editingParam) {
          setError('Parâmetro em edição não encontrado');
          return;
        }

        if (editingParam._pending) {
          setPendingParameters((prev) =>
            prev.map((item) => (item.temp_id === editingParam.temp_id ? { ...customParam, temp_id: item.temp_id } : item))
          );
          await fetchParameterCatalog();
        } else if (id && editingParam.id) {
          await api.put(`/inverters/${id}/parameters/${editingParam.id}`, toPayloadParameter(customParam));
          await fetchInverterParameters();
          await fetchParameterCatalog();
        }
      } else {
        await attachParameter(customParam);
      }

      resetParameterEditor();
      setError('');
    } catch (createError) {
      console.error('Error creating specific parameter:', createError);
      setError(createError.response?.data?.error || createError.message || 'Erro ao criar parâmetro específico');
    }
  };

  const handleRemoveParameter = async (param) => {
    setError('');
    if (editingParameterKey && (param.id === editingParameterKey || param.temp_id === editingParameterKey)) {
      resetParameterEditor();
    }
    if (param._pending) {
      setPendingParameters((prev) => prev.filter((item) => item.temp_id !== param.temp_id));
      return;
    }
    if (!id || !param.id) return;

    if (!window.confirm('Deseja realmente remover este parâmetro?')) return;
    try {
      await api.delete(`/inverters/${id}/parameters/${param.id}`);
      await fetchInverterParameters();
      await fetchParameterCatalog();
    } catch (removeError) {
      console.error('Error removing parameter:', removeError);
      setError(removeError.response?.data?.error || 'Erro ao remover parâmetro');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.marca || !formData.modelo || !formData.potencia_nominal) {
      setError('Preencha os campos obrigatórios');
      return;
    }
    if (!info.fornecedor_id) {
      setError('Selecione o fornecedor');
      return;
    }

    setLoading(true);
    try {
      const cleanedInfo = { ...info };
      numericKeys.forEach((key) => {
        if (cleanedInfo[key] === '' || cleanedInfo[key] === null || cleanedInfo[key] === undefined) return;
        const parsed = Number(cleanedInfo[key]);
        cleanedInfo[key] = Number.isNaN(parsed) ? '' : parsed;
      });

      const payload = {
        ...formData,
        fases: formData.tipo === 'Microinversor' ? 'Monofásica' : formData.fases,
        nomenclature_config: {
          ...formData.nomenclature_config,
          additional_info: cleanedInfo
        }
      };

      let inverterId = id;
      if (id) {
        await api.put(`/inverters/${id}`, payload);
      } else {
        const response = await api.post('/inverters', payload);
        inverterId = response?.data?.id;
      }

      if (!inverterId) {
        throw new Error('Não foi possível identificar o inversor salvo');
      }

      if (pendingParameters.length > 0) {
        for (const param of pendingParameters) {
          await api.post(`/inverters/${inverterId}/parameters`, toPayloadParameter(param));
        }
      }

      navigate('/inverters');
    } catch (submitError) {
      console.error('Error saving inverter:', submitError);
      setError(submitError.response?.data?.error || submitError.message || 'Erro ao salvar inversor');
    } finally {
      setLoading(false);
    }
  };

  const previewName = useMemo(() => {
    const c = formData.nomenclature_config || {};
    const parts = [];
    if (c.showTipo) parts.push(formData.tipo === 'Microinversor' ? 'Micro Inversor' : 'Inversor');
    if (c.showPotencia && formData.potencia_nominal) parts.push(`${formData.potencia_nominal}kW`);
    if (c.showFases) parts.push(formData.fases);
    if (c.showTensao) parts.push(formData.tensao);
    if (c.showMarca && formData.marca) parts.push(formData.marca);
    if (c.showAfci && formData.afci_integrado) parts.push('AFCI Integrado');
    if (c.showRsd && info.rsd_rapid_shutdown) parts.push('RSD Integrado');
    return parts.join(' ').trim() || 'Nome do Produto';
  }, [formData, info.rsd_rapid_shutdown]);

  const tabs = ['Dados Comerciais', 'Especificações Técnicas', 'Nomenclatura', 'Parâmetros'];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/inverters')} className="mb-3 inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <h1 className="text-3xl font-bold text-slate-900">{id ? 'Editar Inversor' : 'Cadastro de Inversor'}</h1>
          </div>
          <button onClick={() => navigate('/inverters')} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Cancelar
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap gap-2">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(index)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === index ? 'border border-slate-200 bg-white text-slate-900 shadow-sm' : 'bg-slate-200 text-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              {activeTab === 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-slate-900">Informações Comerciais</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <select value={info.fornecedor_id} onChange={(e) => setInfoField('fornecedor_id', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
                      <option value="">Fornecedor *</option>
                      {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                    <select value={formData.tipo} onChange={(e) => setFormData((prev) => ({ ...prev, tipo: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2">
                      <option value="String">String</option>
                      <option value="Microinversor">Micro Inversor</option>
                    </select>
                    <select value={formData.fases} onChange={(e) => setFormData((prev) => ({ ...prev, fases: e.target.value }))} disabled={formData.tipo === 'Microinversor'} className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100">
                      <option value="Monofásica">Monofásica</option>
                      {formData.tipo !== 'Microinversor' && <option value="Trifásica">Trifásica</option>}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <select value={formData.tensao} onChange={(e) => setFormData((prev) => ({ ...prev, tensao: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2">
                      {tensaoOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={formData.marca} onChange={(e) => setFormData((prev) => ({ ...prev, marca: e.target.value }))} placeholder="Marca *" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input value={formData.modelo} onChange={(e) => setFormData((prev) => ({ ...prev, modelo: e.target.value }))} placeholder="Modelo/Linha/Série *" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" step="0.01" value={formData.potencia_nominal} onChange={(e) => setFormData((prev) => ({ ...prev, potencia_nominal: e.target.value }))} placeholder="Potência (kW) *" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.qtd_entrada_mod} onChange={(e) => setInfoField('qtd_entrada_mod', e.target.value)} placeholder="Qtd Entrada de Mód" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.potencia_modulo_aceita_w} onChange={(e) => setInfoField('potencia_modulo_aceita_w', e.target.value)} placeholder="Potência Máx do Mód (W)" className="rounded-lg border border-slate-300 px-3 py-2" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <input type="number" step="0.01" value={info.preco_kit} onChange={(e) => setInfoField('preco_kit', e.target.value)} placeholder="Preço no Kit (R$)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" step="0.01" value={info.preco_avulso} onChange={(e) => setInfoField('preco_avulso', e.target.value)} placeholder="Preço Avulso (R$)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.garantia_anos} onChange={(e) => setInfoField('garantia_anos', e.target.value)} placeholder="Garantia (anos)" className="rounded-lg border border-slate-300 px-3 py-2" />
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <span className="font-medium text-slate-900">AFCI Integrado</span>
                      <input type="checkbox" checked={formData.afci_integrado} onChange={(e) => setFormData((prev) => ({ ...prev, afci_integrado: e.target.checked }))} />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <span className="font-medium text-slate-900">RSD Rapid Shutdown Integrado</span>
                      <input type="checkbox" checked={!!info.rsd_rapid_shutdown} onChange={(e) => setInfoField('rsd_rapid_shutdown', e.target.checked)} />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-slate-900">Especificações Técnicas</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <input type="number" value={info.dc_tensao_max_entrada} onChange={(e) => setInfoField('dc_tensao_max_entrada', e.target.value)} placeholder="Tensão máx entrada (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_faixa_mppt_min} onChange={(e) => setInfoField('dc_faixa_mppt_min', e.target.value)} placeholder="Faixa MPPT mín (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_faixa_mppt_max} onChange={(e) => setInfoField('dc_faixa_mppt_max', e.target.value)} placeholder="Faixa MPPT máx (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_tensao_partida} onChange={(e) => setInfoField('dc_tensao_partida', e.target.value)} placeholder="Tensão de partida (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_tensao_nominal} onChange={(e) => setInfoField('dc_tensao_nominal', e.target.value)} placeholder="Tensão nominal (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_corrente_max_mppt} onChange={(e) => setInfoField('dc_corrente_max_mppt', e.target.value)} placeholder="Corrente máx MPPT (A)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_isc_max_mppt} onChange={(e) => setInfoField('dc_isc_max_mppt', e.target.value)} placeholder="Isc máx MPPT (A)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_num_mppts} onChange={(e) => setInfoField('dc_num_mppts', e.target.value)} placeholder="Número de MPPTs" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.dc_entradas_por_mppt} onChange={(e) => setInfoField('dc_entradas_por_mppt', e.target.value)} placeholder="Entradas por MPPT" className="rounded-lg border border-slate-300 px-3 py-2" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <input type="number" value={info.ac_potencia_nominal} onChange={(e) => setInfoField('ac_potencia_nominal', e.target.value)} placeholder="Potência nominal AC" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.ac_potencia_max} onChange={(e) => setInfoField('ac_potencia_max', e.target.value)} placeholder="Potência máxima AC" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.ac_tensao_nominal} onChange={(e) => setInfoField('ac_tensao_nominal', e.target.value)} placeholder="Tensão nominal AC (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.ac_faixa_tensao_min} onChange={(e) => setInfoField('ac_faixa_tensao_min', e.target.value)} placeholder="Faixa tensão AC mín (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.ac_faixa_tensao_max} onChange={(e) => setInfoField('ac_faixa_tensao_max', e.target.value)} placeholder="Faixa tensão AC máx (V)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.ac_corrente_nominal} onChange={(e) => setInfoField('ac_corrente_nominal', e.target.value)} placeholder="Corrente nominal AC (A)" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input type="number" value={info.ac_eficiencia_max} onChange={(e) => setInfoField('ac_eficiencia_max', e.target.value)} placeholder="Eficiência máxima (%)" className="rounded-lg border border-slate-300 px-3 py-2" />
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-slate-900">Proteções Extras e Nomenclatura</h2>
                  {[
                    { key: 'showMarca', label: 'Mostrar Marca' },
                    { key: 'showAfci', label: 'Mostrar AFCI Integrado' },
                    { key: 'showRsd', label: 'Mostrar Rapid Shutdown Integrado' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <span className="font-medium text-slate-900">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={!!formData.nomenclature_config[item.key]}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nomenclature_config: {
                              ...prev.nomenclature_config,
                              [item.key]: e.target.checked
                            }
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Parâmetros do Inversor</h2>
                    {!id && (
                      <p className="mt-1 text-sm text-slate-600">
                        Você pode adicionar parâmetros agora. Eles serão salvos junto com o cadastro.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 text-lg font-semibold text-slate-900">Vincular parâmetro existente</h3>
                    <input
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Buscar por nome, código ou unidade"
                      className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <select
                        value={selectedTemplateKey}
                        onChange={(e) => setSelectedTemplateKey(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value="">Selecione um parâmetro já cadastrado</option>
                        {filteredCatalog.map((template) => (
                          <option key={template.template_key} value={template.template_key}>
                            {template.is_global ? '[Global] ' : ''}
                            {template.parameter_name} ({template.parameter_id}) {template.operator} {template.value}{template.unit ? ` ${template.unit}` : ''} [{template.severity}] - usado {template.usage_count}x
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLinkExistingParameter}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white"
                      >
                        <Link2 className="h-4 w-4" />
                        Vincular
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 text-lg font-semibold text-slate-900">
                      {editingParameterKey ? 'Editar parâmetro específico' : 'Criar parâmetro específico'}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        value={newParameter.parameter_id}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          const def = parameterDefinitions.find((item) => item.value === nextId);
                          setNewParameter((prev) => ({
                            ...prev,
                            parameter_id: nextId,
                            unit: def?.unit || ''
                          }));
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value="">Parâmetro</option>
                        {parameterDefinitions.map((def) => (
                          <option key={def.value} value={def.value}>
                            {def.label} ({def.value})
                          </option>
                        ))}
                      </select>
                      <select
                        value={newParameter.operator}
                        onChange={(e) => setNewParameter((prev) => ({ ...prev, operator: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value=">">{'>'}</option>
                        <option value="<">{'<'}</option>
                        <option value=">=">{'>='}</option>
                        <option value="<=">{'<='}</option>
                        <option value="==">{'=='}</option>
                        <option value="!=">{'!='}</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={newParameter.value}
                        onChange={(e) => setNewParameter((prev) => ({ ...prev, value: e.target.value }))}
                        placeholder="Valor"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <select
                        value={newParameter.severity}
                        onChange={(e) => setNewParameter((prev) => ({ ...prev, severity: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                      </select>
                      <input
                        value={newParameter.unit}
                        onChange={(e) => setNewParameter((prev) => ({ ...prev, unit: e.target.value }))}
                        placeholder="Unidade (ex.: V, A, kW)"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={newParameter.enabled !== false}
                          onChange={(e) => setNewParameter((prev) => ({ ...prev, enabled: e.target.checked }))}
                        />
                        Regra ativa
                      </label>
                    </div>

                    <textarea
                      value={newParameter.description}
                      onChange={(e) => setNewParameter((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional da regra"
                      className="mt-3 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCreateSpecificParameter}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
                      >
                        {editingParameterKey ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingParameterKey ? 'Atualizar parâmetro' : 'Adicionar parâmetro'}
                      </button>
                      {editingParameterKey && (
                        <button
                          type="button"
                          onClick={resetParameterEditor}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-700"
                        >
                          <X className="h-4 w-4" />
                          Cancelar edição
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 text-lg font-semibold text-slate-900">Parâmetros vinculados</h3>
                    {allParameters.length === 0 ? (
                      <p className="text-sm text-slate-600">Nenhum parâmetro vinculado ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {allParameters.map((param) => (
                          <div key={param.id || param.temp_id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                            <div className="text-sm">
                              <div className="font-medium text-slate-900">
                                {param.parameter_name} ({param.parameter_id})
                              </div>
                              <div className="text-slate-600">
                                {param.operator} {param.value}{param.unit ? ` ${param.unit}` : ''} • Severidade: {param.severity}
                              </div>
                              {!!param.description && (
                                <div className="mt-1 text-xs text-slate-500">{param.description}</div>
                              )}
                              <div className="mt-1 text-xs text-slate-500">
                                {param._pending ? 'Pendente de salvar' : (param.is_global ? 'Global' : 'Específico')} • {param.enabled === false ? 'Inativo' : 'Ativo'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditParameter(param)}
                                className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveParameter(param)}
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex items-center gap-2 text-slate-700">
                <Eye className="h-5 w-5" />
                <h3 className="text-2xl font-semibold text-slate-900">Pré-visualização</h3>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 text-lg font-medium text-slate-900">{previewName}</div>
              <div className="mt-4 space-y-1 text-sm text-slate-700">
                <div>P DC máx: {Number(info.dc_tensao_max_entrada || 0)} V</div>
                <div>Tipo: {formData.tipo === 'Microinversor' ? 'Micro Inversor' : 'Inversor String'}</div>
                <div>{formData.fases} • {formData.tensao}</div>
                <div>Parâmetros: {allParameters.length}</div>
              </div>
              <button onClick={handleSubmit} disabled={loading} className="mt-6 w-full rounded-lg bg-green-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60">
                {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span> : <span className="inline-flex items-center gap-2"><Save className="h-4 w-4" />Salvar Inversor</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
