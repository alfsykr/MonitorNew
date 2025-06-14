"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Computer, TemperatureReading } from './supabase';

interface MultiPCContextType {
  computers: Computer[];
  temperatureReadings: TemperatureReading[];
  isLoading: boolean;
  error: string | null;
  addComputer: (computer: Omit<Computer, 'id' | 'created_at'>) => Promise<void>;
  removeComputer: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const MultiPCContext = createContext<MultiPCContextType | undefined>(undefined);

export function MultiPCProvider({ children }: { children: ReactNode }) {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [temperatureReadings, setTemperatureReadings] = useState<TemperatureReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch computers
  const fetchComputers = async () => {
    try {
      const { data, error } = await supabase
        .from('computers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setComputers(data || []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Fetch latest temperature readings
  const fetchTemperatureReadings = async () => {
    try {
      const { data, error } = await supabase
        .from('temperature_readings')
        .select(`
          *,
          computer:computers(*)
        `)
        .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      setTemperatureReadings(data || []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Add new computer
  const addComputer = async (computer: Omit<Computer, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('computers')
        .insert([computer]);
      
      if (error) throw error;
      await fetchComputers();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Remove computer
  const removeComputer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('computers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchComputers();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchComputers(), fetchTemperatureReadings()]);
    setIsLoading(false);
  };

  // Setup real-time subscriptions
  useEffect(() => {
    // Subscribe to computer changes
    const computersSubscription = supabase
      .channel('computers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'computers' },
        () => fetchComputers()
      )
      .subscribe();

    // Subscribe to temperature readings
    const readingsSubscription = supabase
      .channel('temperature_readings')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'temperature_readings' },
        () => fetchTemperatureReadings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(computersSubscription);
      supabase.removeChannel(readingsSubscription);
    };
  }, []);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  const value: MultiPCContextType = {
    computers,
    temperatureReadings,
    isLoading,
    error,
    addComputer,
    removeComputer,
    refreshData,
  };

  return (
    <MultiPCContext.Provider value={value}>
      {children}
    </MultiPCContext.Provider>
  );
}

export function useMultiPC() {
  const context = useContext(MultiPCContext);
  if (context === undefined) {
    throw new Error('useMultiPC must be used within a MultiPCProvider');
  }
  return context;
}