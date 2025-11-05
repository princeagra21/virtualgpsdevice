import { ipcMain, BrowserWindow } from 'electron';
import { z } from 'zod';
import { getPrismaClient } from '../../db/client';
import { sendTcp } from './net/tcpClient';
import { getProtocolDriver, listProtocols } from './protocols';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// Validation schemas
const endpointInputSchema = z.object({
  name: z.string().min(1).max(64),
  ip: z.string().ip({ version: 'v4' }),
  port: z.number().int().min(1).max(65535),
});

const packetRequestSchema = z.object({
  endpointId: z.string(),
  protocol: z.string(),
  packetType: z.string(),
  payload: z.record(z.unknown()),
});

const imeiInputSchema = z.object({
  name: z.string().min(1).max(64),
  imei: z.string().length(15).regex(/^\d+$/, 'IMEI must be 15 digits'),
});

export function setupIpcHandlers() {
  const prisma = getPrismaClient();

  // List all endpoints
  ipcMain.handle('endpoints:list', async () => {
    try {
      const endpoints = await prisma.endpoint.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return endpoints;
    } catch (error) {
      console.error('[IPC] Error listing endpoints:', error);
      throw error;
    }
  });

  // Add endpoint
  ipcMain.handle('endpoints:add', async (_event, input: unknown) => {
    try {
      const validated = endpointInputSchema.parse(input);
      const endpoint = await prisma.endpoint.create({
        data: validated,
      });
      return endpoint;
    } catch (error) {
      console.error('[IPC] Error adding endpoint:', error);
      throw error;
    }
  });

  // Delete endpoint
  ipcMain.handle('endpoints:delete', async (_event, id: string) => {
    try {
      await prisma.endpoint.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error deleting endpoint:', error);
      throw error;
    }
  });

  // List protocols
  ipcMain.handle('protocols:list', async () => {
    return listProtocols();
  });

  // Get protocol metadata
  ipcMain.handle('protocols:get', async (_event, protocol: string) => {
    const driver = getProtocolDriver(protocol);
    if (!driver) {
      throw new Error(`Protocol ${protocol} not found`);
    }
    return {
      name: driver.name,
      label: driver.label,
      packets: Object.keys(driver.packets).map((key) => ({
        name: key,
        label: driver.packets[key].label,
        fields: driver.packets[key].fields,
      })),
    };
  });

  // Send packet
  ipcMain.handle('packet:send', async (_event, request: unknown) => {
    try {
      const validated = packetRequestSchema.parse(request);

      // Get endpoint
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: validated.endpointId },
      });

      if (!endpoint) {
        return { ok: false, error: 'Endpoint not found' };
      }

      // Get protocol driver
      const driver = getProtocolDriver(validated.protocol);
      if (!driver) {
        return { ok: false, error: `Protocol ${validated.protocol} not found` };
      }

      const packetMeta = driver.packets[validated.packetType];
      if (!packetMeta) {
        return { ok: false, error: `Packet type ${validated.packetType} not found` };
      }

      // Build packet
      let buffer: Buffer;
      try {
        buffer = packetMeta.build(validated.payload);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { ok: false, error: `Packet build failed: ${errorMessage}` };
      }

      const rawHex = buffer.toString('hex');

      // Send via TCP
      const result = await sendTcp({
        host: endpoint.ip,
        port: endpoint.port,
        data: buffer,
        timeoutMs: 5000,
      });

      // Save to history
      await prisma.sendHistory.create({
        data: {
          endpointId: validated.endpointId,
          protocol: validated.protocol,
          packetType: validated.packetType,
          payloadJson: JSON.stringify(validated.payload),
          rawHex,
          bytesSent: result.bytesSent,
          bytesReceived: result.bytesReceived,
          status: result.success ? 'OK' : 'ERROR',
          errorMessage: result.error || null,
          ackHex: result.ack?.toString('hex') || null,
        },
      });

      if (result.success) {
        return {
          ok: true,
          bytesSent: result.bytesSent,
          rawHex,
          ackHex: result.ack?.toString('hex'),
        };
      } else {
        return { ok: false, error: result.error || 'Unknown error' };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[IPC] Error sending packet:', errorMessage);
      return { ok: false, error: errorMessage };
    }
  });

  // Export history to CSV
  ipcMain.handle('history:export', async () => {
    try {
      const history = await prisma.sendHistory.findMany({
        include: { endpoint: true },
        orderBy: { createdAt: 'desc' },
      });

      const rows = history.map((h) => ({
        timestamp: h.createdAt.toISOString(),
        endpoint: `${h.endpoint.name} (${h.endpoint.ip}:${h.endpoint.port})`,
        protocol: h.protocol,
        packetType: h.packetType,
        status: h.status,
        bytesSent: h.bytesSent,
        bytesReceived: h.bytesReceived,
        rawHex: h.rawHex,
        ackHex: h.ackHex || '',
        error: h.errorMessage || '',
      }));

      const csv = [
        'Timestamp,Endpoint,Protocol,Packet Type,Status,Bytes Sent,Bytes Received,Raw Hex,ACK Hex,Error',
        ...rows.map((r) =>
          [
            r.timestamp,
            `"${r.endpoint}"`,
            r.protocol,
            r.packetType,
            r.status,
            r.bytesSent,
            r.bytesReceived,
            r.rawHex,
            r.ackHex,
            `"${r.error}"`,
          ].join(',')
        ),
      ].join('\n');

      const filename = `gps_history_${Date.now()}.csv`;
      const filepath = join(app.getPath('downloads'), filename);
      writeFileSync(filepath, csv, 'utf-8');

      return filepath;
    } catch (error) {
      console.error('[IPC] Error exporting history:', error);
      throw error;
    }
  });

  // Clear logs
  ipcMain.handle('history:clear', async () => {
    try {
      await prisma.sendHistory.deleteMany();
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error clearing history:', error);
      throw error;
    }
  });

  // List all IMEIs
  ipcMain.handle('imeis:list', async () => {
    try {
      const imeis = await prisma.imei.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return imeis;
    } catch (error) {
      console.error('[IPC] Error listing IMEIs:', error);
      throw error;
    }
  });

  // Add IMEI
  ipcMain.handle('imeis:add', async (_event, input: unknown) => {
    try {
      const validated = imeiInputSchema.parse(input);
      const imei = await prisma.imei.create({
        data: validated,
      });
      return imei;
    } catch (error) {
      console.error('[IPC] Error adding IMEI:', error);
      throw error;
    }
  });

  // Delete IMEI
  ipcMain.handle('imeis:delete', async (_event, id: string) => {
    try {
      await prisma.imei.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error deleting IMEI:', error);
      throw error;
    }
  });

  // Window controls
  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });
}

