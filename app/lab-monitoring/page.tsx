"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MetricCard } from '@/components/metric-card';
import { ModbusConnectionPanel } from '@/components/modbus-connection-panel';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useModbus } from '@/lib/modbus-context';
import { 
  Thermometer, 
  Droplets, 
  Wind,
  Gauge
} from 'lucide-react';

// Generate monitoring table data
const generateMonitoringTable = (currentTemp: number, currentHumidity: number) => {
  const data = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 10 * 60 * 1000);
    const timeStr = time.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Use current values with slight historical variation
    const tempVariation = (Math.random() - 0.5) * 2;
    const humidityVariation = (Math.random() - 0.5) * 5;
    
    const temperature = Math.round((currentTemp + tempVariation) * 10) / 10;
    const humidity = Math.round((currentHumidity + humidityVariation) * 10) / 10;
    
    // AC Action logic: if temperature > 25°C, turn on AC
    const acAction = temperature > 25 ? 'AC ON - Cooling' : 'AC OFF - Standby';
    const status = temperature > 26 ? 'Warning' : temperature > 25 ? 'Caution' : 'Normal';
    
    data.push({
      id: i,
      time: timeStr,
      temperature,
      humidity,
      acAction,
      status
    });
  }
  
  return data.reverse();
};

export default function LabMonitoringPage() {
  const { sht20Data, isConnected, historicalData } = useModbus();
  const [chartData, setChartData] = useState<any[]>([]);
  const [monitoringData, setMonitoringData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    currentTemp: 24.5,
    currentHumidity: 48.2,
    airflow: 18.5,
    acStatus: 'Active'
  });

  // Generate chart data from historical data or mock data
  const generateChartData = () => {
    if (historicalData.length > 0) {
      // Use real historical data
      const data = historicalData.slice(-24).map((reading, index) => ({
        time: reading.timestamp.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temperature: reading.temperature,
        humidity: reading.humidity,
      }));
      return data;
    } else {
      // Generate mock 24-hour data
      const data = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = time.getHours().toString().padStart(2, '0') + ':00';
        
        // Use current SHT20 data as base with historical variation
        const tempVariation = Math.sin((i / 24) * 2 * Math.PI) * 3 + Math.random() * 2 - 1;
        const humidityVariation = Math.sin((i / 24) * 2 * Math.PI) * 10 + Math.random() * 5 - 2.5;
        
        const temperature = Math.round((sht20Data.temperature + tempVariation) * 10) / 10;
        const humidity = Math.round((sht20Data.humidity + humidityVariation) * 10) / 10;
        
        data.push({
          time: hour,
          temperature,
          humidity,
        });
      }
      
      return data;
    }
  };

  useEffect(() => {
    // Update metrics from SHT20 data
    setMetrics({
      currentTemp: sht20Data.temperature,
      currentHumidity: sht20Data.humidity,
      airflow: 15 + Math.random() * 10, // 15-25 m/s (simulated)
      acStatus: sht20Data.temperature > 25 ? 'Cooling' : 'Standby'
    });

    // Update chart data
    setChartData(generateChartData());
    
    // Update monitoring table
    setMonitoringData(generateMonitoringTable(sht20Data.temperature, sht20Data.humidity));
  }, [sht20Data, historicalData]);

  // Auto-update chart and table every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(generateChartData());
      setMonitoringData(generateMonitoringTable(sht20Data.temperature, sht20Data.humidity));
    }, 30000);

    return () => clearInterval(interval);
  }, [sht20Data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Caution':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Warning':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="p-6">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Lab Monitoring</h1>
              <p className="text-muted-foreground mt-2">
                Real-time monitoring of laboratory environment using SHT20 sensor via Modbus
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Modbus Connected" : "Modbus Disconnected"}
                </Badge>
                <Badge variant="outline">
                  SHT20 Sensor
                </Badge>
              </div>
            </div>

            {/* Modbus Connection Panel */}
            <div className="mb-8">
              <ModbusConnectionPanel />
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Current Temperature"
                value={`${metrics.currentTemp}°C`}
                status={isConnected ? "SHT20" : "Simulated"}
                statusColor={isConnected ? "green" : "orange"}
                icon={Thermometer}
                iconColor="orange"
              />
              
              <MetricCard
                title="Current Humidity"
                value={`${metrics.currentHumidity}%`}
                status={isConnected ? "SHT20" : "Simulated"}
                statusColor={isConnected ? "green" : "blue"}
                icon={Droplets}
                iconColor="blue"
              />
              
              <MetricCard
                title="Airflow Rate"
                value={`${metrics.airflow.toFixed(1)} m/s`}
                status="Good"
                statusColor="green"
                icon={Wind}
                iconColor="green"
              />
              
              <MetricCard
                title="AC System"
                value={metrics.acStatus}
                status="Auto"
                statusColor="green"
                icon={Gauge}
                iconColor="green"
              />
            </div>

            {/* Environment Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    24-Hour Temperature Trend
                    {isConnected && (
                      <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Live Data
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="time" 
                          axisLine={false}
                          tickLine={false}
                          className="text-xs fill-muted-foreground"
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          className="text-xs fill-muted-foreground"
                          domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          stroke="#F97316"
                          fillOpacity={1}
                          fill="url(#tempGradient)"
                          strokeWidth={2}
                          name="Temperature (°C)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    24-Hour Humidity Trend
                    {isConnected && (
                      <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Live Data
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="time" 
                          axisLine={false}
                          tickLine={false}
                          className="text-xs fill-muted-foreground"
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          className="text-xs fill-muted-foreground"
                          domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="humidity"
                          stroke="#3B82F6"
                          fillOpacity={1}
                          fill="url(#humGradient)"
                          strokeWidth={2}
                          name="Humidity (%)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 10-Minute Monitoring Table */}
            <Card className="border-0 bg-card/50 backdrop-blur-sm mb-8">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                  Lab Environment Monitoring (10-Minute Intervals)
                  {isConnected && (
                    <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Real-time Data
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead>Temperature (°C)</TableHead>
                      <TableHead>Humidity (%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>AC Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitoringData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">{record.time}</TableCell>
                        <TableCell className="font-mono">
                          {record.temperature}°C
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.humidity}%
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(record.status)}`}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.acAction}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Footer */}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}