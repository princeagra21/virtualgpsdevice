import { z } from 'zod';

// Teltonika Codec 8 Protocol Constants
export const TELTONIKA_CODEC = {
  CODEC_8: 0x08,
  CODEC_8E: 0x8e,
} as const;

// AVL Data packet schema
export const avlDataSchema = z.object({
  imei: z.string().length(15).regex(/^\d+$/, 'IMEI must be 15 digits'),
  timestamp: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().int().min(0).max(5000).optional().default(100),
  angle: z.number().int().min(0).max(359),
  satellites: z.number().int().min(0).max(255),
  speed: z.number().int().min(0).max(255),
  eventId: z.number().int().min(0).max(255).optional().default(0),
  // I/O Elements
  ignition: z.boolean().optional().default(true),
  battery: z.number().int().min(0).max(100).optional().default(85),
  gsm: z.number().int().min(0).max(5).optional().default(4),
});

export type AvlDataInput = z.infer<typeof avlDataSchema>;

