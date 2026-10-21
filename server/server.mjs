// Mock catalogue API. No dependencies: npm start
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 4000);
const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, 'data', 'catalog.json'), 'utf8'));
const sessions = [...catalog.sessions];
const videosById = new Map(catalog.videos.map((v) => [v.id, v]));
const headsetIds = new Set(catalog.headsets.map((h) => h.id));
const audienceIds = new Set(catalog.audiences.map((a) => a.id));
const jobsByCode = new Map(catalog.jobs.map((j) => [j.code, j]));

// Seeded so that a fresh server always behaves the same way.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(Number(process.env.SEED ?? 42));

const latency = () => (rand() < 0.1 ? 2000 + rand() * 2500 : 150 + rand() * 750);
const ERROR_RATE = { read: 0.08, write: 0.25 };

class HttpError extends Error {
  constructor(status, body) {
    super(body.message ?? body.error);
    this.status = status;
    this.body = body;
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { ...CORS, 'Content-Type': type, 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new HttpError(400, { error: 'invalid_json', message: 'Request body is not valid JSON.' }));
      }
    });
  });
}

function paginate(list, params) {
  const page = Number(params.get('page') ?? 1);
  const perPage = Number(params.get('per_page') ?? 24);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    throw new HttpError(400, { error: 'invalid_parameter', message: 'page must be >= 1 and per_page between 1 and 100' });
  }
  return {
    data: list.slice((page - 1) * perPage, page * perPage),
    meta: { page, per_page: perPage, total: list.length, total_pages: Math.max(1, Math.ceil(list.length / perPage)) },
  };
}

function withThumbnail(video, origin) {
  return { ...video, thumbnail_url: video.thumbnail_url && origin + video.thumbnail_url };
}

function listVideos(params, origin) {
  const q = params.get('q')?.trim().toLowerCase();
  const job = params.get('job');
  const headset = params.get('headset');
  const audience = params.get('audience');
  const list = catalog.videos.filter(
    (v) =>
      (!q || v.title.toLowerCase().includes(q)) &&
      (!job || v.jobs.includes(job)) &&
      (!headset || v.compatible_headsets.includes(headset)) &&
      (!audience || v.audiences.includes(audience)),
  );
  const result = paginate(list, params);
  return { ...result, data: result.data.map((v) => withThumbnail(v, origin)) };
}

function validateSession(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, { error: 'invalid_json', message: 'Request body must be a JSON object.' });
  }
  const details = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) details.push({ field: 'name', message: 'Le nom est obligatoire.' });
  else if (name.length > 120) details.push({ field: 'name', message: 'Le nom ne doit pas dépasser 120 caractères.' });
  if (!Array.isArray(body.video_ids) || body.video_ids.length === 0) {
    details.push({ field: 'video_ids', message: 'Au moins une vidéo est requise.' });
  } else if (body.video_ids.length > 30) {
    details.push({ field: 'video_ids', message: 'Une séance contient au plus 30 vidéos.' });
  } else {
    const unknown = body.video_ids.filter((id) => !videosById.has(id));
    if (unknown.length) details.push({ field: 'video_ids', message: `Vidéos inconnues : ${unknown.join(', ')}` });
  }
  if (body.headset_id != null && !headsetIds.has(body.headset_id)) {
    details.push({ field: 'headset_id', message: 'Modèle de casque inconnu.' });
  }
  if (details.length) throw new HttpError(422, { error: 'validation_error', message: 'Invalid session.', details });
  return { name, video_ids: body.video_ids, headset_id: body.headset_id ?? null };
}

function sessionView(s) {
  return { ...s, total_duration_seconds: s.video_ids.reduce((t, id) => t + (videosById.get(id)?.duration_seconds ?? 0), 0) };
}

const PALETTE = { A: '#2f7d4f', D: '#b5562b', F: '#8a6d1d', G: '#a23b5c', H: '#4a5a8c', I: '#3d6f8f', J: '#2c7a7b', K: '#6b4c9a', M: '#3f5f4f', N: '#7a4e2d', E: '#8c3f8c', L: '#5c5c5c' };
const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

function thumbnail(video) {
  const color = PALETTE[video.jobs[0].charAt(0)] ?? '#555';
  const words = video.title.split(' ');
  const lines = [''];
  for (const w of words) {
    if ((lines.at(-1) + ' ' + w).trim().length > 28) lines.push(w);
    else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim();
  }
  const text = lines.slice(0, 3).map((l, i) => `<text x="32" y="${250 + i * 36 - (lines.length - 1) * 18}" font-size="30" font-family="sans-serif" fill="#fff">${escapeXml(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#111"/></linearGradient></defs>
<rect width="640" height="360" fill="url(#g)"/>
<circle cx="560" cy="70" r="40" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>
<text x="560" y="80" font-size="26" font-family="sans-serif" fill="#fff" text-anchor="middle">360°</text>
${text}
</svg>`;
}

async function route(req, url, origin) {
  const p = url.pathname;
  const m = (re) => p.match(re);
  let match;

  if (req.method === 'GET' && (match = m(/^\/thumbnails\/(vid_\d+)\.svg$/))) {
    const v = videosById.get(match[1]);
    if (!v || !v.thumbnail_url) throw new HttpError(404, { error: 'not_found' });
    return { status: 200, body: thumbnail(v), type: 'image/svg+xml' };
  }
  if (req.method === 'GET' && p === '/health') return { status: 200, body: { status: 'ok' } };

  await new Promise((r) => setTimeout(r, latency()));
  const write = req.method === 'POST';
  if (p !== '/headsets' && p !== '/audiences' && rand() < ERROR_RATE[write ? 'write' : 'read']) {
    throw new HttpError(500, { error: 'internal_error', message: 'An unexpected error occurred.' });
  }

  if (req.method === 'GET' && p === '/videos') return { status: 200, body: listVideos(url.searchParams, origin) };
  if (req.method === 'GET' && (match = m(/^\/videos\/([\w-]+)$/))) {
    const v = videosById.get(match[1]);
    if (!v) throw new HttpError(404, { error: 'not_found', message: 'Video not found.' });
    return { status: 200, body: withThumbnail(v, origin) };
  }
  if (req.method === 'GET' && p === '/jobs') return { status: 200, body: { data: catalog.jobs, source: catalog.source } };
  if (req.method === 'GET' && (match = m(/^\/jobs\/([A-Z]\d{4})$/))) {
    const j = jobsByCode.get(match[1]);
    if (!j) throw new HttpError(404, { error: 'not_found', message: 'Job not found.' });
    return { status: 200, body: j };
  }
  if (req.method === 'GET' && p === '/headsets') return { status: 200, body: { data: catalog.headsets } };
  if (req.method === 'GET' && p === '/audiences') return { status: 200, body: { data: catalog.audiences } };
  if (req.method === 'GET' && p === '/sessions') {
    return { status: 200, body: { data: [...sessions].reverse().map(sessionView) } };
  }
  if (req.method === 'GET' && (match = m(/^\/sessions\/([\w-]+)$/))) {
    const s = sessions.find((x) => x.id === match[1]);
    if (!s) throw new HttpError(404, { error: 'not_found', message: 'Session not found.' });
    return { status: 200, body: sessionView(s) };
  }
  if (req.method === 'POST' && p === '/sessions') {
    const input = validateSession(await readJson(req));
    const session = { id: `ses_${String(sessions.length + 1).padStart(3, '0')}`, ...input, created_at: new Date().toISOString() };
    sessions.push(session);
    return { status: 201, body: sessionView(session) };
  }
  throw new HttpError(404, { error: 'not_found' });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const origin = `http://${req.headers.host ?? `localhost:${PORT}`}`;
  const started = Date.now();
  res.on('finish', () => console.log(`${req.method} ${url.pathname}${url.search} -> ${res.statusCode} (${Date.now() - started} ms)`));
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }
  try {
    const { status, body, type } = await route(req, url, origin);
    send(res, status, body, type);
  } catch (e) {
    if (e instanceof HttpError) send(res, e.status, e.body);
    else send(res, 500, { error: 'internal_error', message: 'An unexpected error occurred.' });
  }
});

server.listen(PORT, () => console.log(`Catalogue API listening on http://localhost:${PORT}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
