-- Add new columns to customer_units
ALTER TABLE customer_units 
ADD COLUMN IF NOT EXISTS unit_type TEXT CHECK (unit_type IN ('geradora', 'beneficiaria')),
ADD COLUMN IF NOT EXISTS generation_kwh_month NUMERIC,
ADD COLUMN IF NOT EXISTS plant_power_kwp NUMERIC,
ADD COLUMN IF NOT EXISTS expected_rateio_kwh_month NUMERIC,
ADD COLUMN IF NOT EXISTS bill_file_url TEXT;

-- Comment on columns
COMMENT ON COLUMN customer_units.unit_type IS 'Type of the consumer unit: geradora or beneficiaria';
COMMENT ON COLUMN customer_units.generation_kwh_month IS 'Expected generation (kWh/month) for Generating units';
COMMENT ON COLUMN customer_units.plant_power_kwp IS 'Plant power (kWp) for Generating units';
COMMENT ON COLUMN customer_units.expected_rateio_kwh_month IS 'Expected apportionment (kWh/month) for Beneficiary units';
COMMENT ON COLUMN customer_units.bill_file_url IS 'URL of the attached invoice file';
