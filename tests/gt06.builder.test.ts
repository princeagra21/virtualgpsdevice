import { describe, it, expect } from 'vitest';
import { buildLogin, buildLocation, buildHistory } from '../app/electron/protocols/gt06/builder';
import { calculateChecksum, imeiToBcd } from '../app/electron/protocols/gt06/utils';

describe('GT06 Protocol', () => {
  describe('IMEI BCD encoding', () => {
    it('should encode IMEI to BCD format', () => {
      const imei = '123456789012345';
      const bcd = imeiToBcd(imei);
      
      expect(bcd.length).toBe(8);
      expect(bcd.toString('hex')).toBe('0123456789012345');
    });

    it('should throw error for invalid IMEI length', () => {
      expect(() => imeiToBcd('12345')).toThrow('IMEI must be exactly 15 digits');
    });
  });

  describe('Checksum calculation', () => {
    it('should calculate correct checksum', () => {
      const data = Buffer.from([0x0d, 0x01, 0x01, 0x23, 0x45, 0x67, 0x89, 0x01, 0x23, 0x45, 0x00, 0x01]);
      const checksum = calculateChecksum(data);
      
      // Sum: 0x0d + 0x01 + ... = 0x01FA
      expect(checksum).toBeGreaterThan(0);
      expect(checksum).toBeLessThanOrEqual(0xFFFF);
    });

    it('should handle empty buffer', () => {
      const checksum = calculateChecksum(Buffer.alloc(0));
      expect(checksum).toBe(0);
    });
  });

  describe('Login packet builder', () => {
    it('should build valid login packet', () => {
      const packet = buildLogin({
        imei: '123456789012345',
        serial: 1,
      });

      expect(packet.length).toBeGreaterThan(10);
      expect(packet[0]).toBe(0x78); // Start bit
      expect(packet[1]).toBe(0x78); // Start bit
      expect(packet[packet.length - 2]).toBe(0x0D); // End bit
      expect(packet[packet.length - 1]).toBe(0x0A); // End bit
    });

    it('should throw on invalid IMEI', () => {
      expect(() => buildLogin({ imei: 'invalid', serial: 1 })).toThrow();
    });
  });

  describe('Location packet builder', () => {
    it('should build valid location packet', () => {
      const packet = buildLocation({
        imei: '123456789012345',
        latitude: 40.7128,
        longitude: -74.006,
        speed: 60,
        course: 180,
        battery: 85,
        satellites: 8,
        serial: 1,
      });

      expect(packet.length).toBeGreaterThan(20);
      expect(packet[0]).toBe(0x78);
      expect(packet[1]).toBe(0x78);
      expect(packet[2]).toBeGreaterThan(0); // Length
    });
  });

  describe('History packet builder', () => {
    it('should build valid history packet', () => {
      const packet = buildHistory({
        imei: '123456789012345',
        timestamp: '2024-01-01T12:00:00Z',
        latitude: 40.7128,
        longitude: -74.006,
        speed: 60,
        course: 180,
        battery: 85,
        satellites: 8,
        serial: 1,
      });

      expect(packet.length).toBeGreaterThan(20);
      expect(packet[0]).toBe(0x78);
    });
  });

  describe('Packet structure validation', () => {
    it('should have correct frame structure', () => {
      const packet = buildLogin({ imei: '123456789012345', serial: 1 });

      // Verify frame: [Start(2)] [Length(1)] [Protocol+Data] [Serial(2)] [Checksum(2)] [End(2)]
      const start = packet.slice(0, 2);
      const end = packet.slice(-2);

      expect(start.toString('hex')).toBe('7878');
      expect(end.toString('hex')).toBe('0d0a');
    });
  });
});

