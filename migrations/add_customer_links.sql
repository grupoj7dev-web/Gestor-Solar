-- Create customer_inverters table (Registered Inverters)
CREATE TABLE customer_inverters (
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
CREATE TABLE customer_stations (
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
CREATE INDEX idx_customer_inverters_customer ON customer_inverters(customer_id);
CREATE INDEX idx_customer_stations_customer ON customer_stations(customer_id);
