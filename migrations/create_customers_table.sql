-- Create customers table
CREATE TABLE customers (
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
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_cpf ON customers(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_customers_cnpj ON customers(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_customers_email ON customers(email);
