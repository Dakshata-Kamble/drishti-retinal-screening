import Database from 'better-sqlite3';
import crypto from 'crypto';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// ── Encryption (AES-256-GCM) ────────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Get or generate an encryption key. In production, this MUST come from env/KMS.
let ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
  console.warn('WARN: Using a generated fallback encryption key. In production, set ENCRYPTION_KEY (64 hex chars).');
  ENCRYPTION_KEY_HEX = crypto.randomBytes(32).toString('hex');
  process.env.ENCRYPTION_KEY = ENCRYPTION_KEY_HEX;
}
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Zod Schemas for Validation ───────────────────────────────────────────────
export const PatientSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameLocal: z.string().optional(),
  age: z.number().int().nonnegative(),
  gender: z.enum(['Male', 'Female', 'Other']),
  abhaId: z.string().optional().nullable(),
  mobile: z.string(),
  village: z.string(),
  rationId: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  diabetesStatus: z.string(),
  diabetesDuration: z.string().optional().nullable(),
  rbs: z.string(),
  rbsStatus: z.enum(['Normal', 'Elevated', 'Critical']),
  bp: z.string(),
  visionComplaint: z.string(),
  previousHistory: z.string(),
  screenTime: z.string(),
  odScanUrl: z.string().optional().nullable(),
  osScanUrl: z.string().optional().nullable(),
  gradCamUrl: z.string().optional().nullable(),
  odStatus: z.string().optional().nullable(),
  osStatus: z.string().optional().nullable(),
  aiDiagnosis: z.string().optional().nullable(),
  aiConfidence: z.string().optional().nullable(),
  riskLevel: z.enum(['Normal', 'Mild', 'High Risk', 'Critical', 'Incomplete']),
  triageStatus: z.string().optional().nullable(),
  syncStatus: z.enum(['synced', 'queued']),
  csmeDetected: z.boolean().optional().nullable(),
  microaneurysmsCount: z.number().int().optional().nullable(),
  hardExudatesNote: z.string().optional().nullable(),
  neovascularization: z.boolean().optional().nullable(),
});

export type DbPatient = z.infer<typeof PatientSchema>;

// ── Database Setup & Migrations ──────────────────────────────────────────────
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const dbPath = path.join(dbDir, 'drishti.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Simple migration system
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    sync_status TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── CRUD Operations ──────────────────────────────────────────────────────────
export function savePatient(patient: DbPatient) {
  const validated = PatientSchema.parse(patient);
  // Encrypt the entire payload except id and syncStatus (which are used for queries)
  const encryptedPayload = encrypt(JSON.stringify(validated));
  
  const stmt = db.prepare(`
    INSERT INTO patients (id, encrypted_data, sync_status, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      encrypted_data = excluded.encrypted_data,
      sync_status = excluded.sync_status,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  stmt.run(validated.id, encryptedPayload, validated.syncStatus);
  return validated;
}

export function getAllPatients(): DbPatient[] {
  const rows = db.prepare('SELECT id, encrypted_data, sync_status FROM patients ORDER BY updated_at DESC').all() as any[];
  return rows.map(row => {
    try {
      const decrypted = decrypt(row.encrypted_data);
      return JSON.parse(decrypted);
    } catch (err) {
      console.error('Failed to decrypt/parse patient record', row.id, err);
      return null;
    }
  }).filter(p => p !== null);
}

export function getPatient(id: string): DbPatient | null {
  const row = db.prepare('SELECT encrypted_data FROM patients WHERE id = ?').get(id) as any;
  if (!row) return null;
  try {
    const decrypted = decrypt(row.encrypted_data);
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Failed to decrypt/parse patient record', id, err);
    return null;
  }
}
