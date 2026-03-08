-- Migration: Unify users and employees tables
-- Description: Moves employee data to users table and updates references

-- 1. Add department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Insert missing employees into users table (if they don't exist by email)
-- We'll use a default password hash for migrated employees (e.g., '123456')
-- Note: This is a simplified migration. In production, we might want to handle this differently.
INSERT INTO users (name, email, password_hash, role, permissions, is_active, department, created_at)
SELECT 
    e.name, 
    e.email, 
    '$2b$10$XaRXpLJEL4qBaklijNgjcOR69PxN.6MpqhZwpPo.ibDQQurqWY/2O', -- Default hash for '123456'
    COALESCE(e.role, 'employee'), 
    COALESCE(e.permissions, '{"modules": []}'::jsonb), 
    COALESCE(e.is_active, true),
    e.department,
    e.created_at
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = e.email
);

-- 3. Update existing users with department if they match an employee by email
UPDATE users u
SET department = e.department
FROM employees e
WHERE u.email = e.email
AND u.department IS NULL;

-- 4. Update tickets table foreign keys to reference users(id)

-- First, we need to map old employee IDs to user IDs
-- We'll do this by creating a temporary mapping table based on email
CREATE TEMP TABLE employee_user_map AS
SELECT e.id as employee_id, u.id as user_id
FROM employees e
JOIN users u ON e.email = u.email;

-- Drop existing constraints
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_initial_attendant_id_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_initial_response_by_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_visit_responsible_id_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_closed_by_fkey;

-- Update the columns to point to user_ids
-- Note: This assumes that for every employee ID used in tickets, there is a corresponding user ID now.
-- If data is missing, we might have nulls.

UPDATE tickets t
SET initial_attendant_id = m.user_id
FROM employee_user_map m
WHERE t.initial_attendant_id = m.employee_id;

UPDATE tickets t
SET initial_response_by = m.user_id
FROM employee_user_map m
WHERE t.initial_response_by = m.employee_id;

UPDATE tickets t
SET visit_responsible_id = m.user_id
FROM employee_user_map m
WHERE t.visit_responsible_id = m.employee_id;

UPDATE tickets t
SET closed_by = m.user_id
FROM employee_user_map m
WHERE t.closed_by = m.employee_id;

-- Add new constraints referencing users table
ALTER TABLE tickets ADD CONSTRAINT tickets_initial_attendant_id_fkey 
    FOREIGN KEY (initial_attendant_id) REFERENCES users(id);

ALTER TABLE tickets ADD CONSTRAINT tickets_initial_response_by_fkey 
    FOREIGN KEY (initial_response_by) REFERENCES users(id);

ALTER TABLE tickets ADD CONSTRAINT tickets_visit_responsible_id_fkey 
    FOREIGN KEY (visit_responsible_id) REFERENCES users(id);

ALTER TABLE tickets ADD CONSTRAINT tickets_closed_by_fkey 
    FOREIGN KEY (closed_by) REFERENCES users(id);

-- 5. Update ticket_history table foreign keys

ALTER TABLE ticket_history DROP CONSTRAINT IF EXISTS ticket_history_changed_by_fkey;

UPDATE ticket_history th
SET changed_by = m.user_id
FROM employee_user_map m
WHERE th.changed_by = m.employee_id;

ALTER TABLE ticket_history ADD CONSTRAINT ticket_history_changed_by_fkey 
    FOREIGN KEY (changed_by) REFERENCES users(id);

-- 6. Drop temporary table
DROP TABLE employee_user_map;

-- Optional: Drop employees table if we are fully confident
-- DROP TABLE employees;
