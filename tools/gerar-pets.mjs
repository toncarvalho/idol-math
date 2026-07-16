/**
 * Gera os SVGs dos pets companheiros (assets/pets/) — as conquistas viram
 * pets com poderes (js/data/pets.js). Mesmo estilo dos inimigos/chefões
 * (tools/gerar-inimigos.mjs): flat kawaii-neon, contorno escuro grosso,
 * olhos grandes com brilho, gradiente radial e sombra no chão.
 *
 * Rode com: node tools/gerar-pets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "pets");
const OUT = "#1a0f2e"; // contorno padrão
const SW = 7;

const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">\n${inner}\n</svg>\n`;
const grad = (id, c1, c2) =>
  `<radialGradient id="${id}" cx="38%" cy="32%" r="80%">` +
  `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>`;
const defs = (...g) => `<defs>${g.join("")}</defs>`;
const chao = (cor, ry = 10) =>
  `<ellipse cx="128" cy="236" rx="62" ry="${ry}" fill="${cor}" opacity="0.35"/>`;

// ---------- rosto ----------
function olho(x, y, r, o = {}) {
  const pr = o.pr || Math.round(r * 0.5);
  const px = x + (o.dx ?? 2), py = y + (o.dy ?? 2);
  let s = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${Math.round(r * 1.12)}" fill="#fff" stroke="${OUT}" stroke-width="5"/>`;
  s += `<circle cx="${px}" cy="${py}" r="${pr}" fill="${o.pupila || OUT}"/>`;
  s += `<circle cx="${(px - pr * 0.35).toFixed(1)}" cy="${(py - pr * 0.4).toFixed(1)}" r="${Math.max(2.4, pr * 0.32).toFixed(1)}" fill="#fff"/>`;
  return s;
}
const olhos = (y, dist, r, o) => olho(128 - dist, y, r, o) + olho(128 + dist, y, r, o);
const sorriso = (y, w, cor = OUT) =>
  `<path d="M${128 - w} ${y} Q128 ${y + Math.round(w * 0.95)} ${128 + w} ${y}" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round"/>`;
const sorrisoAberto = (y, w, cor = "#5a1030") =>
  `<path d="M${128 - w} ${y} Q128 ${y + w * 1.4} ${128 + w} ${y} Q128 ${y + 4} ${128 - w} ${y} Z" fill="${cor}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>`;
const bochechas = (y, dist, cor = "#ff9ad2") =>
  `<circle cx="${128 - dist}" cy="${y}" r="9" fill="${cor}" opacity="0.5"/>` +
  `<circle cx="${128 + dist}" cy="${y}" r="9" fill="${cor}" opacity="0.5"/>`;
const blob = (r, fill, cy = 148) =>
  `<circle cx="128" cy="${cy}" r="${r}" fill="${fill}" stroke="${OUT}" stroke-width="${SW}"/>`;
const gloss = (cy, r) =>
  `<ellipse cx="${128 - r * 0.35}" cy="${cy - r * 0.55}" rx="${r * 0.36}" ry="${r * 0.2}" fill="#fff" opacity="0.25" transform="rotate(-24 ${128 - r * 0.35} ${cy - r * 0.55})"/>`;

// ---------- adereços ----------
function estrela5(cx, cy, ro, ri, fill, sw = 5) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}
function coroa(cx, cy, w, cor = "#ffd23e", gema = "#ff3ea5") {
  const h = w * 0.52;
  return `<path d="M${cx - w / 2} ${cy} l${w * 0.11} ${-h} l${w * 0.17} ${h * 0.62} l${w * 0.22} ${-h * 0.95} l${w * 0.22} ${h * 0.95} l${w * 0.17} ${-h * 0.62} l${w * 0.11} ${h} z" fill="${cor}" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
    `<circle cx="${cx}" cy="${cy - h * 0.2}" r="${Math.max(4, w * 0.08)}" fill="${gema}" stroke="${OUT}" stroke-width="3"/>`;
}
const orelhaTri = (x, y, w, h, rot, fill, dentro) =>
  `<g transform="rotate(${rot} ${x} ${y})">` +
  `<path d="M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y} Z" fill="${fill}" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  (dentro ? `<path d="M${x - w * 0.24} ${y - 4} L${x} ${y - h * 0.62} L${x + w * 0.24} ${y - 4} Z" fill="${dentro}"/>` : "") +
  `</g>`;

const A = {}; // builders por pet

// 🐱 Mimi — gatinha rosa (+moedas na vitória)
A["mimi"] = () => svg(
  defs(grad("g", "#ffb3dd", "#ff3ea5")) + chao("#ff3ea5") +
  `<path d="M182 176 Q222 168 216 132" fill="none" stroke="${OUT}" stroke-width="14" stroke-linecap="round"/>` +
  `<path d="M182 176 Q222 168 216 132" fill="none" stroke="#ff6ec0" stroke-width="8" stroke-linecap="round"/>` +
  orelhaTri(86, 106, 42, 40, -14, "url(#g)", "#ffd9ec") +
  orelhaTri(170, 106, 42, 40, 14, "url(#g)", "#ffd9ec") +
  blob(58, "url(#g)") + gloss(148, 58) +
  `<path d="M52 142 L84 148 M52 162 L84 158" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>` +
  `<path d="M204 142 L172 148 M204 162 L172 158" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>` +
  olhos(140, 24, 13) +
  `<path d="M123 164 L133 164 L128 171 Z" fill="#ff6ec0" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>` +
  sorriso(176, 10) + bochechas(164, 42, "#ff6ec0")
);

// 🐢 Tato — tartaruga verde (congela o tempo)
A["tato"] = () => svg(
  defs(grad("g", "#8fe89b", "#2e9e4f"), grad("c", "#b8f5c0", "#63c777")) + chao("#2e9e4f") +
  `<circle cx="128" cy="96" r="34" fill="url(#c)" stroke="${OUT}" stroke-width="${SW}"/>` +
  olhos(90, 14, 10, { pr: 5 }) + sorriso(106, 8) +
  `<ellipse cx="70" cy="212" rx="18" ry="13" fill="#63c777" stroke="${OUT}" stroke-width="6"/>` +
  `<ellipse cx="186" cy="212" rx="18" ry="13" fill="#63c777" stroke="${OUT}" stroke-width="6"/>` +
  `<path d="M58 190 a70 62 0 0 1 140 0 a10 10 0 0 1 -10 12 l-120 0 a10 10 0 0 1 -10 -12 Z" fill="url(#g)" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>` +
  `<path d="M100 142 l28 -12 l28 12 l0 26 l-28 12 l-28 -12 Z" fill="#b8f5c0" stroke="${OUT}" stroke-width="5" stroke-linejoin="round" opacity="0.9"/>` +
  `<path d="M70 168 l20 -8 M186 168 l-20 -8 M96 196 l14 -14 M160 196 l-14 -14" stroke="${OUT}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>` +
  bochechas(100, 26, "#ffd23e")
);

// 🐰 Pipoca — coelhinha branca (segura o combo)
A["pipoca"] = () => svg(
  defs(grad("g", "#ffffff", "#ffd9ec")) + chao("#ff9ad2") +
  `<g transform="rotate(-10 100 110)"><ellipse cx="100" cy="72" rx="19" ry="48" fill="url(#g)" stroke="${OUT}" stroke-width="6"/><ellipse cx="100" cy="76" rx="9" ry="34" fill="#ff9ad2" opacity="0.7"/></g>` +
  `<g transform="rotate(10 156 110)"><ellipse cx="156" cy="72" rx="19" ry="48" fill="url(#g)" stroke="${OUT}" stroke-width="6"/><ellipse cx="156" cy="76" rx="9" ry="34" fill="#ff9ad2" opacity="0.7"/></g>` +
  blob(56, "url(#g)", 152) + gloss(152, 56) +
  olhos(144, 23, 13) +
  `<path d="M124 166 L132 166 L128 172 Z" fill="#ff6ec0" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>` +
  `<rect x="120" y="174" width="16" height="14" rx="3" fill="#fff" stroke="${OUT}" stroke-width="4"/>` +
  `<path d="M128 174 V188" stroke="${OUT}" stroke-width="3"/>` +
  bochechas(166, 40, "#ff9ad2")
);

// 🦉 Sofia — coruja roxa (+tempo para pensar)
A["sofia"] = () => svg(
  defs(grad("g", "#c9a2ff", "#7b2ff7")) + chao("#7b2ff7") +
  `<path d="M84 104 L74 76 L104 92 Z" fill="#7b2ff7" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M172 104 L182 76 L152 92 Z" fill="#7b2ff7" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  blob(60, "url(#g)") + gloss(148, 60) +
  `<ellipse cx="98" cy="176" rx="20" ry="34" fill="#5a18c9" stroke="${OUT}" stroke-width="6" transform="rotate(14 98 176)"/>` +
  `<ellipse cx="158" cy="176" rx="20" ry="34" fill="#5a18c9" stroke="${OUT}" stroke-width="6" transform="rotate(-14 158 176)"/>` +
  `<path d="M108 186 q20 14 40 0 M112 200 q16 11 32 0" fill="none" stroke="#e3ccff" stroke-width="5" stroke-linecap="round"/>` +
  `<circle cx="106" cy="136" r="24" fill="#fff" stroke="${OUT}" stroke-width="6"/>` +
  `<circle cx="150" cy="136" r="24" fill="#fff" stroke="${OUT}" stroke-width="6"/>` +
  `<circle cx="108" cy="138" r="10" fill="${OUT}"/><circle cx="104.5" cy="134" r="3.4" fill="#fff"/>` +
  `<circle cx="148" cy="138" r="10" fill="${OUT}"/><circle cx="144.5" cy="134" r="3.4" fill="#fff"/>` +
  `<path d="M121 158 L135 158 L128 170 Z" fill="#ffd23e" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>`
);

// 🐶 Rex — cachorro caramelo (escudo de fase)
A["rex"] = () => svg(
  defs(grad("g", "#ffcf99", "#d97b2a")) + chao("#d97b2a") +
  `<ellipse cx="76" cy="140" rx="22" ry="42" fill="#a8551a" stroke="${OUT}" stroke-width="6" transform="rotate(16 76 140)"/>` +
  `<ellipse cx="180" cy="140" rx="22" ry="42" fill="#a8551a" stroke="${OUT}" stroke-width="6" transform="rotate(-16 180 140)"/>` +
  blob(58, "url(#g)", 146) + gloss(146, 58) +
  olhos(136, 24, 13) +
  `<ellipse cx="128" cy="172" rx="26" ry="19" fill="#ffe8cc" stroke="${OUT}" stroke-width="5"/>` +
  `<ellipse cx="128" cy="163" rx="10" ry="7.5" fill="${OUT}"/>` +
  `<path d="M128 170 V178 M128 178 Q118 184 112 178 M128 178 Q138 184 144 178" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>` +
  `<path d="M120 186 q8 12 16 0 v8 q-8 8 -16 0 Z" fill="#ff6ec0" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>` +
  `<path d="M84 196 q44 26 88 0" fill="none" stroke="#ff3ea5" stroke-width="12" stroke-linecap="round"/>` +
  estrela5(128, 212, 12, 5, "#ffd23e")
);

// 🦜 Bis — papagaio verde (canta a dica)
A["bis"] = () => svg(
  defs(grad("g", "#8ff09a", "#2e9e4f"), grad("w", "#ffe27a", "#f0a63c")) + chao("#2e9e4f") +
  `<path d="M128 210 l-14 26 M140 206 l-4 30 M116 206 l-24 22" stroke="#e5533c" stroke-width="9" stroke-linecap="round"/>` +
  `<ellipse cx="128" cy="152" rx="52" ry="62" fill="url(#g)" stroke="${OUT}" stroke-width="${SW}"/>` +
  gloss(140, 52) +
  `<path d="M128 96 a52 52 0 0 1 52 52 l-52 4 Z" fill="#e5533c" stroke="${OUT}" stroke-width="6" stroke-linejoin="round" opacity="0.95"/>` +
  `<ellipse cx="96" cy="168" rx="19" ry="34" fill="url(#w)" stroke="${OUT}" stroke-width="6" transform="rotate(16 96 168)"/>` +
  olho(112, 128, 13) + olho(154, 132, 11, { pr: 5 }) +
  `<path d="M124 148 q24 -8 30 8 q2 14 -16 14 q-16 0 -14 -22 Z" fill="#ffd23e" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>` +
  `<path d="M128 158 q10 2 16 0" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>` +
  `<g stroke="${OUT}" stroke-width="4"><ellipse cx="196" cy="86" rx="8" ry="6.5" fill="#2ff7e6"/><path d="M203 86 V60 q10 2 14 10" fill="none" stroke-linecap="round"/></g>`
);

// 🐝 Zum — abelha (+moedas por acerto)
A["zum"] = () => svg(
  defs(grad("g", "#ffe27a", "#f0a63c")) + chao("#f0a63c") +
  `<path d="M104 92 Q94 74 82 72 M152 92 Q162 74 174 72" fill="none" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>` +
  `<circle cx="82" cy="68" r="7" fill="${OUT}"/><circle cx="174" cy="68" r="7" fill="${OUT}"/>` +
  `<ellipse cx="76" cy="112" rx="34" ry="20" fill="#fff" stroke="${OUT}" stroke-width="5" opacity="0.85" transform="rotate(-24 76 112)"/>` +
  `<ellipse cx="180" cy="112" rx="34" ry="20" fill="#fff" stroke="${OUT}" stroke-width="5" opacity="0.85" transform="rotate(24 180 112)"/>` +
  `<path d="M128 214 l-8 -14 h16 Z" fill="${OUT}"/>` +
  `<ellipse cx="128" cy="156" rx="56" ry="52" fill="url(#g)" stroke="${OUT}" stroke-width="${SW}"/>` +
  `<path d="M84 186 a56 52 0 0 0 88 0 Z" fill="${OUT}" opacity="0.85"/>` +
  `<path d="M74 148 h108 v18 h-104 Z" fill="${OUT}" opacity="0.85"/>` +
  gloss(140, 52) +
  olhos(128, 22, 12) + sorriso(146, 10) + bochechas(138, 40, "#ff9ad2")
);

// 🐉 Faísca — dragãozinho ciano (ataca o chefão junto)
A["faisca"] = () => svg(
  defs(grad("g", "#7df5e5", "#18b5a0")) + chao("#18b5a0") +
  `<path d="M76 96 L64 62 L96 80 Z" fill="#ffd23e" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M180 96 L192 62 L160 80 Z" fill="#ffd23e" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M64 150 Q36 138 40 112 Q58 122 70 118 Z" fill="#59d6f7" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M192 150 Q220 138 216 112 Q198 122 186 118 Z" fill="#59d6f7" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  blob(58, "url(#g)") + gloss(148, 58) +
  `<path d="M100 176 a34 26 0 0 0 56 0 l0 14 a34 20 0 0 1 -56 0 Z" fill="#d8fff8" stroke="${OUT}" stroke-width="5" stroke-linejoin="round" opacity="0.9"/>` +
  olhos(138, 24, 13) + sorrisoAberto(166, 12) +
  `<path d="M110 160 l5 8 5 -8 M136 160 l5 8 5 -8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` +
  `<path d="M196 196 q10 -18 -2 -30 q-2 12 -12 14 q10 4 6 18 q4 2 8 -2 Z" fill="#ff8a3d" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>`
);

// 🦁 Majestade — leão dourado (+1 vida)
A["majestade"] = () => svg(
  defs(grad("g", "#ffd98f", "#e8a33c"), grad("j", "#f0a63c", "#b05f16")) + chao("#e8a33c", 12) +
  `<circle cx="128" cy="146" r="74" fill="url(#j)" stroke="${OUT}" stroke-width="${SW}"/>` +
  `<g fill="#8a4510" opacity="0.55">` +
  [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const rad = (a * Math.PI) / 180;
    const x = 128 + Math.cos(rad) * 62, y = 146 + Math.sin(rad) * 62;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17"/>`;
  }).join("") + `</g>` +
  blob(52, "url(#g)") + gloss(148, 52) +
  orelhaTri(94, 104, 30, 24, -20, "#e8a33c", "#ffd98f") +
  orelhaTri(162, 104, 30, 24, 20, "#e8a33c", "#ffd98f") +
  coroa(128, 84, 44) +
  olhos(140, 22, 12) +
  `<ellipse cx="128" cy="168" rx="22" ry="15" fill="#ffe9c4" stroke="${OUT}" stroke-width="5"/>` +
  `<ellipse cx="128" cy="160" rx="9" ry="6.5" fill="${OUT}"/>` +
  `<path d="M128 166 V172 M128 172 Q120 178 114 173 M128 172 Q136 178 142 173" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>` +
  bochechas(162, 40, "#ff9ad2")
);

// 🦄 Luna — unicórnio (revive)
A["luna"] = () => svg(
  defs(grad("g", "#ffffff", "#e8dcff"), grad("h", "#ffd23e", "#f0a63c")) + chao("#b78aff") +
  `<path d="M120 100 L128 40 L140 98 Z" fill="url(#h)" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M123 82 l13 -4 M125 66 l9 -3" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>` +
  orelhaTri(94, 108, 30, 30, -16, "#fff", "#ffd9ec") +
  orelhaTri(162, 108, 30, 30, 16, "#fff", "#ffd9ec") +
  `<path d="M160 104 Q198 116 196 168 Q186 158 172 160 Q186 178 174 200 Q160 184 152 188 Z" fill="#b78aff" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M170 124 q14 10 12 30" fill="none" stroke="#ff9ad2" stroke-width="7" stroke-linecap="round"/>` +
  blob(56, "url(#g)") + gloss(148, 56) +
  olhos(140, 23, 13) + sorriso(170, 10) + bochechas(162, 40) +
  estrela5(84, 84, 10, 4, "#ffd23e", 4) + estrela5(196, 76, 7, 3, "#2ff7e6", 3.5)
);

fs.mkdirSync(DIR, { recursive: true });
let gerados = 0;
for (const [id, build] of Object.entries(A)) {
  fs.writeFileSync(path.join(DIR, `pet-${id}.svg`), build());
  gerados++;
}
console.log(`✅ ${gerados} pets gerados em assets/pets/.`);
