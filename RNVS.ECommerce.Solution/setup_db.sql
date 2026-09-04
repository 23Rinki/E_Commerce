-- Create database if it doesn't exist
SELECT 'CREATE DATABASE "RNVSECommerce"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'RNVSECommerce')\gexec

-- Connect to the database
\c RNVSECommerce

-- Verify connection
SELECT current_database();
