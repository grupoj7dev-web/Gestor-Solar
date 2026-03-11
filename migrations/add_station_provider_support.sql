-- Add provider support for linked stations across multiple integrations.
ALTER TABLE customer_stations
ADD COLUMN IF NOT EXISTS provider TEXT;

UPDATE customer_stations
SET provider = 'solarman'
WHERE provider IS NULL OR provider = '';

ALTER TABLE customer_stations
ALTER COLUMN provider SET DEFAULT 'solarman';

ALTER TABLE customer_stations
ALTER COLUMN provider SET NOT NULL;

ALTER TABLE customer_stations
DROP CONSTRAINT IF EXISTS unique_customer_station;

ALTER TABLE customer_stations
ADD CONSTRAINT unique_customer_station_per_provider UNIQUE (customer_id, station_id, provider);

CREATE INDEX IF NOT EXISTS idx_customer_stations_provider ON customer_stations(provider);
