import { z } from 'zod';
import * as GT06 from './gt06/builder';
import { loginSchema, locationSchema, historySchema } from './gt06/types';
import * as Teltonika from './teltonika/builder';
import { avlDataSchema } from './teltonika/types';

export interface FieldMetadata {
  name: string;
  label: string;
  type: 'text' | 'number' | 'datetime-local';
  placeholder?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export interface PacketTypeMetadata {
  name: string;
  label: string;
  fields: FieldMetadata[];
  schema: z.ZodSchema;
  build: (input: unknown) => Buffer;
}

export interface ProtocolDriver {
  name: string;
  label: string;
  packets: Record<string, PacketTypeMetadata>;
}

// GT06 Driver
const gt06Driver: ProtocolDriver = {
  name: 'GT06',
  label: 'GT06 Protocol',
  packets: {
    Login: {
      name: 'Login',
      label: 'Login Packet',
      fields: [
        {
          name: 'imei',
          label: 'IMEI',
          type: 'text',
          placeholder: '123456789012345',
          defaultValue: '123456789012345',
          required: true,
        },
        {
          name: 'serial',
          label: 'Serial Number',
          type: 'number',
          placeholder: '1',
          defaultValue: 1,
          min: 0,
          max: 65535,
          required: false,
        },
      ],
      schema: loginSchema,
      build: GT06.buildLogin,
    },
    Location: {
      name: 'Location',
      label: 'Location Packet',
      fields: [
        {
          name: 'imei',
          label: 'IMEI',
          type: 'text',
          placeholder: '123456789012345',
          defaultValue: '123456789012345',
          required: true,
        },
        {
          name: 'timestamp',
          label: 'Timestamp (UTC)',
          type: 'datetime-local',
          placeholder: '',
          required: false,
        },
        {
          name: 'latitude',
          label: 'Latitude',
          type: 'number',
          placeholder: '40.7128',
          defaultValue: 40.7128,
          min: -90,
          max: 90,
          step: 0.000001,
          required: true,
        },
        {
          name: 'longitude',
          label: 'Longitude',
          type: 'number',
          placeholder: '-74.0060',
          defaultValue: -74.006,
          min: -180,
          max: 180,
          step: 0.000001,
          required: true,
        },
        {
          name: 'speed',
          label: 'Speed (km/h)',
          type: 'number',
          placeholder: '60',
          defaultValue: 60,
          min: 0,
          max: 255,
          required: true,
        },
        {
          name: 'course',
          label: 'Course (degrees)',
          type: 'number',
          placeholder: '180',
          defaultValue: 180,
          min: 0,
          max: 359,
          required: true,
        },
        {
          name: 'battery',
          label: 'Battery (%)',
          type: 'number',
          placeholder: '85',
          defaultValue: 85,
          min: 0,
          max: 100,
          required: true,
        },
        {
          name: 'satellites',
          label: 'Satellites',
          type: 'number',
          placeholder: '8',
          defaultValue: 8,
          min: 0,
          max: 12,
          required: true,
        },
        {
          name: 'serial',
          label: 'Serial Number',
          type: 'number',
          placeholder: '1',
          defaultValue: 1,
          min: 0,
          max: 65535,
          required: false,
        },
      ],
      schema: locationSchema,
      build: GT06.buildLocation,
    },
    History: {
      name: 'History',
      label: 'History Packet',
      fields: [
        {
          name: 'imei',
          label: 'IMEI',
          type: 'text',
          placeholder: '123456789012345',
          defaultValue: '123456789012345',
          required: true,
        },
        {
          name: 'timestamp',
          label: 'Timestamp (UTC)',
          type: 'datetime-local',
          placeholder: '',
          required: false,
        },
        {
          name: 'latitude',
          label: 'Latitude',
          type: 'number',
          placeholder: '40.7128',
          defaultValue: 40.7128,
          min: -90,
          max: 90,
          step: 0.000001,
          required: true,
        },
        {
          name: 'longitude',
          label: 'Longitude',
          type: 'number',
          placeholder: '-74.0060',
          defaultValue: -74.006,
          min: -180,
          max: 180,
          step: 0.000001,
          required: true,
        },
        {
          name: 'speed',
          label: 'Speed (km/h)',
          type: 'number',
          placeholder: '60',
          defaultValue: 60,
          min: 0,
          max: 255,
          required: true,
        },
        {
          name: 'course',
          label: 'Course (degrees)',
          type: 'number',
          placeholder: '180',
          defaultValue: 180,
          min: 0,
          max: 359,
          required: true,
        },
        {
          name: 'battery',
          label: 'Battery (%)',
          type: 'number',
          placeholder: '85',
          defaultValue: 85,
          min: 0,
          max: 100,
          required: true,
        },
        {
          name: 'satellites',
          label: 'Satellites',
          type: 'number',
          placeholder: '8',
          defaultValue: 8,
          min: 0,
          max: 12,
          required: true,
        },
        {
          name: 'serial',
          label: 'Serial Number',
          type: 'number',
          placeholder: '1',
          defaultValue: 1,
          min: 0,
          max: 65535,
          required: false,
        },
      ],
      schema: historySchema,
      build: GT06.buildHistory,
    },
  },
};

// Teltonika Driver
const teltonikaDriver: ProtocolDriver = {
  name: 'Teltonika',
  label: 'Teltonika Protocol (Codec 8)',
  packets: {
    Authentication: {
      name: 'Authentication',
      label: 'IMEI Authentication',
      fields: [
        {
          name: 'imei',
          label: 'IMEI',
          type: 'text',
          placeholder: '123456789012345',
          defaultValue: '123456789012345',
          required: true,
        },
      ],
      schema: avlDataSchema.pick({ imei: true }),
      build: Teltonika.buildAuthentication,
    },
    AVLData: {
      name: 'AVLData',
      label: 'AVL Data Packet',
      fields: [
        {
          name: 'imei',
          label: 'IMEI',
          type: 'text',
          placeholder: '123456789012345',
          defaultValue: '123456789012345',
          required: true,
        },
        {
          name: 'timestamp',
          label: 'Timestamp (UTC)',
          type: 'datetime-local',
          placeholder: '',
          required: false,
        },
        {
          name: 'latitude',
          label: 'Latitude',
          type: 'number',
          placeholder: '40.7128',
          defaultValue: 40.7128,
          min: -90,
          max: 90,
          step: 0.000001,
          required: true,
        },
        {
          name: 'longitude',
          label: 'Longitude',
          type: 'number',
          placeholder: '-74.0060',
          defaultValue: -74.006,
          min: -180,
          max: 180,
          step: 0.000001,
          required: true,
        },
        {
          name: 'altitude',
          label: 'Altitude (m)',
          type: 'number',
          placeholder: '100',
          defaultValue: 100,
          min: 0,
          max: 5000,
          required: false,
        },
        {
          name: 'angle',
          label: 'Angle (degrees)',
          type: 'number',
          placeholder: '180',
          defaultValue: 180,
          min: 0,
          max: 359,
          required: true,
        },
        {
          name: 'satellites',
          label: 'Satellites',
          type: 'number',
          placeholder: '8',
          defaultValue: 8,
          min: 0,
          max: 255,
          required: true,
        },
        {
          name: 'speed',
          label: 'Speed (km/h)',
          type: 'number',
          placeholder: '60',
          defaultValue: 60,
          min: 0,
          max: 255,
          required: true,
        },
        {
          name: 'ignition',
          label: 'Ignition',
          type: 'number',
          placeholder: '1',
          defaultValue: 1,
          min: 0,
          max: 1,
          required: false,
        },
        {
          name: 'battery',
          label: 'Battery (%)',
          type: 'number',
          placeholder: '85',
          defaultValue: 85,
          min: 0,
          max: 100,
          required: false,
        },
        {
          name: 'gsm',
          label: 'GSM Signal (0-5)',
          type: 'number',
          placeholder: '4',
          defaultValue: 4,
          min: 0,
          max: 5,
          required: false,
        },
      ],
      schema: avlDataSchema,
      build: Teltonika.buildAvlData,
    },
  },
};

// Protocol Registry
export const protocolRegistry: Record<string, ProtocolDriver> = {
  GT06: gt06Driver,
  Teltonika: teltonikaDriver,
};

export function getProtocolDriver(protocol: string): ProtocolDriver | undefined {
  return protocolRegistry[protocol];
}

export function listProtocols(): string[] {
  return Object.keys(protocolRegistry);
}

