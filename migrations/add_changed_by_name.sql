-- Add a text field to store the user name who made changes
ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS changed_by_name TEXT;
