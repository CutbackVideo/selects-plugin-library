// Dev only: draws the Torn photo geometry (torn outline, grown paper, rim bands, shadow, tear strips) for three
// seeds on the Night backdrop, as one SVG to eyeball the shape. The photo is a flat placeholder gradient.
// Usage: node plugins/torn-paper-love/dev/render-torn-preview.mjs [seed1 seed2 seed3]  ->  $TMPDIR/torn-preview.svg
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'assets', 'torn-photo.tsx'), 'utf8');
const block = src.slice(src.indexOf('// tpl-torn:start'), src.indexOf('// tpl-torn:end'));
const box = { Math, Number, Array, String, JSON, Object, isFinite };
vm.createContext(box);
vm.runInContext(block + ';globalThis.T={tplData,tplGeometry,tplBackdrop,TPL_W,TPL_H,TPL_PAPER,TPL_RIM};', box);
const T = box.T, W = T.TPL_W, H = T.TPL_H;
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2', '3'];
const pts = poly => poly.map(p => p[0] + ',' + p[1]).join(' ');

const panels = seeds.map((seed, i) => {
  const d = T.tplData({ seed });
  const g = T.tplGeometry(d);
  const bd = T.tplBackdrop('night', null);
  const e = g.edgePx;
  const tear = i === 2; // the third panel also shows the tear strips
  return `<g transform="translate(0 ${i * (H + 40)})">
  <rect width="${W}" height="${H}" fill="${bd.base}"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="${bd.grain}"/>
  <polygon points="${pts(g.paper)}" fill="rgba(0,0,0,0.45)" filter="url(#shadow)"/>
  <polygon points="${pts(g.paper)}" fill="${T.TPL_PAPER}" filter="url(#pe${i})"/>
  <g filter="url(#fb${i})">${g.rims.map((r, k) => `<polygon points="${pts(r)}" fill="${T.TPL_RIM[k]}"/>`).join('')}</g>
  <polygon points="${pts(g.poly)}" fill="url(#photo)"/>
  ${tear ? g.strips.map(s => `<polygon points="${pts(s.points)}" fill="rgba(0,0,0,0.45)" filter="url(#shadow)"/><polygon points="${pts(s.points)}" fill="${T.TPL_RIM[0]}"/><polygon points="${pts(s.core)}" fill="${T.TPL_PAPER}"/>`).join('') : ''}
  <text x="24" y="48" font-family="sans-serif" font-size="32" fill="#fff">seed ${seed}${tear ? ' + tear strips' : ''} · ${g.poly.length} vertices · edge ${(e / W * 100).toFixed(2)} % W</text>
  <filter id="pe${i}" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="1" seed="${g.poly.length + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${e * 0.1}" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="fb${i}" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="2" seed="${g.poly.length}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${e * 0.18}" xChannelSelector="R" yChannelSelector="G"/></filter>
</g>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${seeds.length * (H + 40)}" viewBox="0 0 ${W} ${seeds.length * (H + 40)}">
<defs>
  <linearGradient id="photo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6f64"/><stop offset="0.5" stop-color="#c49a86"/><stop offset="1" stop-color="#3b3340"/></linearGradient>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${0.006 * W}"/><feOffset dx="${0.002 * W}" dy="${0.002 * W}"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -1.5"/></filter>
</defs>
${panels.join('\n')}
</svg>`;
const out = path.join(process.env.TMPDIR || os.tmpdir(), 'torn-preview.svg');
fs.writeFileSync(out, svg);
console.log(out);
