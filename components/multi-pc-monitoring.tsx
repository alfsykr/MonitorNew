"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useMultiPC } from '@/lib/multi-pc-context';
import { 
  Plus, 
  Trash2, 
  Monitor, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Thermometer
} from 'lucide-react';

export function MultiPCMonitoring() {
  const { 
    computers, 
    temperatureReadings, 
    isLoading, 
    error, 
    addComputer, 
    removeComputer, 
    refreshData 
  } = useMultiPC();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newComputer, setNewComputer] = useState({
    name: '',
    ip_address: '',
    status: 'offline' as const,
    last_seen: new Date().toISOString()
  });

  const handleAddComputer = async () => {
    if (!newComputer.name || !newComputer.ip_address) return;
    
    await addComputer(newComputer);
    setNewComputer({
      name: '',
      ip_address: '',
      status: 'offline',
      last_seen: new Date().toISOString()
    });
    setIsAddDialogOpen(false);
  };

  const getLatestReading = (computerId: string, sensorName: string) => {
    return temperatureReadings
      .filter(r => r.computer_id === computerId && r.sensor_name === sensorName)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  const getComputerStatus = (computerId: string) => {
    const latestReading = temperatureReadings
      .filter(r => r.computer_id === computerId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestReading) return 'offline';
    
    const timeDiff = Date.now() - new Date(latestReading.timestamp).getTime();
    return timeDiff < 2 * 60 * 1000 ? 'online' : 'offline'; // 2 minutes threshold
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'offline':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTempStatus = (temp: number) => {
    if (temp > 80) return 'Critical';
    if (temp > 70) return 'Warning';
    return 'Normal';
  };

  const getTempStatusColor = (temp: number) => {
    if (temp > 80) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (temp > 70) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  };

  if (error) {
    return (
      <Card className="border-0 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Multi-PC CPU Temperature Monitoring
          </div>
          <div className="flex gap-2">
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add PC
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New PC for Monitoring</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pc-name">PC Name</Label>
                    <Input
                      id="pc-name"
                      value={newComputer.name}
                      onChange={(e) => setNewComputer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Lab-PC-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pc-ip">IP Address</Label>
                    <Input
                      id="pc-ip"
                      value={newComputer.ip_address}
                      onChange={(e) => setNewComputer(prev => ({ ...prev, ip_address: e.target.value }))}
                      placeholder="e.g., 192.168.1.100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddComputer} className="flex-1">
                      Add PC
                    </Button>
                    <Button 
                      onClick={() => setIsAddDialogOpen(false)} 
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {computers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No computers added yet. Click "Add PC" to start monitoring.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PC Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CPU Temp</TableHead>
                <TableHead>CPU Package</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computers.map((computer) => {
                const status = getComputerStatus(computer.id);
                const cpuReading = getLatestReading(computer.id, 'CPU');
                const packageReading = getLatestReading(computer.id, 'CPU Package');
                
                return (
                  <TableRow key={computer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        {computer.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {computer.ip_address}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(status)}`}>
                        <div className="flex items-center gap-1">
                          {status === 'online' ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <WifiOff className="w-3 h-3" />
                          )}
                          {status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cpuReading ? (
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4" />
                          <span className="font-mono">{cpuReading.temperature}°C</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getTempStatusColor(cpuReading.temperature)}`}
                          >
                            {getTempStatus(cpuReading.temperature)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {packageReading ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{packageReading.temperature}°C</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getTempStatusColor(packageReading.temperature)}`}
                          >
                            {getTempStatus(packageReading.temperature)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cpuReading ? (
                        new Date(cpuReading.timestamp).toLocaleTimeString('id-ID')
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => removeComputer(computer.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}