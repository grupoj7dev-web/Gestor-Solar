-- Fix: Make initial_response_by nullable to allow saving without employee reference
ALTER TABLE tickets ALTER COLUMN initial_response_by DROP NOT NULL;
