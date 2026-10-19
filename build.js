/* build.js — src/cnc-backplot.html -> public/index.html
   Stamps the build time (APP_UPDATED) and minifies the inline script with terser.
   protect.mjs runs after this (domain lock + obfuscation). */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const SRC = path.join(__dirname, 'src', 'cnc-backplot.html');
const OUT_DIR = path.join(__dirname, 'public');
const OUT = path.join(OUT_DIR, 'index.html');

(async () => {
  let html = fs.readFileSync(SRC, 'utf8');

  /* "Last update" in the header: the time of this build */
  html = html.replace(/\/\*@BUILD_TIME\*\/'[^']*'/, "'" + new Date().toISOString() + "'");

  /* the source comment block at the top is for the repository, not the page */
  html = html.replace(/^(<!doctype html>)\s*<!--[\s\S]*?-->/i, '$1');

  /* minify every inline script (no src attribute) */
  const re = /<script>([\s\S]*?)<\/script>/g;
  const parts = [];
  let last = 0, m, n = 0;
  while ((m = re.exec(html))) {
    parts.push(html.slice(last, m.index));
    const r = await minify(m[1], {
      ecma: 2020,
      compress: { passes: 2 },
      mangle: { toplevel: false },          /* globals keep their names: inline handlers use them */
      format: { comments: false }
    });
    if (r.error) throw r.error;
    parts.push('<script>' + r.code + '</script>');
    last = re.lastIndex; n++;
  }
  parts.push(html.slice(last));
  html = parts.join('');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log('build.js: ' + n + ' script(s) minified -> public/index.html (' +
    (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
})().catch(e => { console.error('build.js failed:', e); process.exit(1); });
