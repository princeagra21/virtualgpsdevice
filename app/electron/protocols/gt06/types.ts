import { z } from 'zod';

// GT06 Protocol Numbers
export const GT06_PROTOCOL = {
  LOGIN: 0x01,
  LOCATION: 0x12,
  HEARTBEAT: 0x13,
  STATUS: 0x14,
  HISTORY: 0x16, // History/Batch location data
} as const;

// Validation schemas
export const loginSchema = z.object({
  imei: z.string().length(15).regex(/^\d+$/, 'IMEI must be 15 digits'),
  serial: z.number().int().min(0).max(65535).optional().default(1),
});

export const locationSchema = z.object({
  imei: z.string().length(15).regex(/^\d+$/, 'IMEI must be 15 digits'),
  timestamp: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().int().min(0).max(255),
  course: z.number().int().min(0).max(359),
  battery: z.number().int().min(0).max(100),
  satellites: z.number().int().min(0).max(12),
  serial: z.number().int().min(0).max(65535).optional().default(1),
});

export const historySchema = z.object({
  imei: z.string().length(15).regex(/^\d+$/, 'IMEI must be 15 digits'),
  timestamp: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().int().min(0).max(255),
  course: z.number().int().min(0).max(359),
  battery: z.number().int().min(0).max(100),
  satellites: z.number().int().min(0).max(12),
  serial: z.number().int().min(0).max(65535).optional().default(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type HistoryInput = z.infer<typeof historySchema>;

