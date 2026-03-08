-- Add new fields to customers table
ALTER TABLE customers 
ADD COLUMN consumer_unit TEXT,
ADD COLUMN contract_file_url TEXT,
ADD COLUMN document_type TEXT CHECK (document_type IN ('cnh', 'rg', NULL)),
ADD COLUMN document_file_url TEXT,
ADD COLUMN observations TEXT;

-- Create index for consumer unit lookups
CREATE INDEX idx_customers_consumer_unit ON customers(consumer_unit) WHERE consumer_unit IS NOT NULL;
