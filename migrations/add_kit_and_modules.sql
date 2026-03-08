-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    power TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Add kit_details to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS kit_details JSONB DEFAULT '{}'::jsonb;

-- Comments
COMMENT ON COLUMN customers.kit_details IS 'JSON object containing inverter and module selection details';

-- Seed initial module data
INSERT INTO modules (brand, model, power) VALUES
('Canadian Solar', 'CS3W-450MS', '450W'),
('Canadian Solar', 'CS3W-550MS', '550W'),
('Jinko Solar', 'Tiger Neo 54HL4', '470W'),
('Jinko Solar', 'Tiger Neo 72HL4', '570W'),
('Trina Solar', 'Vertex S', '420W'),
('Trina Solar', 'Vertex S+', '500W'),
('Longi', 'Hi-MO 5', '540W'),
('Longi', 'Hi-MO 6', '580W');
