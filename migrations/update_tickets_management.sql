-- Migration: Add ticket management fields
-- Description: Adds fields for initial response, status management, visit scheduling, and closure

-- Add initial response fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS initial_response TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS initial_response_by UUID REFERENCES employees(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS initial_response_at TIMESTAMP WITH TIME ZONE;

-- Add visit scheduling fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS visit_scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS visit_responsible_id UUID REFERENCES employees(id);

-- Add concessionaria substatus
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS concessionaria_substatus TEXT 
  CHECK (concessionaria_substatus IN ('awaiting_first', 'registered'));

-- Add execution deadline
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS execution_deadline TIMESTAMP WITH TIME ZONE;

-- Add closing fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closing_response TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closing_status TEXT 
  CHECK (closing_status IN ('attended', 'not_attended'));
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendant_rating INTEGER CHECK (attendant_rating BETWEEN 1 AND 5);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES employees(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Update status constraint to include new statuses
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('open', 'in_opening', 'in_execution', 'visit_scheduled', 
                    'concessionaria', 'delayed', 'warranty', 'closed'));

-- Create ticket history table
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    comment TEXT,
    changed_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_execution_deadline ON tickets(execution_deadline);

-- Enable RLS for ticket_history
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read for authenticated users" ON ticket_history;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ticket_history;

-- RLS Policies for ticket_history
CREATE POLICY "Enable read for authenticated users" ON ticket_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON ticket_history
    FOR INSERT TO authenticated WITH CHECK (true);
