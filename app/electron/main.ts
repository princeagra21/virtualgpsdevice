import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { setupIpcHandlers } from './ipc';
import { disconnectPrisma } from '../../db/client';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  // Remove default menu bar
  Menu.setApplicationMenu(null);

  // Try to find icon in multiple locations
  const iconPaths = [
    join(__dirname, '../../assets/icon.ico'),
    join(__dirname, '../../assets/icon.png'),
    join(process.resourcesPath, 'assets', '../../assets/icon.ico'),
    join(process.resourcesPath, 'assets', '../../assets/icon.png'),
  ];
  const iconPath = iconPaths.find(p => existsSync(p)) || iconPaths[0];

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'GPS Virtual Device Sender',
    icon: iconPath,
    frame: false, // Remove default title bar
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for Prisma
    },
  });

  if (isDev) {
    // Development: load Next.js dev server
    await mainWindow.loadURL('http://localhost:3000');
    // DevTools can be opened with Ctrl+Shift+I or F12
  } else {
    // Production: load Next.js export
    // In packaged app, __dirname is inside app.asar
    const indexPath = join(__dirname, '../../.next/server/app/index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  setupIpcHandlers();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await disconnectPrisma();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await disconnectPrisma();
});

