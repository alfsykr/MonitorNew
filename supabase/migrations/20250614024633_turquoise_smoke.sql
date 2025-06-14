-- Supabase Database Setup for Multi-PC CPU Monitoring
-- Run these commands in your Supabase SQL editor

-- Create computers table
CREATE TABLE IF NOT EXISTS computers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    ip_address TEXT NOT NULL,
    status TEXT CHECK (status IN ('online', 'offline')) DEFAULT 'offline',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create temperature_readings table
CREATE TABLE IF NOT EXISTS temperature_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    computer_id UUID REFERENCES computers(id) ON DELETE CASCADE,
    sensor_name TEXT NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_temperature_readings_computer_id ON temperature_readings(computer_id);
CREATE INDEX IF NOT EXISTS idx_temperature_readings_timestamp ON temperature_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_temperature_readings_sensor_name ON temperature_readings(sensor_name);
CREATE INDEX IF NOT EXISTS idx_computers_status ON computers(status);

-- Enable Row Level Security
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_readings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on computers" ON computers
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on computers" ON computers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on computers" ON computers
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on computers" ON computers
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access on temperature_readings" ON temperature_readings
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on temperature_readings" ON temperature_readings
    FOR INSERT WITH CHECK (true);

-- Create function to clean old temperature readings (optional)
CREATE OR REPLACE FUNCTION cleanup_old_temperature_readings()
RETURNS void AS $$
BEGIN
    DELETE FROM temperature_readings 
    WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (optional)
-- This requires the pg_cron extension
-- SELECT cron.schedule('cleanup-temp-readings', '0 2 * * *', 'SELECT cleanup_old_temperature_readings();');