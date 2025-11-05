import { Socket } from 'net';
import { BrowserWindow } from 'electron';

export interface TcpSendOptions {
  host: string;
  port: number;
  data: Buffer;
  timeoutMs?: number;
  keepAlive?: boolean; // Keep connection open for server commands
}

export interface TcpSendResult {
  success: boolean;
  bytesSent: number;
  bytesReceived: number;
  ack?: Buffer;
  error?: string;
}

// Store active connections
const activeConnections = new Map<string, Socket>();

export async function sendTcp(options: TcpSendOptions): Promise<TcpSendResult> {
  const { host, port, data, timeoutMs = 5000, keepAlive = true } = options;
  const connectionKey = `${host}:${port}`;

  return new Promise((resolve) => {
    // Check if we have an existing connection
    let socket = activeConnections.get(connectionKey);
    let isNewConnection = false;

    if (!socket || socket.destroyed) {
      socket = new Socket();
      isNewConnection = true;
    }

    let timeoutHandle: NodeJS.Timeout;
    let ackData: Buffer | undefined;
    let bytesReceived = 0;
    let initialResponseReceived = false;

    const cleanup = (keepConnection = false) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (!keepConnection && socket) {
        activeConnections.delete(connectionKey);
        socket.removeAllListeners();
        socket.destroy();
      }
    };

    // Timeout handler
    timeoutHandle = setTimeout(() => {
      if (!initialResponseReceived) {
        cleanup();
        resolve({
          success: false,
          bytesSent: data.length,
          bytesReceived,
          ack: ackData,
          error: `Connection timeout after ${timeoutMs}ms`,
        });
      }
    }, timeoutMs);

    // Send data immediately if already connected
    const sendData = () => {
      socket!.write(data, (err) => {
        if (err) {
          cleanup();
          resolve({
            success: false,
            bytesSent: 0,
            bytesReceived: 0,
            error: `Write error: ${err.message}`,
          });
        } else {
          console.log(`[TCP] Sent ${data.length} bytes: ${data.toString('hex')}`);
        }
      });
    };

    // Handle incoming data (ACK or server commands)
    const handleData = (chunk: Buffer) => {
      console.log(`[TCP] Received ${chunk.length} bytes: ${chunk.toString('hex')}`);
      
      // Send to renderer process for live logging
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('tcp:data', {
          timestamp: new Date().toISOString(),
          host,
          port,
          data: chunk.toString('hex'),
          length: chunk.length,
        });
      }

      if (!ackData) {
        ackData = chunk;
      } else {
        ackData = Buffer.concat([ackData, chunk]);
      }
      bytesReceived += chunk.length;

      // Resolve with initial ACK after short delay
      if (!initialResponseReceived) {
        initialResponseReceived = true;
        setTimeout(() => {
          if (keepAlive) {
            // Keep connection alive and store it
            activeConnections.set(connectionKey, socket!);
            console.log(`[TCP] Connection kept alive: ${connectionKey}`);
          }
          cleanup(keepAlive);
          resolve({
            success: true,
            bytesSent: data.length,
            bytesReceived,
            ack: ackData,
          });
        }, 500);
      }
    };

    if (isNewConnection) {
      // New connection - need to connect first
      socket!.connect(port, host, () => {
        console.log(`[TCP] Connected to ${host}:${port}`);
        sendData();
      });

      socket!.on('data', handleData);

      // Handle errors
      socket!.on('error', (err) => {
        cleanup();
        resolve({
          success: false,
          bytesSent: 0,
          bytesReceived,
          ack: ackData,
          error: err.message,
        });
      });

      // Handle connection close
      socket!.on('close', () => {
        console.log('[TCP] Connection closed');
        activeConnections.delete(connectionKey);
      });
    } else {
      // Reusing existing connection
      console.log(`[TCP] Reusing connection to ${connectionKey}`);
      sendData();
      // Already has listeners, just wait for response
      const existingDataHandler = handleData;
      socket.once('data', existingDataHandler);
    }
  });
}

// Close all active connections
export function closeAllConnections() {
  activeConnections.forEach((socket, key) => {
    console.log(`[TCP] Closing connection: ${key}`);
    socket.destroy();
  });
  activeConnections.clear();
}

