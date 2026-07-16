/**
 * Gera os SVGs das roupas novas da loja (rode com: node tools/gerar-roupas.mjs).
 *
 * Os avatares são Avataaars: a roupa é sempre o grupo `<g transform="translate(0 170)">`
 * dentro do SVG, no mesmo sistema de coordenadas em todos os personagens. Este
 * script produz, para cada herói, a partir dos SVGs base em assets/herois/:
 *
 *  - "<heroi>-<tema>.svg" (tier 🪙 180): transplanta a silhueta de camiseta do
 *    template (lorena-esporte) recolorida no tema do herói, com uma estrela no
 *    peito e brilhos;
 *  - "<heroi>-dourada.svg" (tier 🪙 300, roupa-troféu): a roupa base do próprio
 *    herói com as cores remapeadas para dourado + brilhos.
 *
 * Determinístico: rodar de novo regenera os mesmos arquivos (edite e re-rode).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, "..", "assets", "herois");

const ABRE_ROUPA = '<g transform="translate(0 170)">';

/** Tema do tier 180 por herói (cores que não repetem as roupas existentes). */
const TEMAS = [
  { file: "rubi", tema: "neon", corRoupa: "#16e0c8", corEstrela: "#ff3ea5" },
  { file: "lorena", tema: "galaxia", corRoupa: "#2b2a72", corEstrela: "#ffd23e" },
  { file: "mel", tema: "pop", corRoupa: "#ff5db1", corEstrela: "#ffffff" },
  { file: "leo", tema: "astro", corRoupa: "#283593", corEstrela: "#ffd23e" },
  { file: "priya", tema: "show", corRoupa: "#8e24aa", corEstrela: "#ffd23e" },
];

/** Tons de dourado aplicados em sequência às cores originais da roupa. */
const OUROS = ["#f5b942", "#e5a02c", "#ffd23e", "#c98a1e"];
/** Cores que NÃO são "de roupa" (sombras/detalhes) — ficam como estão. */
const PRESERVAR = new Set(["#000", "#000000", "#fff", "#ffffff", "#f4f4f4"]);

/** Localiza o grupo da roupa e devolve { antes, conteudo, depois }. */
function fatiarRoupa(svg, nomeArq) {
  const ini = svg.indexOf(ABRE_ROUPA);
  if (ini === -1) throw new Error(`${nomeArq}: grupo da roupa não encontrado`);
  let i = ini + ABRE_ROUPA.length;
  let nivel = 1;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(svg))) {
    nivel += m[0] === "</g>" ? -1 : 1;
    if (nivel === 0) {
      return {
        antes: svg.slice(0, ini + ABRE_ROUPA.length),
        conteudo: svg.slice(ini + ABRE_ROUPA.length, m.index),
        depois: svg.slice(m.index),
      };
    }
  }
  throw new Error(`${nomeArq}: grupo da roupa sem fechamento`);
}

/** Remapeia as cores de roupa (preserva sombras pretas e brancos/detalhes). */
function recolorir(conteudo, mapear) {
  const vistas = new Map();
  return conteudo.replace(/fill="(#[0-9a-fA-F]{3,6})"/g, (tudo, cor) => {
    const c = cor.toLowerCase();
    if (PRESERVAR.has(c)) return tudo;
    if (!vistas.has(c)) vistas.set(c, mapear(c, vistas.size));
    return `fill="${vistas.get(c)}"`;
  });
}

/** Path de estrela (5 pontas ou 4 pontas p/ brilho) centrada em (cx, cy). */
function estrela(cx, cy, pontas, rFora, rDentro) {
  const pts = [];
  for (let i = 0; i < pontas * 2; i++) {
    const r = i % 2 === 0 ? rFora : rDentro;
    const a = -Math.PI / 2 + (i * Math.PI) / pontas;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Estrela no peito + brilhos espalhados (coordenadas do grupo da roupa). */
function enfeites(corEstrela) {
  const brilhos = [
    [86, 38], [180, 34], [70, 74], [196, 78], [112, 88], [158, 22],
  ]
    .map(([x, y]) => `<path d="${estrela(x, y, 4, 5, 1.6)}" fill="#fff" fill-opacity=".85"/>`)
    .join("");
  return `<path d="${estrela(132, 56, 5, 15, 6)}" fill="${corEstrela}"/>${brilhos}`;
}

const template = fatiarRoupa(
  readFileSync(join(DIR, "lorena-esporte.svg"), "utf8"),
  "lorena-esporte.svg"
).conteudo;

let gerados = 0;
for (const h of TEMAS) {
  const base = readFileSync(join(DIR, `${h.file}.svg`), "utf8");
  const partes = fatiarRoupa(base, `${h.file}.svg`);

  // ---- tier 180: camiseta template recolorida + estrela do tema ----
  const camiseta = recolorir(template, () => h.corRoupa);
  const svg180 = partes.antes + camiseta + enfeites(h.corEstrela) + partes.depois;
  writeFileSync(join(DIR, `${h.file}-${h.tema}.svg`), svg180);
  gerados++;

  // ---- tier 300 (troféu): roupa base do herói em dourado ----
  const ouro = recolorir(partes.conteudo, (cor, i) => OUROS[i % OUROS.length]);
  const svgOuro = partes.antes + ouro + enfeites("#fff7dd") + partes.depois;
  writeFileSync(join(DIR, `${h.file}-dourada.svg`), svgOuro);
  gerados++;
}
console.log(`✅ ${gerados} roupas geradas em assets/herois/.`);
