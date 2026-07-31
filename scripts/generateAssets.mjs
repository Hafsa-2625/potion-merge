/**
 * Generates every game texture as an inline SVG data URI.
 *
 * SVG keeps the payload tiny (a few KB total) while staying crisp at any DPI.
 * Each icon is authored so its visual bounding box is vertically centred on
 * y=128 inside a 256x256 canvas, which is what makes the drag hit areas line
 * up exactly with what the player sees.
 *
 * Run: node scripts/generateAssets.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZE = 256;

function svg(defs, body) {
  // Keep authoring in 256-space (clip paths stay valid) but declare a 512px
  // intrinsic size so rasterisation lands on a dense bitmap.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${SIZE} ${SIZE}">
<defs>${defs}</defs>
${body}
</svg>`;
}

function glow(id, color) {
  return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">
<stop offset="45%" stop-color="${color}" stop-opacity=".38"/>
<stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`;
}

function vertical(id, from, to) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${from}"/>
<stop offset="100%" stop-color="${to}"/>
</linearGradient>`;
}

const glowDisc = '<circle cx="128" cy="128" r="126" fill="url(#glow)"/>';

// --- Tier 0: single herb sprig -------------------------------------------
function herb() {
  const defs = [
    glow('glow', '#7ef2a0'),
    vertical('leaf', '#8bef95', '#37a755'),
  ].join('');

  const body = `${glowDisc}
<g transform="translate(0,2)">
<path d="M128 206 C123 168 123 130 128 92" stroke="#2c7a41" stroke-width="11" stroke-linecap="round" fill="none"/>
<path d="M128 150 C96 154 70 132 64 96 C98 90 124 114 128 150Z" fill="url(#leaf)"/>
<path d="M128 118 C160 122 186 100 192 64 C158 58 132 82 128 118Z" fill="url(#leaf)"/>
<path d="M128 188 C104 192 84 176 80 150 C104 146 124 164 128 188Z" fill="url(#leaf)"/>
<path d="M124 146 C112 132 96 116 76 100" stroke="#ffffff" stroke-opacity=".4" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="M132 114 C144 100 160 86 180 72" stroke="#ffffff" stroke-opacity=".4" stroke-width="5" stroke-linecap="round" fill="none"/>
</g>`;

  return svg(defs, body);
}

// --- Tier 1: bundled herbs -----------------------------------------------
function herbBundle() {
  const defs = [
    glow('glow', '#9cf7a8'),
    vertical('leaf', '#a6f79f', '#3fae5c'),
    vertical('tie', '#e0a566', '#b16f34'),
  ].join('');

  const body = `${glowDisc}
<g transform="translate(0,4)">
<path d="M128 198 C112 162 100 134 92 104" stroke="#2c7a41" stroke-width="9" stroke-linecap="round" fill="none"/>
<path d="M128 198 C128 158 128 128 128 96" stroke="#2c7a41" stroke-width="9" stroke-linecap="round" fill="none"/>
<path d="M128 198 C144 162 156 134 164 104" stroke="#2c7a41" stroke-width="9" stroke-linecap="round" fill="none"/>
<ellipse cx="88" cy="88" rx="23" ry="35" fill="url(#leaf)" transform="rotate(-20 88 88)"/>
<ellipse cx="128" cy="72" rx="23" ry="36" fill="url(#leaf)"/>
<ellipse cx="168" cy="88" rx="23" ry="35" fill="url(#leaf)" transform="rotate(20 168 88)"/>
<path d="M80 74 C86 88 88 104 88 118" stroke="#ffffff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="M128 46 C128 64 128 84 128 104" stroke="#ffffff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" fill="none"/>
<rect x="102" y="186" width="52" height="26" rx="12" fill="url(#tie)"/>
<rect x="102" y="186" width="52" height="9" rx="5" fill="#ffffff" fill-opacity=".22"/>
</g>`;

  return svg(defs, body);
}

// --- Tier 2: conical flask ----------------------------------------------
function flask() {
  const shape = 'M114 48 L142 48 L142 96 L192 186 Q200 202 182 202 L74 202 Q56 202 64 186 L114 96 Z';
  const defs = [
    glow('glow', '#6fc0ff'),
    vertical('glass', '#eaf6ff', '#b7d9f5'),
    vertical('liquid', '#63bcff', '#1f6fd0'),
    `<clipPath id="flaskClip"><path d="${shape}"/></clipPath>`,
  ].join('');

  const body = `${glowDisc}
<g transform="translate(0,3)">
<path d="${shape}" fill="url(#glass)" fill-opacity=".92"/>
<g clip-path="url(#flaskClip)">
<rect x="50" y="140" width="156" height="70" fill="url(#liquid)"/>
<ellipse cx="104" cy="168" r="0" rx="9" ry="9" fill="#ffffff" fill-opacity=".45"/>
<circle cx="150" cy="182" r="7" fill="#ffffff" fill-opacity=".35"/>
<circle cx="122" cy="156" r="5" fill="#ffffff" fill-opacity=".3"/>
</g>
<path d="${shape}" fill="none" stroke="#f2fbff" stroke-opacity=".7" stroke-width="5"/>
<rect x="104" y="36" width="48" height="20" rx="9" fill="#c58a4e"/>
<path d="M122 62 L122 96 L92 150" stroke="#ffffff" stroke-opacity=".45" stroke-width="7" stroke-linecap="round" fill="none"/>
</g>`;

  return svg(defs, body);
}

// --- Tiers 3-5: bottle silhouette ---------------------------------------
const BOTTLE = 'M128 92 C170 96 198 130 198 158 C198 192 168 214 128 214 C88 214 58 192 58 158 C58 130 86 96 128 92 Z';

function bottle({ glowColor, liquidFrom, liquidTo, corkFrom, corkTo, extras = '', shift = 0 }) {
  const defs = [
    glow('glow', glowColor),
    vertical('glass', '#f4f9ff', '#c9dcf0'),
    vertical('liquid', liquidFrom, liquidTo),
    vertical('cork', corkFrom, corkTo),
    `<clipPath id="bottleClip"><path d="${BOTTLE}"/></clipPath>`,
  ].join('');

  const body = `${glowDisc}
<g transform="translate(0,${shift})">
<rect x="110" y="58" width="36" height="42" rx="7" fill="url(#glass)" fill-opacity=".9"/>
<path d="${BOTTLE}" fill="url(#glass)" fill-opacity=".9"/>
<g clip-path="url(#bottleClip)">
<rect x="52" y="132" width="152" height="90" fill="url(#liquid)"/>
<ellipse cx="128" cy="134" rx="76" ry="12" fill="#ffffff" fill-opacity=".28"/>
<circle cx="98" cy="176" r="8" fill="#ffffff" fill-opacity=".3"/>
<circle cx="152" cy="192" r="6" fill="#ffffff" fill-opacity=".26"/>
</g>
<path d="${BOTTLE}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="5"/>
<ellipse cx="97" cy="146" rx="13" ry="26" fill="#ffffff" fill-opacity=".38" transform="rotate(-22 97 146)"/>
<rect x="102" y="38" width="52" height="26" rx="11" fill="url(#cork)"/>
<rect x="102" y="38" width="52" height="9" rx="5" fill="#ffffff" fill-opacity=".25"/>
${extras}
</g>`;

  return svg(defs, body);
}

function potion() {
  return bottle({
    glowColor: '#d79bff',
    liquidFrom: '#d488ff',
    liquidTo: '#7a2fd0',
    corkFrom: '#dda469',
    corkTo: '#a86a33',
  });
}

function rarePotion() {
  const extras = `<g fill="#fff3c4">
<path d="M196 84 L201 99 L216 104 L201 109 L196 124 L191 109 L176 104 L191 99 Z"/>
<path d="M62 62 L66 74 L78 78 L66 82 L62 94 L58 82 L46 78 L58 74 Z" fill-opacity=".85"/>
</g>
<circle cx="128" cy="46" r="9" fill="#fff6d0"/>`;

  return bottle({
    glowColor: '#ffb37a',
    liquidFrom: '#ffb066',
    liquidTo: '#ef4f22',
    corkFrom: '#e6b177',
    corkTo: '#a4692f',
    extras,
  });
}

function legendaryPotion() {
  const extras = `<path d="M96 36 L110 14 L128 30 L146 14 L160 36 Z" fill="url(#crown)"/>
<circle cx="128" cy="22" r="7" fill="#fffbe6"/>
<g fill="#fff8d6">
<path d="M204 92 L209 108 L225 113 L209 118 L204 134 L199 118 L183 113 L199 108 Z"/>
<path d="M52 104 L57 118 L71 123 L57 128 L52 142 L47 128 L33 123 L47 118 Z" fill-opacity=".9"/>
<path d="M128 226 L132 238 L144 242 L132 246 L128 258 L124 246 L112 242 L124 238 Z" fill-opacity=".55"/>
</g>`;

  const base = bottle({
    glowColor: '#fff3b0',
    liquidFrom: '#ffef9e',
    liquidTo: '#ffb300',
    corkFrom: '#ffd76a',
    corkTo: '#c9922a',
    extras,
    shift: 6,
  });

  // Crown needs its own gradient injected alongside the bottle defs.
  return base.replace('</defs>', `${vertical('crown', '#fff0a8', '#e0a92e')}</defs>`);
}

// --- Effects and decoration ---------------------------------------------
function sparkle() {
  const defs = glow('glow', '#fff6cc');
  const body = `<circle cx="128" cy="128" r="120" fill="url(#glow)"/>
<path d="M128 22 L146 110 L234 128 L146 146 L128 234 L110 146 L22 128 L110 110 Z" fill="#fffdf2"/>`;
  return svg(defs, body);
}

function bubble() {
  const defs = `<radialGradient id="b" cx="38%" cy="32%" r="70%">
<stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>
<stop offset="70%" stop-color="#c6a8ff" stop-opacity=".16"/>
<stop offset="100%" stop-color="#c6a8ff" stop-opacity="0"/>
</radialGradient>`;
  const body = `<circle cx="128" cy="128" r="126" fill="url(#b)"/>`;
  return svg(defs, body);
}

const ASSETS = {
  herb: herb(),
  herbBundle: herbBundle(),
  flask: flask(),
  potion: potion(),
  rarePotion: rarePotion(),
  legendaryPotion: legendaryPotion(),
  sparkle: sparkle(),
  bubble: bubble(),
};

function toDataUri(markup) {
  const compact = markup.replace(/\n\s*/g, '');
  return `data:image/svg+xml;base64,${Buffer.from(compact, 'utf8').toString('base64')}`;
}

const lines = [
  '/**',
  ' * Embedded base64 (SVG) textures for every game visual.',
  ' * Generated by scripts/generateAssets.mjs - do not edit by hand.',
  ' */',
  'export const BASE64_ASSETS: Record<string, string> = {',
];

let total = 0;
for (const [key, markup] of Object.entries(ASSETS)) {
  const uri = toDataUri(markup);
  total += uri.length;
  lines.push(`  ${key}: '${uri}',`);
}

lines.push('};', '');

const outPath = join(__dirname, '..', 'src', 'assets', 'base64Assets.ts');
writeFileSync(outPath, lines.join('\n'));
console.log(
  `Generated ${Object.keys(ASSETS).length} SVG assets (${(total / 1024).toFixed(1)} KB) -> ${outPath}`
);
