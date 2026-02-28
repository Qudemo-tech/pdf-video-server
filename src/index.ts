import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { upload } from './middleware/upload';
import { extractTextHandler } from './routes/extract-text';
import { convertPagesHandler } from './routes/convert-pages';
import { generateScriptHandler } from './routes/generate-script';
import { generatePageScriptsHandler } from './routes/generate-page-scripts';
import { generateVideoHandler } from './routes/generate-video';
import { videoStatusHandler } from './routes/video-status';
import { stitchVideosHandler } from './routes/stitch-videos';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '50mb' }));

// Static file serving for generated assets
const publicDir = path.join(process.cwd(), 'public');
app.use('/temp-pages', express.static(path.join(publicDir, 'temp-pages')));
app.use('/output', express.static(path.join(publicDir, 'output')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes with file upload (multer)
app.post('/api/extract-text', upload.single('file'), extractTextHandler);
app.post('/api/convert-pages', upload.single('file'), convertPagesHandler);

// Routes with JSON body
app.post('/api/generate-script', generateScriptHandler);
app.post('/api/generate-page-scripts', generatePageScriptsHandler);
app.post('/api/generate-video', generateVideoHandler);
app.get('/api/video-status', videoStatusHandler);
app.post('/api/stitch-videos', stitchVideosHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Extend timeout for long-running operations (FFmpeg, video downloads)
server.timeout = 600000; // 10 minutes
