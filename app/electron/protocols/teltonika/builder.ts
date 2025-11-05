import { TELTONIKA_CODEC, avlDataSchema, AvlDataInput } from './types';
import {
  dateToTeltonikaTimestamp,
  encodeCoordinate,
  calculateCRC16,
  encodeImei,
} from './utils';

/**
 * Build Teltonika IMEI Authentication packet
 * Structure: [IMEI Length (2 bytes)] [IMEI (15 bytes ASCII)]
 */
export function buildAuthentication(input: unknown): Buffer {
  const data = avlDataSchema.pick({ imei: true }).parse(input);
  return encodeImei(data.imei);
}

/**
 * Build Teltonika AVL Data packet (Codec 8)
 * Structure:
 * [Preamble (4)] [Data Length (4)] [Codec ID (1)] [Record Count (1)]
 * [AVL Record] [Record Count (1)] [CRC16 (4)]
 */
export function buildAvlData(input: unknown): Buffer {
  const data = avlDataSchema.parse(input);

  // Build AVL Record
  const avlRecord = buildAvlRecord(data);

  // Codec ID and Record Count
  const codecId = Buffer.from([TELTONIKA_CODEC.CODEC_8]);
  const recordCount = Buffer.from([0x01]); // 1 record

  // Build data payload (without preamble and CRC)
  const dataPayload = Buffer.concat([
    codecId,
    recordCount,
    avlRecord,
    recordCount, // Repeat record count at end
  ]);

  // Data length (4 bytes)
  const dataLength = Buffer.alloc(4);
  dataLength.writeUInt32BE(dataPayload.length, 0);

  // Calculate CRC16 over dataPayload
  const crc = calculateCRC16(dataPayload);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  // Preamble (4 zero bytes)
  const preamble = Buffer.alloc(4, 0);

  // Final packet
  return Buffer.concat([preamble, dataLength, dataPayload, crcBuffer]);
}

/**
 * Build single AVL Record
 * Structure:
 * [Timestamp (8)] [Priority (1)] [GPS Element] [I/O Element]
 */
function buildAvlRecord(data: AvlDataInput): Buffer {
  // Timestamp (8 bytes, milliseconds since 2000-01-01)
  const timestamp = dateToTeltonikaTimestamp(data.timestamp);
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigUInt64BE(timestamp, 0);

  // Priority (1 byte) - 0: Low, 1: High, 2: Panic
  const priority = Buffer.from([0x00]);

  // GPS Element
  const gpsElement = buildGpsElement(data);

  // I/O Element
  const ioElement = buildIoElement(data);

  return Buffer.concat([timestampBuffer, priority, gpsElement, ioElement]);
}

/**
 * Build GPS Element
 * Structure:
 * [Longitude (4)] [Latitude (4)] [Altitude (2)] [Angle (2)]
 * [Satellites (1)] [Speed (2)]
 */
function buildGpsElement(data: AvlDataInput): Buffer {
  const buffer = Buffer.alloc(15);
  let offset = 0;

  // Longitude (4 bytes, signed, degrees * 10000000)
  buffer.writeInt32BE(encodeCoordinate(data.longitude), offset);
  offset += 4;

  // Latitude (4 bytes, signed, degrees * 10000000)
  buffer.writeInt32BE(encodeCoordinate(data.latitude), offset);
  offset += 4;

  // Altitude (2 bytes, signed, meters)
  buffer.writeInt16BE(data.altitude || 100, offset);
  offset += 2;

  // Angle (2 bytes, unsigned, degrees)
  buffer.writeUInt16BE(data.angle, offset);
  offset += 2;

  // Satellites (1 byte, unsigned)
  buffer.writeUInt8(data.satellites, offset);
  offset += 1;

  // Speed (2 bytes, unsigned, km/h)
  buffer.writeUInt16BE(data.speed, offset);

  return buffer;
}

/**
 * Build I/O Element
 * Structure:
 * [Event I/O ID (1)] [Total I/O (1)]
 * [1-byte I/O count (1)] [1-byte I/O records]
 * [2-byte I/O count (1)] [2-byte I/O records]
 * [4-byte I/O count (1)] [4-byte I/O records]
 * [8-byte I/O count (1)] [8-byte I/O records]
 */
function buildIoElement(data: AvlDataInput): Buffer {
  const ioRecords: Buffer[] = [];

  // Event I/O ID (0 = no event)
  const eventId = Buffer.from([data.eventId || 0x00]);

  // Build I/O elements
  const io1Byte: Buffer[] = [];
  const io2Byte: Buffer[] = [];
  
  // 1-byte I/O elements
  // ID 239: Ignition (0=off, 1=on)
  if (data.ignition !== undefined) {
    io1Byte.push(Buffer.from([239, data.ignition ? 1 : 0]));
  }
  
  // ID 66: External voltage (battery, in 0.1V, so 120 = 12.0V)
  if (data.battery !== undefined) {
    const voltage = Math.round((data.battery / 100) * 140); // Map 0-100% to 0-140 (0-14V)
    io1Byte.push(Buffer.from([66, voltage]));
  }

  // ID 21: GSM Signal (0-5)
  if (data.gsm !== undefined) {
    io1Byte.push(Buffer.from([21, data.gsm]));
  }

  // 2-byte I/O elements
  // ID 200: Sleep mode (0=disabled, 1-65535=minutes)
  io2Byte.push(Buffer.from([0, 200, 0, 0])); // Sleep disabled

  // Total I/O count
  const totalIo = io1Byte.length + io2Byte.length;
  const totalIoBuffer = Buffer.from([totalIo]);

  // 1-byte I/O section
  const io1Count = Buffer.from([io1Byte.length]);
  const io1Data = Buffer.concat(io1Byte);

  // 2-byte I/O section
  const io2Count = Buffer.from([io2Byte.length]);
  const io2Data = Buffer.concat(io2Byte);

  // 4-byte and 8-byte I/O sections (empty)
  const io4Count = Buffer.from([0]);
  const io8Count = Buffer.from([0]);

  return Buffer.concat([
    eventId,
    totalIoBuffer,
    io1Count,
    io1Data,
    io2Count,
    io2Data,
    io4Count,
    io8Count,
  ]);
}

