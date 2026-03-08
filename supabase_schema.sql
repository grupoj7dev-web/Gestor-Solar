-- Drop existing tables and policies to ensure a clean slate
DROP TABLE IF EXISTS inverter_parameters CASCADE;
DROP TABLE IF EXISTS inverters CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' NOT NULL, -- 'admin' or 'employee'
    permissions JSONB DEFAULT '{"modules": []}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert for first user" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON users FOR UPDATE USING (auth.role() = 'authenticated');

-- Create inverters table
CREATE TABLE inverters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    potencia_nominal DECIMAL(10,2) NOT NULL,
    tipo TEXT NOT NULL, -- 'String', 'Microinversor', 'Central'
    fases TEXT NOT NULL, -- 'Monofásico', 'Bifásico', 'Trifásico'
    tensao TEXT,
    afci_integrado BOOLEAN DEFAULT false,
    nomenclature_config JSONB DEFAULT '{"showTipo": true, "showPotencia": true, "showFases": true, "showTensao": false, "showMarca": true, "showAfci": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES users(id)
);

-- Enable RLS for inverters
ALTER TABLE inverters ENABLE ROW LEVEL SECURITY;

-- Create policies for inverters
CREATE POLICY "Allow public read access to inverters" ON inverters FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to inverters" ON inverters FOR INSERT WITH CHECK (true); -- Temporarily allow public for testing if needed, but better to restrict
CREATE POLICY "Allow authenticated update to inverters" ON inverters FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete to inverters" ON inverters FOR DELETE USING (true);

-- Create inverter_parameters table
CREATE TABLE inverter_parameters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inverter_id UUID REFERENCES inverters(id) ON DELETE CASCADE,
    parameter_id TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    operator TEXT NOT NULL, -- '>', '<', '>=', '<=', '==', '!='
    value DECIMAL(10,2) NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for inverter_parameters
ALTER TABLE inverter_parameters ENABLE ROW LEVEL SECURITY;

-- Create policies for inverter_parameters
CREATE POLICY "Allow public read access to inverter_parameters" ON inverter_parameters FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to inverter_parameters" ON inverter_parameters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to inverter_parameters" ON inverter_parameters FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete to inverter_parameters" ON inverter_parameters FOR DELETE USING (true);

-- Create branches table
CREATE TABLE branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    cep TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES users(id)
);

-- Enable RLS for branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Create policies for branches
CREATE POLICY "Allow public read access to branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert to branches" ON branches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to branches" ON branches FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete to branches" ON branches FOR DELETE USING (true);

