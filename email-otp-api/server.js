import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';

const {
  PORT = '8080',
  ALLOWED_ORIGINS = '',
  AGENTMAIL_BASE_URL = 'https://api.agentmail.to/v0',
  AGENTMAIL_INBOX = 'jackbot@agentmail.to',
  AGENTMAIL_API_KEY,
  OTP_PEPPER,
  OTP_TTL_SECONDS = '600',
  OTP_COOLDOWN_SECONDS = '45',
  OTP_MAX_ATTEMPTS = '5',
  OTP_HOURLY_LIMIT = '8',
} = process.env;

if (!AGENTMAIL_API_KEY) {
  throw new Error('Missing AGENTMAIL_API_KEY environment variable.');
}

if (!OTP_PEPPER) {
  throw new Error('Missing OTP_PEPPER environment variable.');
}

const OTP_TTL_MS = Number(OTP_TTL_SECONDS) * 1000;
const OTP_COOLDOWN_MS = Number(OTP_COOLDOWN_SECONDS) * 1000;
const OTP_MAX_ATTEMPTS_INT = Number(OTP_MAX_ATTEMPTS);
const OTP_HOURLY_LIMIT_INT = Number(OTP_HOURLY_LIMIT);
const OTP_WINDOW_MS = 60 * 60 * 1000;

// NOTE: In-memory OTP store. If the Cloud Run instance restarts,
// pending OTP requests are invalidated and users must request a new code.
const otpRequests = new Map();
const emailMeta = new Map();

const app = express();
app.set('trust proxy', true);

const allowedOrigins = ALLOWED_ORIGINS.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy.'));
    },
  }),
);

app.use(express.json({ limit: '16kb' }));

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function maskEmail(email) {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return email;

  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function hashForOtp(email, code) {
  return crypto.createHash('sha256').update(`${OTP_PEPPER}:${email}:${code}`).digest('hex');
}

function safeCompareHex(a, b) {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

function numericOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getRequesterIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || 'unknown';
}

function cleanupExpiredOtps() {
  const nowMs = Date.now();

  for (const [requestId, record] of otpRequests.entries()) {
    if (record.expiresAt <= nowMs || record.status !== 'pending') {
      otpRequests.delete(requestId);
      if (record?.email) {
        const meta = emailMeta.get(record.email);
        if (meta?.activeRequestId === requestId) {
          meta.activeRequestId = null;
          emailMeta.set(record.email, meta);
        }
      }
    }
  }

  for (const [email, meta] of emailMeta.entries()) {
    const lastSeen = Math.max(meta.lastRequestAt || 0, meta.lastVerifiedAt || 0);
    if (!meta.activeRequestId && nowMs - lastSeen > 24 * 60 * 60 * 1000) {
      emailMeta.delete(email);
    }
  }
}

setInterval(cleanupExpiredOtps, 60_000).unref();

async function sendAgentMailOtp(email, code) {
  const url = `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(AGENTMAIL_INBOX)}/messages/send`;

  const subject = 'Your Pelayo Wellness verification code';
  const text = [
    `Your Pelayo Wellness verification code is: ${code}`,
    '',
    `This code expires in ${Math.round(OTP_TTL_MS / 60000)} minutes.`,
    'If you did not request this code, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin-bottom:0.25rem;">Pelayo Wellness verification</h2>
      <p style="margin-top:0;">Use this code to continue:</p>
      <p style="font-size:2rem;font-weight:700;letter-spacing:0.25rem;margin:1rem 0;">${code}</p>
      <p>This code expires in <strong>${Math.round(OTP_TTL_MS / 60000)} minutes</strong>.</p>
      <p>If you did not request this code, you can safely ignore this message.</p>
    </div>
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [email],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AgentMail send failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  return response.json().catch(() => ({}));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pelayo-email-otp-api' });
});

app.post('/v1/email-otp/request', async (req, res) => {
  const nowMs = Date.now();
  const email = normalizeEmail(req.body?.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address.' });
  }

  const meta = emailMeta.get(email) || {
    lastRequestAt: 0,
    windowStartAt: nowMs,
    windowCount: 0,
    activeRequestId: null,
    lastVerifiedAt: 0,
  };

  const cooldownRemainingMs = Math.max(0, OTP_COOLDOWN_MS - (nowMs - (meta.lastRequestAt || 0)));
  if (cooldownRemainingMs > 0) {
    const retryAfterSeconds = Math.ceil(cooldownRemainingMs / 1000);
    return res.status(429).json({
      ok: false,
      error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
      retryAfterSeconds,
    });
  }

  if (nowMs - meta.windowStartAt > OTP_WINDOW_MS) {
    meta.windowStartAt = nowMs;
    meta.windowCount = 0;
  }

  if (meta.windowCount >= OTP_HOURLY_LIMIT_INT) {
    const retryAfterSeconds = Math.ceil((meta.windowStartAt + OTP_WINDOW_MS - nowMs) / 1000);
    return res.status(429).json({
      ok: false,
      error: 'Too many verification requests. Please try again later.',
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    });
  }

  const requestId = crypto.randomUUID();
  const code = numericOtp();

  const otpRecord = {
    requestId,
    email,
    codeHash: hashForOtp(email, code),
    attempts: 0,
    status: 'pending',
    createdAt: nowMs,
    expiresAt: nowMs + OTP_TTL_MS,
    requesterIp: getRequesterIp(req),
    senderInbox: AGENTMAIL_INBOX,
  };

  try {
    await sendAgentMailOtp(email, code);

    otpRequests.set(requestId, otpRecord);

    meta.lastRequestAt = nowMs;
    meta.windowCount += 1;
    meta.activeRequestId = requestId;
    emailMeta.set(email, meta);

    return res.json({
      ok: true,
      requestId,
      expiresInSeconds: Math.round(OTP_TTL_MS / 1000),
      maskedEmail: maskEmail(email),
    });
  } catch (error) {
    console.error('OTP send failed:', error);
    return res.status(502).json({ ok: false, error: 'Unable to send verification email right now.' });
  }
});

app.post('/v1/email-otp/verify', (req, res) => {
  const nowMs = Date.now();

  const email = normalizeEmail(req.body?.email);
  const requestId = String(req.body?.requestId || '').trim();
  const code = String(req.body?.code || '').trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address.' });
  }

  if (!requestId || requestId.length < 10) {
    return res.status(400).json({ ok: false, error: 'Missing verification request. Please request a new code.' });
  }

  if (!/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ ok: false, error: 'Enter the 4–8 digit verification code.' });
  }

  const meta = emailMeta.get(email);
  const otp = otpRequests.get(requestId);

  if (!meta || !otp) {
    return res.status(400).json({ ok: false, error: 'Code is invalid or expired. Request a new one.' });
  }

  if (meta.activeRequestId !== requestId) {
    return res.status(400).json({ ok: false, error: 'That code is no longer active. Request a new one.' });
  }

  if (otp.email !== email) {
    return res.status(400).json({ ok: false, error: 'Code does not match this email address.' });
  }

  if (otp.status !== 'pending') {
    return res.status(400).json({ ok: false, error: 'Code has already been used. Request a new one.' });
  }

  if (nowMs > otp.expiresAt) {
    otp.status = 'expired';
    otpRequests.delete(requestId);
    meta.activeRequestId = null;
    emailMeta.set(email, meta);
    return res.status(400).json({ ok: false, error: 'Code expired. Request a new one.' });
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS_INT) {
    otp.status = 'locked';
    otpRequests.delete(requestId);
    meta.activeRequestId = null;
    emailMeta.set(email, meta);
    return res.status(429).json({ ok: false, error: 'Too many failed attempts. Request a new code.' });
  }

  const providedHash = hashForOtp(email, code);
  const valid = safeCompareHex(providedHash, otp.codeHash);

  if (!valid) {
    otp.attempts += 1;

    if (otp.attempts >= OTP_MAX_ATTEMPTS_INT) {
      otp.status = 'locked';
      otpRequests.delete(requestId);
      meta.activeRequestId = null;
      emailMeta.set(email, meta);
      return res.status(429).json({ ok: false, error: 'Too many failed attempts. Request a new code.' });
    }

    otpRequests.set(requestId, otp);
    return res.status(400).json({ ok: false, error: 'Invalid code. Please try again.' });
  }

  otp.status = 'verified';
  otp.verifiedAt = nowMs;
  otpRequests.delete(requestId);

  meta.activeRequestId = null;
  meta.lastVerifiedAt = nowMs;
  emailMeta.set(email, meta);

  return res.json({ ok: true, verified: true });
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed by CORS policy.') {
    return res.status(403).json({ ok: false, error: 'This origin is not allowed.' });
  }

  console.error('Unhandled API error:', err);
  return res.status(500).json({ ok: false, error: 'Unexpected server error.' });
});

app.listen(Number(PORT), () => {
  console.log(`pelayo-email-otp-api listening on :${PORT}`);
});
