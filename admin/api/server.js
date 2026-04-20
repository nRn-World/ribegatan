const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const errorHandler = require('./middleware/error-handler');
const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const mediaRoutes = require('./routes/media');

// Middleware
// CORS - tillåt både lokal utveckling, GitHub Pages och Render
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'https://robinayzit.github.io',
  'https://nrn-world.github.io',
  'https://ribegatan.onrender.com'
];

const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);

    if (isDev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parser för JSON med ökad gräns för stora HTML-filer
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logga alla requests i utvecklingsmiljö
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Root endpoint - visa hemsidan (admin finns under /admin)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../..', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);

// Contact form -> mail to styrelsen@ribegatan.se
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const contactUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMime = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.rar',
      'application/x-rar-compressed'
    ]);

    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error('Otillåten filtyp'));
    }

    cb(null, true);
  }
});

const maybeMultipartUpload = (req, res, next) => {
  if (req.is && req.is('multipart/form-data')) {
    return contactUpload.single('attachment')(req, res, next);
  }
  return next();
};

app.post('/api/contact', contactLimiter, maybeMultipartUpload, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body || {};

    const safeName = String(name || '').trim();
    const safeEmail = String(email || '').trim();
    const safeSubject = String(subject || '').trim();
    const safeMessage = String(message || '').trim();

    if (!safeName || !safeEmail || !safeSubject || !safeMessage) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(safeEmail);
    if (!emailOk) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (safeMessage.length > 1000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    let transporter = null;
    let fromAddress = smtpFrom;
    let mode = 'smtp';

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      if (!isDev) {
        return res.status(500).json({
          error: 'Email not configured',
          message: 'SMTP-miljövariabler saknas (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).'
        });
      }

      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        fromAddress = testAccount.user;
        mode = 'test';
      } catch (e) {
        mode = 'log';
      }
    } else {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
    }

    const text = [
      'Nytt meddelande från kontaktformuläret',
      '',
      `Namn: ${safeName}`,
      `E-post: ${safeEmail}`,
      `Ärende: ${safeSubject}`,
      '',
      safeMessage,
      '',
      `Tid: ${new Date().toISOString()}`
    ].join('\n');

    const mail = {
      from: fromAddress,
      to: 'styrelsen@ribegatan.se',
      subject: `[Ribegatan] ${safeSubject}`,
      text,
      replyTo: safeEmail
    };

    if (req.file) {
      mail.attachments = [{
        filename: req.file.originalname,
        content: req.file.buffer,
        contentType: req.file.mimetype
      }];
    }

    if (mode === 'log') {
      console.log('CONTACT_FORM_MESSAGE', {
        to: mail.to,
        subject: mail.subject,
        replyTo: mail.replyTo,
        text: mail.text,
        hasAttachment: Boolean(req.file),
        timestamp: new Date().toISOString()
      });
      return res.json({ ok: true, mode });
    }

    const info = await transporter.sendMail(mail);

    if (mode === 'test') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      return res.json({ ok: true, mode, previewUrl });
    }

    return res.json({ ok: true, mode });
  } catch (err) {
    return next(err);
  }
});

// Servera statiska filer från admin-mappen och root (läggs efter API så att POST /api/* aldrig fångas av static middleware)
app.use('/admin', express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '../..')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint hittades inte',
    message: `${req.method} ${req.path} finns inte`,
    availableEndpoints: ['/api/auth', '/api/content', '/api/media', '/api/contact']
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Admin CMS API Server`);
  console.log(`=================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}`);
  console.log(`=================================`);
});

module.exports = app;
