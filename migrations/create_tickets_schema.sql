-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    department TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket_reasons table
CREATE TABLE IF NOT EXISTS ticket_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    ai_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    
    -- Customer info
    customer_id UUID REFERENCES customers(id),
    non_customer_name TEXT,
    non_customer_phone TEXT,
    
    -- UC info
    uc_number TEXT,
    
    -- Origin and attendant
    origin TEXT NOT NULL CHECK (origin IN ('alert', 'ai_agent', 'call', 'whatsapp', 'in_person')),
    initial_attendant_id UUID REFERENCES employees(id),
    
    -- Ticket details
    reason_id UUID REFERENCES ticket_reasons(id),
    description TEXT NOT NULL,
    
    -- Status fields
    generation_status TEXT CHECK (generation_status IN ('normal', 'partial', 'none', 'unknown')),
    emotional_status TEXT CHECK (emotional_status IN ('tranquil', 'normal', 'attentive', 'critical')),
    
    -- Time expectations
    expected_response_time TEXT,
    expected_execution_time TEXT,
    
    -- Priority and status
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Enable read for authenticated users" ON employees
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON employees
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON employees
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON employees
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for ticket_reasons
CREATE POLICY "Enable read for authenticated users" ON ticket_reasons
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON ticket_reasons
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON ticket_reasons
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON ticket_reasons
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for tickets
CREATE POLICY "Enable read for authenticated users" ON tickets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON tickets
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON tickets
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON tickets
    FOR DELETE TO authenticated USING (true);

-- RLS Policies for ticket_attachments
CREATE POLICY "Enable read for authenticated users" ON ticket_attachments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON ticket_attachments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON ticket_attachments
    FOR DELETE TO authenticated USING (true);
