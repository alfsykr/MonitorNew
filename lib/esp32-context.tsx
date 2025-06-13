"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SHT20Data {
  temperature: number;
  humidity: number;
  timestamp: Date;
  status: 'connected' | 'disconnected' | 'error';
}

interface ESP32Config {
  host: string;
  port: number;
  endpoint: string;
  pollInterval: number;
}

interface ESP32ContextType {
  sht20Data: SHT20Data;
  config: ESP32Config;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  historicalData: SHT20Data[];
  connect: () => Promise<void>;
  disconnect: () => void;
  updateConfig: (newConfig: Partial<ESP32Config>) => void;
  clearError: () => void;
}

const ESP32Context = createContext<ESP32ContextType | undefined>(undefined);

const defaultConfig: ESP32Config = {
  host: '192.168.1.100', // ESP32 IP address
  port: 80,              // ESP32 web server port
  endpoint: '/data',     // API endpoint
  pollInterval: 5000     // Poll every 5 seconds
};

export function ESP32Provider({ children }: { children: ReactNode }) {
  const [sht20Data, setSht20Data] = useState<SHT20Data>({
    temperature: 24.5,
    humidity: 48.2,
    timestamp: new Date(),
    status: 'disconnected'
  });
  
  const [config, setConfig] = useState<ESP32Config>(defaultConfig);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<SHT20Data[]>([]);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('esp32-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('esp32-config', JSON.stringify(config));
  }, [config]);

  // Function to fetch data from ESP32
  const fetchESP32Data = async (): Promise<{ temperature: number; humidity: number }> => {
    const url = `http://${config.host}:${config.port}${config.endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate response data
    if (typeof data.temperature !== 'number' || typeof data.humidity !== 'number') {
      throw new Error('Invalid data format from ESP32');
    }

    return {
      temperature: Math.round(data.temperature * 10) / 10,
      humidity: Math.round(data.humidity * 10) / 10
    };
  };

  const connect = async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Test connection
      await fetchESP32Data();
      
      setIsConnected(true);
      setSht20Data(prev => ({ ...prev, status: 'connected' }));
      
      // Start polling
      const interval = setInterval(async () => {
        try {
          const data = await fetchESP32Data();
          const newReading: SHT20Data = {
            temperature: data.temperature,
            humidity: data.humidity,
            timestamp: new Date(),
            status: 'connected'
          };
          
          setSht20Data(newReading);
          
          // Add to historical data (keep last 100 readings)
          setHistoricalData(prev => {
            const updated = [...prev, newReading];
            return updated.slice(-100);
          });
          
        } catch (err) {
          console.error('ESP32 fetch error:', err);
          setError((err as Error).message);
          setSht20Data(prev => ({ ...prev, status: 'error' }));
        }
      }, config.pollInterval);
      
      setPollInterval(interval);
      
    } catch (err) {
      setError((err as Error).message);
      setSht20Data(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    
    setIsConnected(false);
    setSht20Data(prev => ({ ...prev, status: 'disconnected' }));
    setError(null);
  };

  const updateConfig = (newConfig: Partial<ESP32Config>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // If connected, restart with new config
    if (isConnected) {
      disconnect();
      setTimeout(connect, 1000);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const value: ESP32ContextType = {
    sht20Data,
    config,
    isConnected,
    isConnecting,
    error,
    historicalData,
    connect,
    disconnect,
    updateConfig,
    clearError
  };

  return (
    <ESP32Context.Provider value={value}>
      {children}
    </ESP32Context.Provider>
  );
}

export function useESP32() {
  const context = useContext(ESP32Context);
  if (context === undefined) {
    throw new Error('useESP32 must be used within an ESP32Provider');
  }
  return context;
}