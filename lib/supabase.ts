import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Computer = {
  id: string
  name: string
  ip_address: string
  last_seen: string
  status: 'online' | 'offline'
  created_at: string
}

export type TemperatureReading = {
  id: string
  computer_id: string
  sensor_name: string
  temperature: number
  timestamp: string
  computer?: Computer
}