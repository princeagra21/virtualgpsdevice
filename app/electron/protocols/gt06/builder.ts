import {
  GT06_PROTOCOL,
  LoginInput,
  LocationInput,
  HistoryInput,
  loginSchema,
  locationSchema,
  historySchema,
} from './types';
import {
  imeiToBcd,
  dateToUtcBytes,
  encodeLatitude,
  encodeLongitude,
  calculateChecksum,
  encodeCourseStatus,
} from './utils';

const START_BIT = 0x78;
const END_BIT = 0x0d;
const END_BIT_2 = 0x0a;

/**
 * Build GT06 Login packet
 * Structure: [Start(2)] [Length(1)] [Protocol(1)] [IMEI(8)] [Serial(2)] [Checksum(2)] [End(2)]
 */
export function buildLogin(input: unknown): Buffer {
  const data = loginSchema.parse(input);

  const imeiBcd = imeiToBcd(data.imei);
  const payload = Buffer.alloc(1 + 8); // Protocol + IMEI

  payload[0] = GT06_PROTOCOL.LOGIN;
  imeiBcd.copy(payload, 1);

  const length = payload.length + 2 + 2; // +serial +checksum
  const serial = data.serial || 1;

  // Build packet without start/end
  const contentBuffer = Buffer.alloc(1 + payload.length + 2);
  contentBuffer[0] = length;
  payload.copy(contentBuffer, 1);
  contentBuffer.writeUInt16BE(serial, 1 + payload.length);

  const checksum = calculateChecksum(contentBuffer);

  // Final packet
  const packet = Buffer.alloc(2 + contentBuffer.length + 2 + 2);
  let offset = 0;

  packet[offset++] = START_BIT;
  packet[offset++] = START_BIT;
  contentBuffer.copy(packet, offset);
  offset += contentBuffer.length;
  packet.writeUInt16BE(checksum, offset);
  offset += 2;
  packet[offset++] = END_BIT;
  packet[offset++] = END_BIT_2;

  return packet;
}

/**
 * Build GT06 Location packet
 * Structure: [Start(2)] [Length(1)] [Protocol(1)] [UTC(6)] [Satellites(1)] [Lat(4)] [Lng(4)] 
 *            [Speed(1)] [CourseStatus(2)] [MCC(2)] [MNC(1)] [LAC(2)] [CellID(3)] [Serial(2)] [Checksum(2)] [End(2)]
 */
export function buildLocation(input: unknown): Buffer {
  const data = locationSchema.parse(input);

  const utcBytes = dateToUtcBytes(data.timestamp);
  const latBytes = encodeLatitude(data.latitude);
  const lngBytes = encodeLongitude(data.longitude);
  const courseStatus = encodeCourseStatus(data.latitude, data.longitude);

  // Payload: Protocol(1) + UTC(6) + Sats(1) + Lat(4) + Lng(4) + Speed(1) + Course/Status(2) + LBS(8)
  const payload = Buffer.alloc(1 + 6 + 1 + 4 + 4 + 1 + 2 + 8);
  let offset = 0;

  payload[offset++] = GT06_PROTOCOL.LOCATION;
  utcBytes.copy(payload, offset);
  offset += 6;
  payload[offset++] = data.satellites; // GPS satellites
  latBytes.copy(payload, offset);
  offset += 4;
  lngBytes.copy(payload, offset);
  offset += 4;
  payload[offset++] = data.speed;
  payload.writeUInt16BE((courseStatus << 8) | (data.course & 0xff), offset); // Course + Status
  offset += 2;
  
  // Add LBS (Location Base Station) data - required by GT06
  payload.writeUInt16BE(460, offset); // MCC (Mobile Country Code) - 460 = China, use appropriate for your region
  offset += 2;
  payload[offset++] = 0; // MNC (Mobile Network Code)
  payload.writeUInt16BE(0, offset); // LAC (Location Area Code)
  offset += 2;
  payload[offset++] = 0; // Cell ID byte 1
  payload[offset++] = 0; // Cell ID byte 2
  payload[offset++] = 0; // Cell ID byte 3

  const length = payload.length + 2 + 2; // +serial +checksum
  const serial = data.serial || 1;

  const contentBuffer = Buffer.alloc(1 + payload.length + 2);
  contentBuffer[0] = length;
  payload.copy(contentBuffer, 1);
  contentBuffer.writeUInt16BE(serial, 1 + payload.length);

  const checksum = calculateChecksum(contentBuffer);

  const packet = Buffer.alloc(2 + contentBuffer.length + 2 + 2);
  let pOffset = 0;

  packet[pOffset++] = START_BIT;
  packet[pOffset++] = START_BIT;
  contentBuffer.copy(packet, pOffset);
  pOffset += contentBuffer.length;
  packet.writeUInt16BE(checksum, pOffset);
  pOffset += 2;
  packet[pOffset++] = END_BIT;
  packet[pOffset++] = END_BIT_2;

  return packet;
}

/**
 * Build GT06 History packet (similar to Location with protocol 0x80)
 */
export function buildHistory(input: unknown): Buffer {
  const data = historySchema.parse(input);

  const utcBytes = dateToUtcBytes(data.timestamp);
  const latBytes = encodeLatitude(data.latitude);
  const lngBytes = encodeLongitude(data.longitude);
  const courseStatus = encodeCourseStatus(data.latitude, data.longitude);

  const payload = Buffer.alloc(1 + 6 + 1 + 4 + 4 + 1 + 2 + 8);
  let offset = 0;

  payload[offset++] = GT06_PROTOCOL.HISTORY;
  utcBytes.copy(payload, offset);
  offset += 6;
  payload[offset++] = data.satellites;
  latBytes.copy(payload, offset);
  offset += 4;
  lngBytes.copy(payload, offset);
  offset += 4;
  payload[offset++] = data.speed;
  payload.writeUInt16BE((courseStatus << 8) | (data.course & 0xff), offset);
  offset += 2;
  
  // Add LBS data
  payload.writeUInt16BE(460, offset); // MCC
  offset += 2;
  payload[offset++] = 0; // MNC
  payload.writeUInt16BE(0, offset); // LAC
  offset += 2;
  payload[offset++] = 0; // Cell ID
  payload[offset++] = 0;
  payload[offset++] = 0;

  const length = payload.length + 2 + 2;
  const serial = data.serial || 1;

  const contentBuffer = Buffer.alloc(1 + payload.length + 2);
  contentBuffer[0] = length;
  payload.copy(contentBuffer, 1);
  contentBuffer.writeUInt16BE(serial, 1 + payload.length);

  const checksum = calculateChecksum(contentBuffer);

  const packet = Buffer.alloc(2 + contentBuffer.length + 2 + 2);
  let pOffset = 0;

  packet[pOffset++] = START_BIT;
  packet[pOffset++] = START_BIT;
  contentBuffer.copy(packet, pOffset);
  pOffset += contentBuffer.length;
  packet.writeUInt16BE(checksum, pOffset);
  pOffset += 2;
  packet[pOffset++] = END_BIT;
  packet[pOffset++] = END_BIT_2;

  return packet;
}

