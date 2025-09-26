-- ===================================================
-- INIT SCRIPT - Ensures DB exists before running schema
-- ===================================================

-- Create the database if it does not already exist
DO
$$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_database WHERE datname = 'deliverydb'
   ) THEN
      PERFORM dblink_exec('dbname=' || current_database(),
                          'CREATE DATABASE deliverydb');
   END IF;
END
$$ LANGUAGE plpgsql;

-- Connect to deliverydb
\c deliverydb