#!/usr/bin/env python3
"""
AIDA64 Data Client for Supabase
Reads AIDA64 data and sends to Supabase database

Requirements:
- pip install supabase psutil requests
- AIDA64 installed and configured for shared memory or CSV export
- Supabase project with proper tables
"""

import os
import time
import json
import socket
import psutil
import requests
from datetime import datetime
from supabase import create_client, Client

# Configuration
SUPABASE_URL = "https://virbyfqulbxlnpiiwvmx.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"
COMPUTER_NAME = socket.gethostname()
COMPUTER_IP = socket.gethostbyname(socket.gethostname())
POLL_INTERVAL = 5  # seconds

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def register_computer():
    """Register this computer in the database"""
    try:
        # Check if computer already exists
        result = supabase.table('computers').select('*').eq('name', COMPUTER_NAME).execute()
        
        if not result.data:
            # Register new computer
            computer_data = {
                'name': COMPUTER_NAME,
                'ip_address': COMPUTER_IP,
                'status': 'online',
                'last_seen': datetime.now().isoformat()
            }
            supabase.table('computers').insert(computer_data).execute()
            print(f"Registered computer: {COMPUTER_NAME}")
        else:
            # Update existing computer
            supabase.table('computers').update({
                'status': 'online',
                'last_seen': datetime.now().isoformat(),
                'ip_address': COMPUTER_IP
            }).eq('name', COMPUTER_NAME).execute()
            print(f"Updated computer status: {COMPUTER_NAME}")
            
        return result.data[0]['id'] if result.data else supabase.table('computers').select('id').eq('name', COMPUTER_NAME).execute().data[0]['id']
    except Exception as e:
        print(f"Error registering computer: {e}")
        return None

def read_aida64_shared_memory():
    """
    Read AIDA64 data from shared memory
    This is a simplified example - actual implementation depends on AIDA64 setup
    """
    try:
        # This is a mock implementation
        # In real scenario, you'd read from AIDA64 shared memory or CSV export
        
        # Simulate CPU temperature readings
        cpu_temp = 45 + (time.time() % 30)  # Simulate temperature variation
        package_temp = cpu_temp + 2
        
        return {
            'CPU': cpu_temp,
            'CPU Package': package_temp,
            'CPU IA Cores': cpu_temp - 1,
            'CPU GT Cores': cpu_temp - 2
        }
    except Exception as e:
        print(f"Error reading AIDA64 data: {e}")
        return None

def read_aida64_csv(csv_path):
    """Read AIDA64 data from CSV file"""
    try:
        import pandas as pd
        
        # Read the latest CSV file
        df = pd.read_csv(csv_path)
        
        # Get the latest row
        latest_row = df.iloc[-1]
        
        # Extract temperature data
        temp_data = {}
        for col in df.columns:
            if '°C' in str(latest_row[col]) or col in ['CPU', 'CPU Package', 'CPU IA Cores', 'CPU GT Cores']:
                try:
                    temp_value = float(str(latest_row[col]).replace('°C', ''))
                    temp_data[col] = temp_value
                except:
                    continue
                    
        return temp_data
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return None

def send_temperature_data(computer_id, temp_data):
    """Send temperature data to Supabase"""
    try:
        timestamp = datetime.now().isoformat()
        
        readings = []
        for sensor_name, temperature in temp_data.items():
            readings.append({
                'computer_id': computer_id,
                'sensor_name': sensor_name,
                'temperature': round(temperature, 1),
                'timestamp': timestamp
            })
        
        if readings:
            supabase.table('temperature_readings').insert(readings).execute()
            print(f"Sent {len(readings)} temperature readings")
            
    except Exception as e:
        print(f"Error sending temperature data: {e}")

def main():
    """Main monitoring loop"""
    print(f"Starting AIDA64 client for {COMPUTER_NAME}")
    
    # Register computer
    computer_id = register_computer()
    if not computer_id:
        print("Failed to register computer")
        return
    
    print(f"Computer ID: {computer_id}")
    print(f"Polling interval: {POLL_INTERVAL} seconds")
    
    while True:
        try:
            # Read temperature data
            # Option 1: From shared memory (requires AIDA64 configuration)
            temp_data = read_aida64_shared_memory()
            
            # Option 2: From CSV file (uncomment and specify path)
            # temp_data = read_aida64_csv("C:/path/to/aida64/export.csv")
            
            if temp_data:
                send_temperature_data(computer_id, temp_data)
                
                # Update computer last_seen
                supabase.table('computers').update({
                    'last_seen': datetime.now().isoformat(),
                    'status': 'online'
                }).eq('id', computer_id).execute()
            
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            print("\nShutting down...")
            # Mark computer as offline
            supabase.table('computers').update({
                'status': 'offline'
            }).eq('id', computer_id).execute()
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()