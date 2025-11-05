# GPS Virtual Device Sender

A production-ready GPS device simulator for testing tracking servers with support for multiple protocols.

## Features

- **Protocol Support**: GT06 (Concox) and Teltonika Codec 8
- **IMEI Management**: Save and manage multiple device IMEIs
- **Endpoint Management**: Save and manage server configurations
- **Auto Payload Generation**: Automatically generates valid protocol packets
- **Live TCP Logging**: Real-time server response monitoring
- **Standalone**: Portable Windows executable - no installation required

## Quick Start

### Running the App (Development)

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

The app will open at `http://localhost:3000` with Electron.

### Building Portable EXE

```bash
# Build the portable Windows executable
npm run build:exe
```

**Output Location**: `release\win-unpacked\GPS Virtual Device Sender.exe`

**Note**: You may see a "Cannot create symbolic link" error during build - this is expected and can be ignored. The exe is still created successfully.

## Distribution

### Option 1: Copy the Folder
Copy the entire `release\win-unpacked\` folder to any Windows PC and run the exe. No installation needed!

### Option 2: Create a ZIP
```powershell
Compress-Archive -Path "release\win-unpacked" -DestinationPath "GPS-Sender-Portable.zip"
```

Share the ZIP file with users who can extract and run.

## Requirements

### Development
- Node.js 18+
- npm
- Windows, macOS, or Linux

### Running the EXE
- Windows 7 SP1 or later (64-bit)
- No dependencies required - fully portable

## How It Works

1. **Select Protocol**: Choose between GT06 or Teltonika Codec 8
2. **Select/Add IMEI**: Use saved IMEIs or add new ones
3. **Select/Add Endpoint**: Configure your tracking server IP and port
4. **Select Packet Type**: Choose the packet type to send (Login, Location, etc.)
5. **Generate Payload**: Automatically generates a valid packet with current data
6. **Send**: Transmits the packet to your server via TCP
7. **View Response**: See live server responses in the log panel

## Supported Protocols

### GT06 (Concox Protocol)
- **Login Packet**: Device authentication with IMEI
- **Heartbeat**: Keep-alive packet
- **Location Packet**: GPS coordinates with speed, course, satellites

### Teltonika Codec 8
- **Authentication**: IMEI-based authentication
- **AVL Data**: GPS data with I/O elements, ignition status, battery level, GSM signal

All packets include proper CRC checksums and protocol formatting.

## Project Structure

```
GPSDataSender/
├── app/
│   ├── electron/        # Electron main process
│   ├── page.tsx         # Main UI
│   └── protocols/       # Protocol implementations
├── components/          # React components
├── db/                  # Prisma database client
├── prisma/             # Database schema
└── release/            # Built executable (after build)
```

## Database

Uses SQLite with Prisma ORM for storing:
- Saved IMEIs
- Saved endpoints (server configurations)

Database location: `%APPDATA%\gps-virtual-device-sender\dev.db`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production files |
| `npm run build:exe` | Build portable Windows executable |

## Troubleshooting

### "Cannot create symbolic link" Error During Build
This error is related to code signing tools but doesn't affect the build. The exe is created successfully in `release\win-unpacked\`.

### Windows Defender SmartScreen Warning
When running the unsigned exe for the first time:
1. Click "More Info"
2. Click "Run Anyway"

This is normal for unsigned executables.

### App Won't Start
Ensure Prisma files are included in the build:
- Check `release\win-unpacked\resources\app.asar.unpacked\node_modules\.prisma\`
- Check `release\win-unpacked\resources\app.asar.unpacked\prisma\schema.prisma`

### Reset Database
Delete: `%APPDATA%\gps-virtual-device-sender\dev.db`

## Tech Stack

- **Electron**: Desktop application framework
- **Next.js**: React framework for UI
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM with SQLite
- **Tailwind CSS**: Styling
- **Radix UI**: Accessible UI components

## License

MIT

---

**© 2025 Fleet Stack**  
https://fleetstackglobal.com

