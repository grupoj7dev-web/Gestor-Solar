-- Create customer_units table
CREATE TABLE customer_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing units
INSERT INTO customer_units (customer_id, unit_number, is_primary)
SELECT id, consumer_unit, true FROM customers WHERE consumer_unit IS NOT NULL;

-- Remove old column from customers
ALTER TABLE customers DROP COLUMN consumer_unit;
