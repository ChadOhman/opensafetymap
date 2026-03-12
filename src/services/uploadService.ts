import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execute, queryOne } from '../helpers/db.js';
import type { UploadToken } from '../helpers/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'pending');

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const type = file.mimetype.startsWith('video/') ? 'video' : 'photo';
    const hex = crypto.randomBytes(16).toString('hex');
    cb(null, `${type}_${hex}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 110 * 1024 * 1024 }, // 110MB
  fileFilter: (_req, file, cb) => {
    const allowed = [...ALLOWED_PHOTO_MIMES, ...ALLOWED_VIDEO_MIMES];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export async function createUploadToken(file: Express.Multer.File): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');
  const uploadType = file.mimetype.startsWith('video/') ? 'video' : 'photo';

  await execute(
    `INSERT INTO upload_tokens (token, original_name, stored_name, mime_type, file_size, upload_type, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [token, file.originalname, file.filename, file.mimetype, file.size, uploadType, expiresAt]
  );

  return token;
}

export async function getUploadByToken(token: string): Promise<UploadToken | null> {
  return queryOne<UploadToken>(
    'SELECT * FROM upload_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );
}

export function getUploadUrl(filename: string): string {
  return `/uploads/pending/${filename}`;
}
