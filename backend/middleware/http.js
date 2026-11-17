import { jwtVerify } from 'jose';
import { config } from '../config/env.js';
import { HttpError } from '../services/crud.js';

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && config().allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

export async function authenticate(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) throw new HttpError(401, 'Not authenticated');
  try {
    const { payload } = await jwtVerify(m[1], new TextEncoder().encode(config().jwtSecret), { algorithms: ['HS256'], issuer: 'pcc' });
    return payload.sub;
  } catch { throw new HttpError(401, 'Session expired'); }
}

// Wraps every endpoint: CORS, method check, optional auth, uniform error handling (no stack traces leaked).
export function route({ methods, auth = true }, fn) {
  return async (req, res) => {
    try {
      cors(req, res);
      if (req.method === 'OPTIONS') return res.status(204).end();
      if (!methods.includes(req.method)) throw new HttpError(405, 'Method not allowed');
      const userId = auth ? await authenticate(req) : null;
      const out = await fn(req, userId);
      res.status(out.status ?? 200).json(out.body ?? {});
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.extra });
      const m = { '23514': [400, 'A value violates a database rule'], '23503': [400, 'Referenced record does not exist'], '23505': [409, 'Duplicate record'], '22P02': [400, 'Invalid value'] }[err.code];
      if (m) return res.status(m[0]).json({ error: m[1] });
      console.error('Unhandled error', err.code, err.message);
      res.status(500).json({ error: 'Server error: ' + String(err.message).slice(0, 200) });
    }
  };
}
