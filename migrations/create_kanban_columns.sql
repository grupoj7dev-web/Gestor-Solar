-- Create kanban_columns table
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    status_key TEXT NOT NULL UNIQUE, -- The value stored in tickets.status
    color TEXT NOT NULL, -- CSS class or hex
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read for authenticated users" ON kanban_columns
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON kanban_columns
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON kanban_columns
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON kanban_columns
    FOR DELETE TO authenticated USING (true);

-- Insert default columns
INSERT INTO kanban_columns (title, status_key, color, order_index) VALUES
('Em Abertura', 'open', 'bg-yellow-50 border-yellow-200', 0),
('Em Execução', 'in_execution', 'bg-blue-50 border-blue-200', 1),
('Visita Agendada', 'visit_scheduled', 'bg-indigo-50 border-indigo-200', 2),
('Concessionária', 'concessionaria', 'bg-purple-50 border-purple-200', 3),
('Garantia', 'warranty', 'bg-orange-50 border-orange-200', 4),
('Encerrado', 'closed', 'bg-green-50 border-green-200', 5)
ON CONFLICT (status_key) DO NOTHING;

-- Drop the strict status check constraint from tickets table
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Add a more flexible check or just remove it to allow dynamic statuses
-- We will rely on the application logic and kanban_columns table to validate statuses
