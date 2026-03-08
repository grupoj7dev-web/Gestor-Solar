-- Complete Supabase Schema with Customer Tables
-- Run this in Supabase SQL Editor

-- =====================================================
-- CUSTOMERS MODULE
-- =====================================================

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('pf', 'pj')),
    
    -- Common fields
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    cep TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    
    -- Additional contact
    additional_contact_name TEXT,
    additional_contact_phone TEXT,
    additional_contact_email TEXT,
    
    -- PF specific fields
    cpf TEXT,
    rg TEXT,
    full_name TEXT,
    birth_date DATE,
    
    -- PJ specific fields
    cnpj TEXT,
    company_name TEXT,
    trade_name TEXT,
    state_registration TEXT,
    municipal_registration TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT cpf_unique_when_pf UNIQUE NULLS NOT DISTINCT (cpf),
    CONSTRAINT cnpj_unique_when_pj UNIQUE NULLS NOT DISTINCT (cnpj),
    CONSTRAINT pf_required_fields CHECK (
        customer_type != 'pf' OR (cpf IS NOT NULL AND full_name IS NOT NULL)
    ),
    CONSTRAINT pj_required_fields CHECK (
        customer_type != 'pj' OR (cnpj IS NOT NULL AND company_name IS NOT NULL)
    )
);

-- Enable RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Allow public read access to customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to customers" ON customers FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete to customers" ON customers FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_cnpj ON customers(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =====================================================
-- CUSTOMER LINKS TABLES
-- =====================================================

-- Create customer_inverters table (Registered Inverters)
CREATE TABLE IF NOT EXISTS customer_inverters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    inverter_id UUID REFERENCES inverters(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure unique link per customer-inverter pair
    CONSTRAINT unique_customer_inverter UNIQUE (customer_id, inverter_id)
);

-- Enable RLS for customer_inverters
ALTER TABLE customer_inverters ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_inverters
CREATE POLICY "Allow public read access to customer_inverters" ON customer_inverters FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to customer_inverters" ON customer_inverters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to customer_inverters" ON customer_inverters FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete to customer_inverters" ON customer_inverters FOR DELETE USING (true);


-- Create customer_stations table (Solarman Stations)
CREATE TABLE IF NOT EXISTS customer_stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL, -- Solarman Station ID is numeric string
    station_name TEXT, -- Cache for display
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure unique link per customer-station pair
    CONSTRAINT unique_customer_station UNIQUE (customer_id, station_id)
);

-- Enable RLS for customer_stations
ALTER TABLE customer_stations ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_stations
CREATE POLICY "Allow public read access to customer_stations" ON customer_stations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to customer_stations" ON customer_stations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to customer_stations" ON customer_stations FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete to customer_stations" ON customer_stations FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_inverters_customer ON customer_inverters(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_stations_customer ON customer_stations(customer_id);
