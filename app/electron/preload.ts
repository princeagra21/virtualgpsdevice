import { contextBridge, ipcRenderer } from 'electron';

export type Endpoint = {
  id: string;
  name: string;
  ip: string;
  port: number;
  createdAt: Date;
};

export type Imei = {
  id: string;
  name: string;
  imei: string;
  createdAt: Date;
};

export type PacketRequest = {
  endpointId: string;
  protocol: string;
  packetType: string;
  payload: Record<string, unknown>;
};

export type SendResult =
  | { ok: true; bytesSent: number; rawHex: string; ackHex?: string }
  | { ok: false; error: string };

export type FieldMetadata = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'datetime-local';
  placeholder?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

export type PacketMetadata = {
  name: string;
  label: string;
  fields: FieldMetadata[];
};

export type ProtocolMetadata = {
  name: string;
  label: string;
  packets: PacketMetadata[];
};

export type TcpDataEvent = {
  timestamp: string;
  host: string;
  port: number;
  data: string;
  length: number;
};

export type Api = {
  endpoints: {
    list: () => Promise<Endpoint[]>;
    add: (input: { name: string; ip: string; port: number }) => Promise<Endpoint>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  imeis: {
    list: () => Promise<Imei[]>;
    add: (input: { name: string; imei: string }) => Promise<Imei>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  protocols: {
    list: () => Promise<string[]>;
    get: (protocol: string) => Promise<ProtocolMetadata>;
  };
  packet: {
    send: (request: PacketRequest) => Promise<SendResult>;
  };
  history: {
    export: () => Promise<string>;
    clear: () => Promise<{ success: boolean }>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  tcp: {
    onData: (callback: (event: TcpDataEvent) => void) => () => void;
  };
};

const api: Api = {
  endpoints: {
    list: () => ipcRenderer.invoke('endpoints:list'),
    add: (input) => ipcRenderer.invoke('endpoints:add', input),
    delete: (id) => ipcRenderer.invoke('endpoints:delete', id),
  },
  imeis: {
    list: () => ipcRenderer.invoke('imeis:list'),
    add: (input) => ipcRenderer.invoke('imeis:add', input),
    delete: (id) => ipcRenderer.invoke('imeis:delete', id),
  },
  protocols: {
    list: () => ipcRenderer.invoke('protocols:list'),
    get: (protocol) => ipcRenderer.invoke('protocols:get', protocol),
  },
  packet: {
    send: (request) => ipcRenderer.invoke('packet:send', request),
  },
  history: {
    export: () => ipcRenderer.invoke('history:export'),
    clear: () => ipcRenderer.invoke('history:clear'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  tcp: {
    onData: (callback) => {
      const handler = (_event: any, data: TcpDataEvent) => callback(data);
      ipcRenderer.on('tcp:data', handler);
      return () => ipcRenderer.removeListener('tcp:data', handler);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

