// /server/src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ============ Config ============ */
const {
  PORT = 8080,
  CORS_ORIGIN = '*',
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_TO, NOTIFY_FROM,
  S3_ENABLED = 'false', S3_REGION, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
  SIGNED_URL_TTL_SECONDS = '86400'
} = process.env;

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: CORS_ORIGIN }));
app.use(rateLimit({ windowMs: 60_000, max: 5 }));

/* ============ Uploads ============ */
const MAX_FILE_MB = 10;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 12 },
  fileFilter(req, file, cb) {
    const okCV = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const okCert = ['application/pdf','image/png','image/jpeg'];
    if (file.fieldname === 'cv' && okCV.includes(file.mimetype)) return cb(null, true);
    if (file.fieldname === 'certificates[]' && okCert.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.fieldname} ${file.mimetype}`));
  }
});
const fields = upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'certificates[]', maxCount: 10 }]);

/* ============ Validation ============ */
const MetaSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(4),
  role: z.string().min(2),
  experience_years: z.number().int().nonnegative().nullable().optional(),
  location: z.string().nullable().optional(),
  portfolio_url: z.string().url().nullable().optional(),
  instagram: z.string().nullable().optional(),
  videos: z.array(z.string().url()).max(3),
  cover_note: z.string().nullable().optional(),
  certificates_count: z.number().int().min(0).max(10),
  consent: z.boolean().refine(Boolean, 'Consent is required'),
  submitted_at: z.string()
});

/* ============ Storage ============ */
const useS3 = S3_ENABLED === 'true';
const s3 = useS3 ? new S3Client({
  region: S3_REGION || 'auto',
  endpoint: S3_ENDPOINT || undefined,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID || '', secretAccessKey: S3_SECRET_ACCESS_KEY || '' }
}) : null;

const localDir = path.join(__dirname, '..', 'uploads');
if (!useS3) fs.mkdirSync(localDir, { recursive: true });

async function storeFile(file, keyPrefix) {
  const ext = mime.extension(file.mimetype) || 'bin';
  const key = `${keyPrefix}/${uuidv4()}.${ext}`;
  if (useS3 && s3) {
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype, ACL: 'private' }));
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn: Number(SIGNED_URL_TTL_SECONDS) });
    return { storage: 's3', key, signedUrl };
  } else {
    const abs = path.join(localDir, key);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, file.buffer);
    return { storage: 'local', key, url: `/uploads/${key}` };
  }
}

/* ============ Email ============ */
const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

/* ============ Routes ============ */
app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/api/careers/apply', fields, async (req, res) => {
  try {
    let meta;
    try {
      meta = JSON.parse(req.body.meta || '{}');
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid meta JSON' });
    }
    if (typeof meta.experience_years === 'string' && meta.experience_years !== '') {
      meta.experience_years = Number(meta.experience_years);
    }
    if (!Array.isArray(meta.videos)) meta.videos = [];
    meta.certificates_count = (req.files?.['certificates[]'] || []).length;

    const ok = MetaSchema.safeParse(meta);
    if (!ok.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ok.error.flatten() });
    }

    const cv = (req.files?.cv || [])[0];
    if (!cv) return res.status(400).json({ success: false, error: 'CV file is required' });

    const certs = req.files?.['certificates[]'] || [];
    const batch = uuidv4();
    const prefix = `careers/${new Date().toISOString().slice(0,10)}/${batch}`;

    const storedCV = await storeFile(cv, `${prefix}/cv`);
    const storedCerts = [];
    for (const c of certs) storedCerts.push(await storeFile(c, `${prefix}/certs`));

    const lines = [
      `New Careers Application`,
      `Name: ${meta.full_name}`,
      `Email: ${meta.email}`,
      `Phone: ${meta.phone}`,
      `Role: ${meta.role}`,
      `Experience: ${meta.experience_years ?? 'n/a'} years`,
      `Location: ${meta.location ?? 'n/a'}`,
      `Portfolio: ${meta.portfolio_url ?? 'n/a'}`,
      `Instagram: ${meta.instagram ?? 'n/a'}`,
      `Videos: ${meta.videos.length ? meta.videos.join(', ') : 'n/a'}`,
      `CV: ${useS3 ? storedCV.signedUrl : storedCV.url}`,
      `Certificates (${storedCerts.length}):`,
      ...storedCerts.map((s, i) => `  ${i+1}. ${useS3 ? s.signedUrl : s.url}`),
      ``,
      `Cover Note:`,
      `${meta.cover_note ?? '—'}`
    ];

    if (NOTIFY_TO) {
      await mailer.sendMail({
        from: NOTIFY_FROM || SMTP_USER,
        to: NOTIFY_TO,
        subject: `Careers: ${meta.role} — ${meta.full_name}`,
        text: lines.join('\n')
      });
    }

    res.json({
      success: true,
      id: batch,
      files: {
        cv: useS3 ? storedCV.signedUrl : storedCV.url,
        certificates: storedCerts.map(s => useS3 ? s.signedUrl : s.url)
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* serve local uploads if not using S3 (optional) */
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.listen(PORT, () => {
  console.log(`[careers-api] listening on :${PORT}`);
});
