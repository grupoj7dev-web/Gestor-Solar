-- Tabela de configuração de chamados automáticos (opcional por enquanto, mas bom para futuro)
CREATE TABLE IF NOT EXISTS auto_ticket_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  alert_types TEXT[], -- Tipos de alerta habilitados (null = todos)
  min_priority TEXT DEFAULT 'medium', -- low, medium, high
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- Tabela para mapear alertas processados e evitar duplicação
CREATE TABLE IF NOT EXISTS alert_ticket_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT NOT NULL, -- ID do alerta vindo da Solarman
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  inverter_id UUID REFERENCES inverters(id),
  customer_id UUID REFERENCES customers(id),
  alert_type TEXT,
  alert_time TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alert_id)
);

-- Adicionar índice para busca rápida de alertas processados
CREATE INDEX IF NOT EXISTS idx_alert_ticket_mapping_alert_id ON alert_ticket_mapping(alert_id);
