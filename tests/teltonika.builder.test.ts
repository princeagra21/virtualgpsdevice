import { describe, it, expect } from 'vitest';
import { buildAuthentication, buildAvlData } from '../app/electron/protocols/teltonika/builder';
import { calculateCRC16, encodeCoordinate, dateToTeltonikaTimestamp } from '../app/electron/protocols/teltonika/utils';

describe('Teltonika Protocol', () => {
  describe('Coordinate encoding', () => {
    it('should encode coordinates correctly', () => {
      expect(encodeCoordinate(40.7128)).toBe(407128000);
      expect(encodeCoordinate(-74.006)).toBe(-740060000);
      expect(encodeCoordinate(0)).toBe(0);
    });
  });

  describe('Timestamp conversion', () => {
    it('should convert timestamp to Teltonika epoch', () => {
      const timestamp = dateToTeltonikaTimestamp('2024-01-01T00:00:00Z');
      expect(timestamp).toBeGreaterThan(0n);
      
      // Teltonika epoch starts at 2000-01-01, so 2024 should be ~757M milliseconds
      expect(Number(timestamp)).toBeGreaterThan(757000000000);
    });
  });

  describe('CRC16 calculation', () => {
    it('should calculate correct CRC16', () => {
      const data = Buffer.from([0x08, 0x01, 0x00, 0x00]);
      const crc = calculateCRC16(data);
      
      expect(crc).toBeGreaterThan(0);
      expect(crc).toBeLessThanOrEqual(0xFFFF);
    });

    it('should handle empty buffer', () => {
      const crc = calculateCRC16(Buffer.alloc(0));
      expect(crc).toBe(0);
    });
  });

  describe('Authentication packet builder', () => {
    it('should build valid authentication packet', () => {
      const packet = buildAuthentication({
        imei: '123456789012345',
      });

      // Structure: [IMEI Length (2)] [IMEI (15)]
      expect(packet.length).toBe(17);
      
      // Check IMEI length
      const imeiLength = packet.readUInt16BE(0);
      expect(imeiLength).toBe(15);
      
      // Check IMEI content
      const imei = packet.slice(2, 17).toString('ascii');
      expect(imei).toBe('123456789012345');
    });

    it('should throw on invalid IMEI', () => {
      expect(() => buildAuthentication({ imei: 'invalid' })).toThrow();
      expect(() => buildAuthentication({ imei: '12345' })).toThrow();
    });
  });

  describe('AVL Data packet builder', () => {
    it('should build valid AVL packet', () => {
      const packet = buildAvlData({
        imei: '123456789012345',
        timestamp: '2024-01-01T12:00:00Z',
        latitude: 40.7128,
        longitude: -74.006,
        altitude: 100,
        angle: 180,
        satellites: 8,
        speed: 60,
        ignition: true,
        battery: 85,
        gsm: 4,
        eventId: 0,
      });

      expect(packet.length).toBeGreaterThan(50);
      
      // Check preamble (4 zero bytes)
      expect(packet.readUInt32BE(0)).toBe(0);
      
      // Check data length field exists
      const dataLength = packet.readUInt32BE(4);
      expect(dataLength).toBeGreaterThan(0);
      
      // Check Codec ID (position 8)
      expect(packet[8]).toBe(0x08); // Codec 8
      
      // Check record count (position 9)
      expect(packet[9]).toBe(0x01); // 1 record
    });

    it('should handle all required fields', () => {
      const packet = buildAvlData({
        imei: '123456789012345',
        latitude: 40.7128,
        longitude: -74.006,
        angle: 180,
        satellites: 8,
        speed: 60,
      });

      expect(packet.length).toBeGreaterThan(0);
      expect(packet[8]).toBe(0x08); // Codec 8
    });

    it('should include CRC at the end', () => {
      const packet = buildAvlData({
        imei: '123456789012345',
        latitude: 40.7128,
        longitude: -74.006,
        angle: 180,
        satellites: 8,
        speed: 60,
      });

      // CRC is last 4 bytes
      const crc = packet.readUInt32BE(packet.length - 4);
      expect(crc).toBeGreaterThan(0);
    });
  });

  describe('Packet structure validation', () => {
    it('should have correct AVL packet structure', () => {
      const packet = buildAvlData({
        imei: '123456789012345',
        latitude: 40.7128,
        longitude: -74.006,
        angle: 180,
        satellites: 8,
        speed: 60,
      });

      // Preamble check
      const preamble = packet.slice(0, 4);
      expect(preamble.every(b => b === 0)).toBe(true);

      // Data length check
      const dataLength = packet.readUInt32BE(4);
      expect(dataLength).toBe(packet.length - 8 - 4); // Total - preamble - length field - CRC
    });
  });
});

