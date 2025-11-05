/**
 * Convert timestamp to Teltonika format (milliseconds since 2000-01-01)
 */
export function dateToTeltonikaTimestamp(date?: string): bigint {
  const d = date ? new Date(date) : new Date();
  // Teltonika epoch: 2000-01-01 00:00:00 UTC
  const teltonikaEpoch = new Date('2000-01-01T00:00:00Z').getTime();
  const timestamp = d.getTime() - teltonikaEpoch;
  return BigInt(timestamp);
}

/**
 * Encode latitude/longitude to Teltonika format (degrees * 10000000)
 */
export function encodeCoordinate(coord: number): number {
  return Math.round(coord * 10000000);
}

/**
 * Calculate CRC16 for Teltonika packets
 * Uses CRC-16-IBM (also known as CRC-16-ANSI)
 */
export function calculateCRC16(data: Buffer): number {
  let crc = 0;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  
  return crc & 0xFFFF;
}

/**
 * Encode IMEI for authentication packet
 */
export function encodeImei(imei: string): Buffer {
  const imeiLength = Buffer.alloc(2);
  imeiLength.writeUInt16BE(imei.length, 0);
  return Buffer.concat([imeiLength, Buffer.from(imei, 'ascii')]);
}

