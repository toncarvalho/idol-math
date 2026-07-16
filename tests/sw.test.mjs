/**
 * Teste do Service Worker (rode com: node tests/sw.test.mjs).
 *
 * A lista ASSETS do sw.js é mantida à mão — se alguém adicionar um script no
 * index.html ou uma roupa/herói novo e esquecer o sw.js, o jogo quebra SÓ
 * offline (o tipo de bug que passa no teste local). Este teste garante que:
 *   1. todo arquivo listado em ASSETS existe no repositório (pega typos);
 *   2. todo script/CSS/manifest/ícone referenciado no index.html está em ASSETS;
 *   3. todo SVG de herói/roupa/pet (HEROIS + ROUPAS + PETS) está em ASSETS.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = join(__dirname, "..");

let falhas = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("  ✗", msg);
    falhas++;
  }
}

// ---- extrai a lista ASSETS do sw.js ----
const swCode = readFileSync(join(raiz, "sw.js"), "utf8");
const mAssets = swCode.match(/const ASSETS = \[([\s\S]*?)\];/);
ok(!!mAssets, "sw.js deve declarar `const ASSETS = [...]`");
const ASSETS = mAssets
  ? [...mAssets[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];
ok(ASSETS.length > 0, "ASSETS não pode estar vazio");

// 1) todo item de ASSETS existe no repositório
for (const a of ASSETS) {
  if (a === "./") continue; // raiz (equivale ao index.html)
  ok(existsSync(join(raiz, a)), `ASSETS lista "${a}", mas o arquivo não existe`);
}

// 2) todo arquivo local referenciado no index.html está em ASSETS
const html = readFileSync(join(raiz, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(https?:|data:|#)/.test(u));
ok(refs.length > 0, "index.html deve referenciar arquivos locais");
for (const r of refs) {
  ok(ASSETS.includes(r), `index.html usa "${r}", mas não está em ASSETS do sw.js`);
}

// 3) todo SVG de herói/roupa/pet está em ASSETS
const codeHerois = readFileSync(join(raiz, "js/data/herois.js"), "utf8");
const codeRoupas = readFileSync(join(raiz, "js/data/roupas.js"), "utf8");
const codePets = readFileSync(join(raiz, "js/data/pets.js"), "utf8");
const { HEROIS, ROUPAS, PETS } = new Function(
  codeHerois + "\n" + codeRoupas + "\n" + codePets + "\nreturn { HEROIS, ROUPAS, PETS };"
)();
const svgs = new Set();
HEROIS.forEach((h) => svgs.add(`assets/herois/${h.file}.svg`));
Object.values(ROUPAS).forEach((lista) =>
  lista.forEach((r) => svgs.add(`assets/herois/${r.file}.svg`))
);
PETS.forEach((p) => svgs.add(`assets/pets/pet-${p.id}.svg`));
for (const svg of svgs) {
  ok(existsSync(join(raiz, svg)), `herois/roupas/pets referem "${svg}", mas o arquivo não existe`);
  ok(ASSETS.includes(svg), `"${svg}" (herói/roupa/pet) não está em ASSETS do sw.js`);
}

if (falhas) {
  console.error(`\n❌ SW: ${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("✅ SW: ASSETS do service worker consistente com o projeto.");
