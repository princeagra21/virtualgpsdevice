/**
 * Convert IMEI string to BCD (Binary Coded Decimal) format
 * GT06 uses 8 bytes for IMEI representation
 */
export function imeiToBcd(imei: string): Buffer {
  if (imei.length !== 15) {
    throw new Error('IMEI must be exactly 15 digits');
  }

  const buffer = Buffer.alloc(8);
  const padded = '0' + imei; // Pad to 16 digits for 8 bytes

  for (let i = 0; i < 8; i++) {
    const high = parseInt(padded[i * 2], 10);
    const low = parseInt(padded[i * 2 + 1], 10);
    buffer[i] = (high << 4) | low;
  }

  return buffer;
}

/**
 * Convert Date to GT06 UTC format (6 bytes: YY MM DD HH MM SS)
 */
export function dateToUtcBytes(date?: string): Buffer {
  const d = date ? new Date(date) : new Date();
  const buffer = Buffer.alloc(6);

  buffer[0] = d.getUTCFullYear() % 100; // Year (2 digits)
  buffer[1] = d.getUTCMonth() + 1; // Month (1-12)
  buffer[2] = d.getUTCDate(); // Day
  buffer[3] = d.getUTCHours(); // Hour
  buffer[4] = d.getUTCMinutes(); // Minute
  buffer[5] = d.getUTCSeconds(); // Second

  return buffer;
}

/**
 * Encode latitude to GT06 format (4 bytes)
 * GT06 uses: (degrees * 60 + minutes) * 30000
 * For decimal degrees: degrees * 60 * 30000 = degrees * 1800000
 */
export function encodeLatitude(lat: number): Buffer {
  // Convert decimal degrees to GT06 format: degrees * 60 (to minutes) * 30000
  const absLat = Math.abs(lat);
  const scaled = Math.round(absLat * 60 * 30000);
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(scaled, 0);
  return buffer;
}

/**
 * Encode longitude to GT06 format (4 bytes)
 * GT06 uses: (degrees * 60 + minutes) * 30000
 * For decimal degrees: degrees * 60 * 30000 = degrees * 1800000
 */
export function encodeLongitude(lng: number): Buffer {
  // Convert decimal degrees to GT06 format: degrees * 60 (to minutes) * 30000
  const absLng = Math.abs(lng);
  const scaled = Math.round(absLng * 60 * 30000);
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(scaled, 0);
  return buffer;
}

/**
 * Calculate GT06 checksum (CRC-ITU)
 * Sum of all bytes (excluding start/end flags) modulo 65536
 */
export function calculateChecksum(data: Buffer): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  return sum & 0xffff; // 16-bit checksum
}

/**
 * Encode course status byte
 * Bit layout: [GPS fixed | N/S | E/W | Reserved(4) | Charging]
 * Bit 6: 0=South, 1=North
 * Bit 5: 0=West, 1=East
 */
export function encodeCourseStatus(
  lat: number,
  lng: number,
  gpsFixed: boolean = true,
  charging: boolean = true
): number {
  let status = 0;
  if (gpsFixed) status |= 0b10000000; // Bit 7: GPS fixed
  if (lat >= 0) status |= 0b01000000; // Bit 6: 1=North, 0=South
  if (lng >= 0) status |= 0b00100000; // Bit 5: 1=East, 0=West
  if (charging) status |= 0b00000001; // Bit 0: Charging
  return status;
}

