'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/form-components';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/all-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/all-components';
import { Popover, PopoverContent, PopoverTrigger, Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/all-components';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/app/lib/ipc';
import { Check, ChevronsUpDown, Plus, Trash2, Send, Download, Eraser, Settings, Minus, Square, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type Endpoint = { id: string; name: string; ip: string; port: number };
type Imei = { id: string; name: string; imei: string };
type PacketMetadata = { name: string; label: string };
type ProtocolMetadata = { name: string; label: string; packets: PacketMetadata[] };
type LogEntry = { time: string; message: string; type: 'info' | 'success' | 'error' };

// Generate random GPS data with realistic coordinates
function generateRandomPayload(selectedImei: string, packetType: string, protocol: string): Record<string, unknown> {
  const now = new Date();
  const payload: Record<string, unknown> = {
    imei: selectedImei,
  };

  // Fixed base coordinates around New Jersey area (40.5605, -74.5247)
  const BASE_LAT = 40.5605;
  const BASE_LNG = -74.5247;

  // GT06 Protocol
  if (protocol === 'GT06') {
    payload.serial = 1;
    if (packetType === 'Location' || packetType === 'History') {
      // Add small random offset for movement simulation (within ~1km)
      payload.latitude = BASE_LAT + (Math.random() - 0.5) * 0.01;
      payload.longitude = BASE_LNG + (Math.random() - 0.5) * 0.01;
      payload.speed = Math.floor(Math.random() * 120);
      payload.course = Math.floor(Math.random() * 360);
      payload.battery = 70 + Math.floor(Math.random() * 30);
      payload.satellites = 6 + Math.floor(Math.random() * 6);
      payload.timestamp = now.toISOString();
    }
  }
  
  // Teltonika Protocol
  if (protocol === 'Teltonika') {
    if (packetType === 'AVLData') {
      // Use same fixed coordinates around New Jersey
      payload.latitude = BASE_LAT + (Math.random() - 0.5) * 0.01;
      payload.longitude = BASE_LNG + (Math.random() - 0.5) * 0.01;
      payload.altitude = 50 + Math.floor(Math.random() * 200);
      payload.angle = Math.floor(Math.random() * 360);
      payload.satellites = 6 + Math.floor(Math.random() * 6);
      payload.speed = Math.floor(Math.random() * 120);
      payload.ignition = Math.random() > 0.3; // 70% on
      payload.battery = 70 + Math.floor(Math.random() * 30);
      payload.gsm = Math.floor(Math.random() * 6); // 0-5
      payload.eventId = 0;
      payload.timestamp = now.toISOString();
    }
  }

  return payload;
}

export default function Home() {
  const { toast } = useToast();
  
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [endpointOpen, setEndpointOpen] = useState(false);
  
  const [imeis, setImeis] = useState<Imei[]>([]);
  const [selectedImei, setSelectedImei] = useState<string>('');
  const [imeiOpen, setImeiOpen] = useState(false);
  
  const [protocols, setProtocols] = useState<string[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('GT06');
  const [protocolMeta, setProtocolMeta] = useState<ProtocolMetadata | null>(null);
  
  const [selectedPacketType, setSelectedPacketType] = useState<string>('Login');
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sending, setSending] = useState(false);
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState({ name: '', ip: '', port: '' });
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [newImei, setNewImei] = useState({ name: '', imei: '' });

  useEffect(() => {
    if (!api) return;
    api.endpoints.list().then(setEndpoints).catch(console.error);
    api.imeis.list().then(setImeis).catch(console.error);
    api.protocols.list().then((p) => {
      setProtocols(p);
      if (p.length > 0 && !selectedProtocol) setSelectedProtocol(p[0]);
    }).catch(console.error);

    // Listen for server commands
    const unsubscribe = api.tcp.onData((event) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      addLog(`← Server command from ${event.host}:${event.port} (${event.length} bytes): ${event.data}`, 'info');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!api || !selectedProtocol) return;
    api.protocols.get(selectedProtocol).then((meta) => {
      setProtocolMeta(meta);
      if (meta.packets.length > 0) {
        setSelectedPacketType(meta.packets[0].name);
      }
    }).catch(console.error);
  }, [selectedProtocol]);

  useEffect(() => {
    if (!selectedImei || !selectedPacketType || !selectedProtocol) return;
    const selectedImeiObj = imeis.find((i) => i.id === selectedImei);
    if (selectedImeiObj) {
      const newPayload = generateRandomPayload(selectedImeiObj.imei, selectedPacketType, selectedProtocol);
      setPayload(newPayload);
    }
  }, [selectedImei, selectedPacketType, selectedProtocol, imeis]);

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, message, type }, ...prev].slice(0, 100));
  }

  async function handleAddEndpoint() {
    if (!api) return;
    try {
      const port = parseInt(newEndpoint.port, 10);
      const endpoint = await api.endpoints.add({ name: newEndpoint.name, ip: newEndpoint.ip, port });
      setEndpoints((prev) => [...prev, endpoint]);
      setNewEndpoint({ name: '', ip: '', port: '' });
      toast({ title: 'Endpoint added' });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    }
  }

  async function handleDeleteEndpoint(id: string) {
    if (!api) return;
    try {
      await api.endpoints.delete(id);
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
      if (selectedEndpoint === id) setSelectedEndpoint('');
      toast({ title: 'Endpoint deleted' });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    }
  }

  async function handleAddImei() {
    if (!api) return;
    try {
      const imei = await api.imeis.add({ name: newImei.name, imei: newImei.imei });
      setImeis((prev) => [...prev, imei]);
      setNewImei({ name: '', imei: '' });
      toast({ title: 'IMEI added' });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    }
  }

  async function handleDeleteImei(id: string) {
    if (!api) return;
    try {
      await api.imeis.delete(id);
      setImeis((prev) => prev.filter((i) => i.id !== id));
      if (selectedImei === id) setSelectedImei('');
      toast({ title: 'IMEI deleted' });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    }
  }

  async function handleSend() {
    if (!api || !selectedEndpoint || !selectedImei) {
      toast({ title: 'Error', description: 'Select endpoint and IMEI' });
      return;
    }

    setSending(true);
    addLog(`Sending ${selectedProtocol} ${selectedPacketType}...`, 'info');

    try {
      const result = await api.packet.send({
        endpointId: selectedEndpoint,
        protocol: selectedProtocol,
        packetType: selectedPacketType,
        payload,
      });

      if (result.ok) {
        addLog(`✓ Sent ${result.bytesSent} bytes: ${result.rawHex}`, 'success');
        if (result.ackHex) addLog(`✓ ACK: ${result.ackHex}`, 'success');
        toast({ title: 'Packet sent', description: `${result.bytesSent} bytes` });
      } else {
        addLog(`✗ Error: ${result.error}`, 'error');
        toast({ title: 'Error', description: result.error });
      }
    } catch (error) {
      addLog(`✗ Exception: ${String(error)}`, 'error');
      toast({ title: 'Error', description: String(error) });
    } finally {
      setSending(false);
    }
  }

  async function handleExport() {
    if (!api) return;
    try {
      const path = await api.history.export();
      toast({ title: 'Exported', description: path });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    }
  }

  async function handleClearLogs() {
    if (!api) return;
    try {
      await api.history.clear();
      setLogs([]);
      toast({ title: 'History cleared' });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Custom Title Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between h-12 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-3 px-4">
          <Image src="/icon-light.png" alt="GPS Virtual Device Sender" width={28} height={28} className="object-contain" />
          <span className="text-sm font-medium">GPS Virtual Device Sender</span>
        </div>
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button onClick={() => api?.window.minimize()} className="h-12 w-12 flex items-center justify-center hover:bg-white/20 transition">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => api?.window.maximize()} className="h-12 w-12 flex items-center justify-center hover:bg-white/20 transition">
            <Square className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => api?.window.close()} className="h-12 w-12 flex items-center justify-center hover:bg-red-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Configuration */}
        <div className="w-7/12 border-r p-6 overflow-y-auto">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center gap-4">
                <Image src="/logo.png" alt="GPS Virtual Device Sender" width={230} height={120} className="object-contain" />
                <CardTitle className="text-base self-start">Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Row 1: Endpoint & Device */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Endpoint</Label>
                  <div className="flex gap-1">
                    <Popover open={endpointOpen} onOpenChange={setEndpointOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-between h-9 text-sm">
                          {selectedEndpoint ? endpoints.find((e) => e.id === selectedEndpoint)?.name : 'Select'}
                          <ChevronsUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search..." />
                          <CommandEmpty>No endpoint found.</CommandEmpty>
                          <CommandGroup>
                            {endpoints.map((ep) => (
                              <CommandItem key={ep.id} value={ep.id} onSelect={() => { setSelectedEndpoint(ep.id); setEndpointOpen(false); }}>
                                <Check className={cn('mr-2 h-4 w-4', selectedEndpoint === ep.id ? 'opacity-100' : 'opacity-0')} />
                                {ep.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Manage Endpoints</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                            <div className="grid grid-cols-3 gap-2">
                              <Input placeholder="Name" value={newEndpoint.name} onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })} className="h-9" />
                              <Input placeholder="IP" value={newEndpoint.ip} onChange={(e) => setNewEndpoint({ ...newEndpoint, ip: e.target.value })} className="h-9" />
                              <Input placeholder="Port" type="number" value={newEndpoint.port} onChange={(e) => setNewEndpoint({ ...newEndpoint, port: e.target.value })} className="h-9" />
                            </div>
                            <Button onClick={handleAddEndpoint} size="sm" className="w-full h-8"><Plus className="w-3 h-3 mr-1" />Add</Button>
                          </div>
                          <div className="border rounded max-h-48 overflow-y-auto">
                            {endpoints.map((ep) => (
                              <div key={ep.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                                <div><div className="font-medium">{ep.name}</div><div className="text-xs text-muted-foreground">{ep.ip}:{ep.port}</div></div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteEndpoint(ep.id)}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Device (IMEI)</Label>
                  <div className="flex gap-1">
                    <Popover open={imeiOpen} onOpenChange={setImeiOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-between h-9 text-sm">
                          {selectedImei ? imeis.find((i) => i.id === selectedImei)?.name : 'Select'}
                          <ChevronsUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search..." />
                          <CommandEmpty>No IMEI found.</CommandEmpty>
                          <CommandGroup>
                            {imeis.map((imei) => (
                              <CommandItem key={imei.id} value={imei.id} onSelect={() => { setSelectedImei(imei.id); setImeiOpen(false); }}>
                                <Check className={cn('mr-2 h-4 w-4', selectedImei === imei.id ? 'opacity-100' : 'opacity-0')} />
                                {imei.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Dialog open={imeiDialogOpen} onOpenChange={setImeiDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Manage IMEIs</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Device Name" value={newImei.name} onChange={(e) => setNewImei({ ...newImei, name: e.target.value })} className="h-9" />
                              <Input placeholder="IMEI (15 digits)" value={newImei.imei} onChange={(e) => setNewImei({ ...newImei, imei: e.target.value })} maxLength={15} className="h-9" />
                            </div>
                            <Button onClick={handleAddImei} size="sm" className="w-full h-8"><Plus className="w-3 h-3 mr-1" />Add</Button>
                          </div>
                          <div className="border rounded max-h-48 overflow-y-auto">
                            {imeis.map((imei) => (
                              <div key={imei.id} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                                <div><div className="font-medium">{imei.name}</div><div className="text-xs text-muted-foreground font-mono">{imei.imei}</div></div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteImei(imei.id)}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Row 2: Protocol & Packet Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Protocol</Label>
                  <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {protocols.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Packet Type</Label>
                  <Select value={selectedPacketType} onValueChange={setSelectedPacketType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {protocolMeta?.packets.map((pkt) => (
                        <SelectItem key={pkt.name} value={pkt.name}>{pkt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payload Preview */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Payload (Auto-Generated)</Label>
                <div className="bg-muted/50 rounded-md p-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                  {Object.keys(payload).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Select device to generate</p>
                  ) : (
                    Object.entries(payload).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Send Button */}
              <Button onClick={handleSend} disabled={sending || !selectedEndpoint || !selectedImei} className="w-full h-10">
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : 'Send Packet'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Logs */}
        <div className="w-5/12 p-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live Log</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleExport} variant="ghost" size="sm" title="Export to CSV">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleClearLogs} variant="ghost" size="sm" title="Clear Logs">
                    <Eraser className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto space-y-1 font-mono text-xs">
                {logs.length === 0 && <p className="text-muted-foreground text-center py-8">No logs yet</p>}
                {logs.map((log, i) => (
                  <div key={i} className={cn('p-2 rounded text-xs', log.type === 'error' ? 'bg-destructive/10 text-destructive' : log.type === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-muted')}>
                    <span className="text-muted-foreground">[{log.time}]</span> {log.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-2 bg-card text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} All Rights Reserved.{' '}
          <a
            href="https://fleetstackglobal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Fleet Stack
          </a>
        </p>
      </div>
    </div>
  );
}

