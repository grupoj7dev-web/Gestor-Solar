-- Add document columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS contractor_id_file_url TEXT,
ADD COLUMN IF NOT EXISTS holder_id_file_url TEXT,
ADD COLUMN IF NOT EXISTS plant_contract_file_url TEXT,
ADD COLUMN IF NOT EXISTS other_documents JSONB DEFAULT '[]'::jsonb;

-- Comments
COMMENT ON COLUMN customers.contractor_id_file_url IS 'URL of the Contractor Identity/CNH document';
COMMENT ON COLUMN customers.holder_id_file_url IS 'URL of the Installation Holder Identity/CNH document (if different from contractor)';
COMMENT ON COLUMN customers.plant_contract_file_url IS 'URL of the Plant Contract document';
COMMENT ON COLUMN customers.other_documents IS 'JSON array of other attached documents {name, url}';
