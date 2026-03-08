-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee',
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"modules": []}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rows to have default values if they are null
UPDATE employees SET role = 'employee' WHERE role IS NULL;
UPDATE employees SET permissions = '{"modules": []}' WHERE permissions IS NULL;
UPDATE employees SET is_active = true WHERE is_active IS NULL;
