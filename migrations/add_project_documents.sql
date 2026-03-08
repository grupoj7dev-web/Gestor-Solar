-- Add project document columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS proxy_file_url TEXT,
ADD COLUMN IF NOT EXISTS art_file_url TEXT,
ADD COLUMN IF NOT EXISTS module_inmetro_file_url TEXT,
ADD COLUMN IF NOT EXISTS inverter_datasheet_file_url TEXT,
ADD COLUMN IF NOT EXISTS module_datasheet_file_url TEXT,
ADD COLUMN IF NOT EXISTS generator_registration_file_url TEXT,
ADD COLUMN IF NOT EXISTS diagram_file_url TEXT,
ADD COLUMN IF NOT EXISTS memorial_file_url TEXT,
ADD COLUMN IF NOT EXISTS access_request_file_url TEXT,
ADD COLUMN IF NOT EXISTS other_project_documents JSONB DEFAULT '[]'::jsonb;

-- Comments
COMMENT ON COLUMN customers.proxy_file_url IS 'URL of the Proxy/Procuração document';
COMMENT ON COLUMN customers.art_file_url IS 'URL of the ART document';
COMMENT ON COLUMN customers.module_inmetro_file_url IS 'URL of the Module INMETRO certificate';
COMMENT ON COLUMN customers.inverter_datasheet_file_url IS 'URL of the Inverter Datasheet';
COMMENT ON COLUMN customers.module_datasheet_file_url IS 'URL of the Module Datasheet';
COMMENT ON COLUMN customers.generator_registration_file_url IS 'URL of the Generator Registration Data';
COMMENT ON COLUMN customers.diagram_file_url IS 'URL of the Unifilar Diagram/Project';
COMMENT ON COLUMN customers.memorial_file_url IS 'URL of the Descriptive Memorial';
COMMENT ON COLUMN customers.access_request_file_url IS 'URL of the Access Request Form';
COMMENT ON COLUMN customers.other_project_documents IS 'JSON array of other project-related documents {name, url}';
