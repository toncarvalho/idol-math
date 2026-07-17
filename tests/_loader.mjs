/**
 * Loader comum dos testes. O código de produção é buildless (IIFEs globais,
 * sem import/export — ver CLAUDE.md): cada teste lê os arquivos .js e os
 * avalia com new Function, na ordem de dependência, devolvendo os globais
 * que quer inspecionar. Este módulo concentra esse padrão, o contador de
 * falhas e o mock de localStorage — os testes ficam só com os cenários.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Código-fonte de um arquivo do jogo (caminho relativo à raiz do repo). */
export function fonte(caminho) {
  return readFileSync(join(raiz, caminho), "utf8");
}

/**
 * Avalia arquivos buildless em ordem e retorna os globais pedidos.
 * Ex.: carregar(["js/data/fases.js", "js/core/Regras.js"], ["Regras", "JOGO"])
 */
export function carregar(arquivos, globais) {
  const bundle =
    arquivos.map(fonte).join("\n") + `\nreturn { ${globais.join(", ")} };`;
  return new Function(bundle)();
}

/**
 * Contador de falhas da suíte: `ok(cond, msg)` registra, `resumo()` imprime o
 * veredito e encerra com exit 1 se algo falhou.
 */
export function criarOk(nomeSuite) {
  let falhas = 0;
  function ok(cond, msg) {
    if (!cond) {
      console.error("  ✗", msg);
      falhas++;
    }
  }
  function resumo() {
    if (falhas) {
      console.error(`\n❌ ${nomeSuite}: ${falhas} verificação(ões) falharam.`);
      process.exit(1);
    }
    console.log(`✅ ${nomeSuite}: todos os testes passaram.`);
  }
  return { ok, resumo };
}

/**
 * Mock de localStorage por cenário (o Storage lê tudo na inicialização, então
 * cada cenário instancia o módulo de novo com um mock próprio).
 */
export function makeLS(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
    has: (k) => m.has(k),
  };
}
