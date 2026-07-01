import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth.middleware';

export const uploadsRoutes = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12);
    const id = crypto.randomBytes(16).toString('hex');
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes },
});

// POST /api/uploads  (multipart form field: "file")
uploadsRoutes.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded (field name must be "file").' });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({
    url,
    name: req.file.originalname,
    size: req.file.size,
    mime: req.file.mimetype,
  });
});
