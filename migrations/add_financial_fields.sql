-- Add financial columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS sale_total_value NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS financial_conditions JSONB DEFAULT '[]'::jsonb;

-- Comments
COMMENT ON COLUMN customers.sale_total_value IS 'Total value of the sale (Valor Total da Venda)';
COMMENT ON COLUMN customers.financial_conditions IS 'JSON array of payment conditions and installments';
