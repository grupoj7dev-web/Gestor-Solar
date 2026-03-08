CREATE USER apisolarman WITH PASSWORD 'SolarmanSecurePass123!';
CREATE DATABASE apisolarman OWNER apisolarman;
ALTER USER apisolarman CREATEDB;
\c apisolarman
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
