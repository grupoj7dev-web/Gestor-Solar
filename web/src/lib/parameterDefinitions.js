import { Activity, Battery, Gauge, Sun, Thermometer, Zap } from 'lucide-react';

export const parameterDefinitions = [
  // AC Output
  { value: 'APo_t1', label: 'Potencia ativa total', unit: 'W', icon: Zap, category: 'AC Output' },
  { value: 'AreactP_t1', label: 'Potencia reativa total', unit: 'var', icon: Zap, category: 'AC Output' },
  { value: 'APF_t1', label: 'Fator de potencia', unit: '', icon: Activity, category: 'AC Output' },
  { value: 'A_Fo1', label: 'Frequencia de saida', unit: 'Hz', icon: Activity, category: 'AC Output' },
  { value: 'AV1', label: 'Tensao AC fase R/A', unit: 'V', icon: Activity, category: 'AC Output' },
  { value: 'AV2', label: 'Tensao AC fase S/B', unit: 'V', icon: Activity, category: 'AC Output' },
  { value: 'AV3', label: 'Tensao AC fase T/C', unit: 'V', icon: Activity, category: 'AC Output' },
  { value: 'AC1', label: 'Corrente AC fase R/A', unit: 'A', icon: Activity, category: 'AC Output' },
  { value: 'AC2', label: 'Corrente AC fase S/B', unit: 'A', icon: Activity, category: 'AC Output' },
  { value: 'AC3', label: 'Corrente AC fase T/C', unit: 'A', icon: Activity, category: 'AC Output' },
  { value: 'L_V_AB', label: 'Tensao de linha AB', unit: 'V', icon: Activity, category: 'AC Output' },
  { value: 'L_V_BC', label: 'Tensao de linha BC', unit: 'V', icon: Activity, category: 'AC Output' },
  { value: 'L_V_AC', label: 'Tensao de linha AC', unit: 'V', icon: Activity, category: 'AC Output' },

  // DC Input
  { value: 'DP1', label: 'Potencia DC MPPT 1', unit: 'W', icon: Sun, category: 'DC Input' },
  { value: 'DP2', label: 'Potencia DC MPPT 2', unit: 'W', icon: Sun, category: 'DC Input' },
  { value: 'DP3', label: 'Potencia DC MPPT 3', unit: 'W', icon: Sun, category: 'DC Input' },
  { value: 'DP4', label: 'Potencia DC MPPT 4', unit: 'W', icon: Sun, category: 'DC Input' },
  { value: 'DP5', label: 'Potencia DC MPPT 5', unit: 'W', icon: Sun, category: 'DC Input' },
  { value: 'DP6', label: 'Potencia DC MPPT 6', unit: 'W', icon: Sun, category: 'DC Input' },
  { value: 'DV1', label: 'Tensao DC MPPT 1', unit: 'V', icon: Battery, category: 'DC Input' },
  { value: 'DV2', label: 'Tensao DC MPPT 2', unit: 'V', icon: Battery, category: 'DC Input' },
  { value: 'DV3', label: 'Tensao DC MPPT 3', unit: 'V', icon: Battery, category: 'DC Input' },
  { value: 'DV4', label: 'Tensao DC MPPT 4', unit: 'V', icon: Battery, category: 'DC Input' },
  { value: 'DV5', label: 'Tensao DC MPPT 5', unit: 'V', icon: Battery, category: 'DC Input' },
  { value: 'DV6', label: 'Tensao DC MPPT 6', unit: 'V', icon: Battery, category: 'DC Input' },
  { value: 'DC1', label: 'Corrente DC MPPT 1', unit: 'A', icon: Battery, category: 'DC Input' },
  { value: 'DC2', label: 'Corrente DC MPPT 2', unit: 'A', icon: Battery, category: 'DC Input' },
  { value: 'DC3', label: 'Corrente DC MPPT 3', unit: 'A', icon: Battery, category: 'DC Input' },
  { value: 'DC4', label: 'Corrente DC MPPT 4', unit: 'A', icon: Battery, category: 'DC Input' },
  { value: 'DC5', label: 'Corrente DC MPPT 5', unit: 'A', icon: Battery, category: 'DC Input' },
  { value: 'DC6', label: 'Corrente DC MPPT 6', unit: 'A', icon: Battery, category: 'DC Input' },

  // Production and energy
  { value: 'Etdy_ge1', label: 'Geracao diaria', unit: 'kWh', icon: Zap, category: 'Production' },
  { value: 'Et_mon', label: 'Geracao mensal', unit: 'kWh', icon: Zap, category: 'Production' },
  { value: 'Et_ye', label: 'Geracao anual', unit: 'kWh', icon: Zap, category: 'Production' },
  { value: 'Et_ge0', label: 'Geracao total acumulada', unit: 'kWh', icon: Zap, category: 'Production' },
  { value: 'PG_Pt1', label: 'Potencia total da rede', unit: 'W', icon: Gauge, category: 'Grid' },
  { value: 'PG_Qt1', label: 'Potencia reativa da rede', unit: 'var', icon: Gauge, category: 'Grid' },

  // Temperature and thermal
  { value: 'IGBT_T1', label: 'Temperatura dissipador', unit: 'C', icon: Thermometer, category: 'Temperature' },
  { value: 'T_AC_RDT1', label: 'Temperatura DC-DC', unit: 'C', icon: Thermometer, category: 'Temperature' },
  { value: 'T_IDT1', label: 'Temperatura indutor 1', unit: 'C', icon: Thermometer, category: 'Temperature' },
  { value: 'T_IDT2', label: 'Temperatura indutor 2', unit: 'C', icon: Thermometer, category: 'Temperature' },
  { value: 'ENV_T0', label: 'Temperatura ambiente', unit: 'C', icon: Thermometer, category: 'Temperature' },

  // Hybrid / battery
  { value: 'Bat_V', label: 'Tensao da bateria', unit: 'V', icon: Battery, category: 'Battery' },
  { value: 'Bat_I', label: 'Corrente da bateria', unit: 'A', icon: Battery, category: 'Battery' },
  { value: 'Bat_P', label: 'Potencia da bateria', unit: 'W', icon: Battery, category: 'Battery' },
  { value: 'Bat_SOC', label: 'Estado de carga da bateria', unit: '%', icon: Battery, category: 'Battery' },

  // Status / diagnostics
  { value: 'RunState', label: 'Estado de operacao', unit: '', icon: Activity, category: 'Diagnostics' },
  { value: 'AlarmCode', label: 'Codigo de alarme', unit: '', icon: Activity, category: 'Diagnostics' },
  { value: 'WarningCode', label: 'Codigo de aviso', unit: '', icon: Activity, category: 'Diagnostics' },
  { value: 'Riso', label: 'Resistencia de isolamento', unit: 'kOhm', icon: Activity, category: 'Diagnostics' },
  { value: 'Eta_t1', label: 'Eficiencia instantanea', unit: '%', icon: Activity, category: 'Diagnostics' }
];
