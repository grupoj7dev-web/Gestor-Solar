ALTER TABLE customers
ADD COLUMN IF NOT EXISTS has_different_holder BOOLEAN DEFAULT false;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_type TEXT CHECK (holder_type IN ('pf', 'pj'));

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_name TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_document TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_rg TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_state_registration TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_email TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_phone TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_zip TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_address TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_number TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_complement TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_neighborhood TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_city TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_state TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_relationship TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS holder_relationship_other TEXT;
