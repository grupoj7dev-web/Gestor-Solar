# Instruções para Executar a Migration de Faturas

## Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

## Passo 2: Executar o SQL

Copie e cole o conteúdo do arquivo `migrations/create_invoices_table.sql` no editor SQL e clique em **Run**.

Ou execute diretamente este SQL:

```sql
-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reference_month INTEGER NOT NULL CHECK (reference_month >= 1 AND reference_month <= 12),
    reference_year INTEGER NOT NULL CHECK (reference_year >= 2000),
    
    -- Leituras do medidor
    reading_previous DECIMAL(10, 2),
    reading_current DECIMAL(10, 2),
    
    -- Consumo e Armazenamento (kWh)
    consumption_kwh DECIMAL(10, 2) NOT NULL,
    storage_kwh DECIMAL(10, 2) DEFAULT 0,
    
    -- Valores financeiros
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    
    -- Anexos
    pdf_url TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para evitar duplicatas
    UNIQUE(customer_id, reference_month, reference_year)
);

-- Index para buscas rápidas
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_reference ON invoices(reference_year, reference_month);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();
```

## Passo 3: Verificar

Execute este comando para verificar se a tabela foi criada:

```sql
SELECT * FROM invoices LIMIT 1;
```

## Pronto!

Agora você pode acessar a página de **Histórico de Faturas** no dashboard do cliente e começar a cadastrar faturas! 🎉
