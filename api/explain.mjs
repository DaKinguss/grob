/* /api/explain — right-click explanations through Google Gemini (Vercel serverless function).
   Env: GEMINI_API_KEY (required), GEMINI_MODEL (optional, tried first).
   Fixed system prompt, same-origin check, 30 000-character prompt limit. */

const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
const MAX_PROMPT = 30000;

const SYSTEM = lang =>
  'You are a senior CNC applications engineer explaining NC programs to machinists and CAM programmers. ' +
  'The control is a Siemens SINUMERIK 840D sl on GROB 5-axis universal machining centres (G-series: ' +
  'swivel axis A, rotary table B). Explain precisely what the given block(s) do, using the documented ' +
  'SINUMERIK behaviour (R parameters, DEF, frames TRANS/ROT/AROT/MIRROR/SCALE, CYCLE800 swivel, TRAORI, ' +
  'ORIWKS/ORIAXES, CYCLE832, drilling and milling cycles, SUPA, G0/G1/G2/G3, CIP, CT). Use the machine state ' +
  'provided (tool, feed, spindle, work offset, compensation, plane, frame) to say what happens here. ' +
  'Point out anything risky or unusual (rapid moves near the part, missing coolant or spindle, comp not ' +
  'cancelled, swivel without retract, feed or speed that looks wrong) only when there is a real reason. ' +
  'If a code or cycle is GROB- or machine-specific, say so instead of guessing. Be concise: a single block in ' +
  'under 120 words, a section in under 250. ' +
  (lang === 'ro' ? 'Answer in Romanian, keeping the NC codes as written.' : 'Answer in English.');

/* the function answers only on the site's own addresses (not on preview deployments or copies) */
const ALLOWED = (process.env.CNC_ALLOWED_HOSTS || 'sosgrob.vercel.app')
  .split(',').map(h => h.trim().toLowerCase()).filter(Boolean).concat(['localhost', '127.0.0.1']);
function allowedHost(h) {
  h = String(h || '').toLowerCase().replace(/:\d+$/, '');
  return ALLOWED.some(a => a === h || (a.startsWith('*.') && h.endsWith(a.slice(1))));
}
function sameOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const src = req.headers.origin || req.headers.referer;
  if (!host || !src) return false;
  try { const u = new URL(src); return u.host === host && allowedHost(u.hostname); } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST only' }); }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Not allowed from this origin' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(501).json({ error: 'GEMINI_API_KEY is not set on the server' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const prompt = String((body && body.prompt) || '');
  const lang = (body && body.lang) === 'ro' ? 'ro' : 'en';
  if (!prompt.trim()) return res.status(400).json({ error: 'Empty question' });
  if (prompt.length > MAX_PROMPT) return res.status(413).json({ error: 'The question is too long (max ' + MAX_PROMPT + ' characters)' });

  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...MODELS] : MODELS;
  let lastErr = 'No Gemini model answered';
  for (const model of [...new Set(models)]) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM(lang) }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.3 }
        })
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 404) { lastErr = 'Gemini model ' + model + ' is not available'; continue; }
      if (!r.ok) return res.status(502).json({ error: 'Gemini API: ' + ((j.error && j.error.message) || ('HTTP ' + r.status)) });
      const c = (j.candidates || [])[0];
      const text = c && c.content && (c.content.parts || []).map(p => p.text || '').join('').trim();
      if (!text) return res.status(502).json({ error: 'Gemini returned no text' + (c && c.finishReason ? ' (' + c.finishReason + ')' : '') });
      return res.status(200).json({ text, model });
    } catch (e) { lastErr = e.message || String(e); }
  }
  return res.status(502).json({ error: lastErr });
}
