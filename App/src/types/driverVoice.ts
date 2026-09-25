export type VoiceStepState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'READY'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SHOWING_RESULT'
  | 'CONFIRMING'
  | 'EDITING'
  | 'SAVING'
  | 'COMPLETED'
  | 'ERROR';

export type FieldKey = 'name' | 'licenseNumber' | 'licenseExpiry' | 'contact';

export type FieldType = 'text' | 'license' | 'expiry' | 'phone';

export interface VoiceFieldConfig {
  key: FieldKey;
  label: string;
  question: string;
  placeholder: string;
  type: FieldType;
  required: boolean;
  exampleSpoken: string;
}

export interface DriverVoiceFormData {
  name: string;
  licenseNumber: string;
  licenseExpiry: string;
  contact: string;
  tripsCompleted: number;
  safetyScore: number;
  status: string;
}

export const DEFAULT_DRIVER_VOICE_FIELDS: VoiceFieldConfig[] = [
  {
    key: 'name',
    label: "Driver Name",
    question: "What is the driver's full name?",
    placeholder: "e.g. Rahul Patel",
    type: 'text',
    required: true,
    exampleSpoken: 'Say "Rahul Patel"',
  },
  {
    key: 'licenseNumber',
    label: "Driving Licence Number",
    question: "What is the driving licence number?",
    placeholder: "e.g. DL-01-2028-1234567",
    type: 'license',
    required: true,
    exampleSpoken: 'Say "DL 01 2028 1234567"',
  },
  {
    key: 'licenseExpiry',
    label: "Licence Expiry Date",
    question: "What is the licence expiry date?",
    placeholder: "e.g. 12/2028",
    type: 'expiry',
    required: true,
    exampleSpoken: 'Say "December 2028" or "12 2028"',
  },
  {
    key: 'contact',
    label: "Contact Phone Number",
    question: "What is the driver's contact phone number?",
    placeholder: "e.g. 9876543210",
    type: 'phone',
    required: true,
    exampleSpoken: 'Say "9 8 7 6 5 4 3 2 1 0"',
  },
];
