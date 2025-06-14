# Multi-PC CPU Temperature Monitoring Setup

## Overview
This system allows you to monitor CPU temperatures from multiple PCs/laptops using AIDA64 and Supabase as a central database.

## Architecture
1. **Each PC/Laptop**: Runs AIDA64 + Python client script
2. **Central Database**: Supabase stores all temperature data
3. **Web Dashboard**: Displays data from all connected PCs

## Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the commands in `scripts/setup-supabase.sql`
3. Get your project URL and anon key from Settings > API
4. Create `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 2. Client PC Setup (Repeat for each PC)

#### Install AIDA64
1. Download and install AIDA64 Business/Engineer
2. Configure AIDA64 for data export:
   - Go to Preferences > Logging
   - Enable "Log to CSV file"
   - Set export path (e.g., `C:\AIDA64\export.csv`)
   - Set update interval to 5 seconds

#### Install Python Client
1. Install Python 3.8+ on each PC
2. Install required packages:
   ```bash
   pip install supabase psutil requests pandas
   ```
3. Copy `scripts/aida64-client.py` to each PC
4. Edit the script configuration:
   ```python
   SUPABASE_URL = "your_supabase_url"
   SUPABASE_KEY = "your_supabase_anon_key"
   ```
5. Run the client:
   ```bash
   python aida64-client.py
   ```

#### Setup as Windows Service (Optional)
To run the client automatically on startup:
1. Install `pywin32`: `pip install pywin32`
2. Use `nssm` (Non-Sucking Service Manager) to create a Windows service
3. Or use Task Scheduler to run the script on startup

### 3. Web Dashboard
1. The web dashboard will automatically show all connected PCs
2. Use "Add PC" button to manually register PCs if needed
3. Real-time updates via Supabase subscriptions

## Features

### Web Dashboard
- **Real-time monitoring** of all connected PCs
- **Status indicators** (online/offline)
- **Temperature alerts** (Normal/Warning/Critical)
- **Historical data** tracking
- **Add/Remove PCs** management

### Client Script
- **Automatic registration** of PCs in database
- **Real-time data sending** every 5 seconds
- **Error handling** and reconnection
- **Status updates** (online/offline)

## Data Flow
1. AIDA64 exports temperature data to CSV
2. Python client reads CSV and sends to Supabase
3. Web dashboard receives real-time updates
4. All PCs visible in single dashboard

## Troubleshooting

### PC Not Showing Online
- Check if Python client is running
- Verify Supabase credentials
- Check network connectivity
- Look at client script console for errors

### No Temperature Data
- Ensure AIDA64 is running and exporting CSV
- Check CSV file path in client script
- Verify AIDA64 sensors are working

### Connection Issues
- Check firewall settings
- Verify Supabase project is active
- Test internet connectivity

## Security Notes
- Current setup uses public access for simplicity
- For production, implement proper RLS policies
- Consider using service role key for client scripts
- Add authentication for web dashboard

## Customization
- Modify `aida64-client.py` for different sensors
- Adjust polling intervals as needed
- Add email alerts for critical temperatures
- Implement data retention policies