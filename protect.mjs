/* protect.mjs — runs after build.js on public/*.html
   1. Domain lock: the page only starts on the allowed hosts (plus localhost / 127.0.0.1) over http(s).
      A saved copy (file://) or a copy on another host shows "This copy is not licensed to run here".
   2. Obfuscation of the inline scripts (javascript-obfuscator, light settings so the app stays fast).
   CNC_ALLOWED_HOSTS  comma-separated hosts, wildcards like *.example.com  (default below)
   CNC_PROTECT=0      skip both steps for one build (emergency switch)                        */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const DEFAULT_HOSTS = 'sosgrob.vercel.app';

if (!fs.existsSync(DIR)) {
  console.error('protect.mjs: public/ is missing - run build.js first. Nothing is published unprotected.');
  process.exit(1);
}
if (process.env.CNC_PROTECT === '0') {
  console.warn('protect.mjs: CNC_PROTECT=0 - domain lock and obfuscation SKIPPED for this build.');
  process.exit(0);
}

const hosts = (process.env.CNC_ALLOWED_HOSTS || DEFAULT_HOSTS)
  .split(',').map(h => h.trim().toLowerCase()).filter(Boolean)
  .concat(['localhost', '127.0.0.1']);

/* host names are kept as shifted char codes, not as plain text */
const SHIFT = 7 + Math.floor(Math.random() * 40);
const enc = hosts.map(h => [...h].map(c => c.charCodeAt(0) + SHIFT));

const lock = `(function(){var k=${SHIFT},L=${JSON.stringify(enc)},h=(location.hostname||'').toLowerCase(),p=location.protocol,ok=false;
for(var i=0;i<L.length;i++){var s='';for(var j=0;j<L[i].length;j++)s+=String.fromCharCode(L[i][j]-k);
if(s===h||(s.indexOf('*.')===0&&h.length>s.length-1&&h.slice(-(s.length-1))===s.slice(1))){ok=true;break;}}
if(!ok||!/^https?:$/.test(p)){document.documentElement.innerHTML='<body style="font:16px system-ui;padding:40px;background:#15181c;color:#dfe4ea">This copy is not licensed to run here.</body>';
throw new Error('not licensed');}})();`;

const OBF = {
  compact: true,
  renameGlobals: false,              /* inline handlers keep working */
  identifierNamesGenerator: 'hexadecimal',
  stringArray: true,
  stringArrayShuffle: true,
  stringArrayRotate: true,
  stringArrayEncoding: [],           /* no per-call decoding: fast */
  stringArrayThreshold: 0.75,
  controlFlowFlattening: false,      /* heavier settings made the app ~3x slower */
  deadCodeInjection: false,
  selfDefending: false,
  simplify: true,
  target: 'browser'
};

let files = 0;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.html'))) {
  const p = path.join(DIR, f);
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => {
    /* the lock goes first, after a "use strict" directive so strict mode is kept */
    const us = code.match(/^\s*(["'])use strict\1;?/);
    const src = us ? us[0] + '\n' + lock + '\n' + code.slice(us[0].length) : lock + '\n' + code;
    const out = JavaScriptObfuscator.obfuscate(src, OBF).getObfuscatedCode();
    return '<script>' + out + '</script>';
  });
  fs.writeFileSync(p, html);
  files++;
  console.log('protect.mjs: ' + f + ' locked to ' + hosts.join(', ') + ' and obfuscated (' +
    (fs.statSync(p).size / 1024).toFixed(0) + ' KB)');
}
if (!files) { console.error('protect.mjs: no HTML in public/'); process.exit(1); }
