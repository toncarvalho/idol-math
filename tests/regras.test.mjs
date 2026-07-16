/**
 * Testes das Regras (rode com: node tests/regras.test.mjs).
 * Regras.js é um IIFE global que usa a config JOGO (js/data/fases.js);
 * carregamos os dois e avaliamos, como nos demais testes buildless.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const codeFases = readFileSync(join(__dirname, "../js/data/fases.js"), "utf8");
const codeRegras = readFileSync(join(__dirname, "../js/core/Regras.js"), "utf8");
const { Regras, JOGO, FASES, MECANICAS_CHEFAO, MUNDOS,
        getFase, mundoDaFase, fasesDoMundo, indiceFase, proximaFase } = new Function(
  codeFases + "\n" + codeRegras +
    "\nreturn { Regras, JOGO, FASES, MECANICAS_CHEFAO, MUNDOS, getFase, mundoDaFase, fasesDoMundo, indiceFase, proximaFase };"
)();

let falhas = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("  ✗", msg);
    falhas++;
  }
}

// pontosAcerto: base × combo; chefão usa a base do chefão
ok(Regras.pontosAcerto(false, 1) === JOGO.pontos.base, "acerto simples = base");
ok(Regras.pontosAcerto(false, 4) === JOGO.pontos.base * 4, "combo multiplica a base");
ok(Regras.pontosAcerto(true, 1) === JOGO.pontos.chefao, "chefão usa base maior");
ok(
  Regras.pontosAcerto(true, 3) === JOGO.pontos.chefao * 3,
  "chefão também multiplica pelo combo"
);
ok(
  Regras.pontosAcerto(true, 1) > Regras.pontosAcerto(false, 1),
  "acerto no chefão vale mais que no inimigo comum"
);

// bonusVitoria: vidas e combo máximo
ok(Regras.bonusVitoria(0, 0) === 0, "sem vidas nem combo → sem bônus");
ok(
  Regras.bonusVitoria(3, 10) === 3 * JOGO.pontos.bonusVida + 10 * JOGO.pontos.bonusCombo,
  "bônus soma vidas e combo"
);

// calcularEstrelas: 1..3 conforme vidas; Boss Rush sempre 3
ok(Regras.calcularEstrelas(3, false) === 3, "3 vidas → 3 estrelas");
ok(Regras.calcularEstrelas(2, false) === 2, "2 vidas → 2 estrelas");
ok(Regras.calcularEstrelas(1, false) === 1, "1 vida → 1 estrela");
ok(Regras.calcularEstrelas(0, false) === 1, "vitória vale no mínimo 1 estrela");
ok(Regras.calcularEstrelas(99, false) === 3, "estrelas têm teto de 3");
ok(Regras.calcularEstrelas(0, true) === 3, "Boss Rush vale sempre 3 estrelas");

// moedasVitoria: acertos + bônus fixo + estrelas
ok(
  Regras.moedasVitoria(0, 1) === JOGO.moedas.bonusVitoria + JOGO.moedas.porEstrela,
  "vitória mínima = bônus fixo + 1 estrela"
);
ok(
  Regras.moedasVitoria(12, 3) ===
    12 + JOGO.moedas.bonusVitoria + 3 * JOGO.moedas.porEstrela,
  "moedas somam partida + bônus + estrelas"
);
ok(
  Regras.moedasVitoria(10, 3) > Regras.moedasVitoria(10, 1),
  "mais estrelas → mais moedas"
);

// hpChefao: só "blindado" reduz o HP (exige acertos seguidos p/ dano)
ok(Regras.hpChefao(null) === JOGO.bossHp, "chefão sem mecânica usa bossHp cheio");
ok(Regras.hpChefao("tempoCurto") === JOGO.bossHp, "tempoCurto não muda o HP");
ok(Regras.hpChefao("embaralha") === JOGO.bossHp, "embaralha não muda o HP");
ok(
  Regras.hpChefao("blindado") ===
    Math.max(1, Math.round(JOGO.bossHp * JOGO.mecanicas.blindadoFatorHp)),
  "blindado reduz o HP pelo fator configurado"
);
ok(Regras.hpChefao("blindado") >= 1, "HP do blindado nunca fica abaixo de 1");

// powerupPorCombo: escudo/raio nos múltiplos configurados, máx. 1 guardado
const pe = JOGO.powerups.comboEscudo;
const pr = JOGO.powerups.comboRaio;
ok(Regras.powerupPorCombo(0, false, false) === null, "combo 0 não dá power-up");
ok(Regras.powerupPorCombo(pe, false, false) === "escudo", "combo do escudo dá 🛡️");
ok(Regras.powerupPorCombo(pe, true, false) === null, "escudo não acumula (máx. 1)");
ok(Regras.powerupPorCombo(pr, false, false) === "raio", "combo do raio dá ⚡");
ok(
  Regras.powerupPorCombo(pr, false, true) === "escudo",
  "com ⚡ já guardado, múltiplo do raio (também do escudo) cai para 🛡️"
);
ok(Regras.powerupPorCombo(pr, true, true) === null, "com ambos guardados não acumula nada");
ok(Regras.powerupPorCombo(pr, true, false) === "raio", "no múltiplo do raio, ⚡ tem prioridade");
ok(Regras.powerupPorCombo(pe + 1, false, false) === null, "fora dos múltiplos não dá nada");
ok(Regras.powerupPorCombo(pr * 2, false, false) === "raio", "múltiplos seguintes também premiam");

// FASES: toda mecânica declarada nos chefões existe no catálogo
ok(
  FASES.every((f) => !f.boss.mecanica || MECANICAS_CHEFAO[f.boss.mecanica]),
  "boss.mecanica de toda fase existe em MECANICAS_CHEFAO"
);
ok(
  FASES.some((f) => f.boss.mecanica),
  "há chefões com mecânica especial declarada"
);

// MUNDOS: consistência da estrutura e regras de segurança do save
ok(new Set(MUNDOS.map((m) => m.id)).size === MUNDOS.length, "ids de mundo únicos");
ok(new Set(FASES.map((f) => String(f.id))).size === FASES.length, "ids de fase únicos");
ok(
  FASES.every((f) => MUNDOS.some((m) => m.id === mundoDaFase(f))),
  "toda fase pertence a um mundo existente"
);
const tabuada = MUNDOS.find((m) => m.id === "tabuada");
ok(!!tabuada && !tabuada.emBreve, "mundo Tabuada existe e está jogável");
// SAVE: as 12 fases da Tabuada mantêm os ids 1–12, em ordem, para sempre
const ft = fasesDoMundo("tabuada");
ok(ft.length === 12, "Tabuada tem 12 fases");
ok(ft.every((f, i) => f.id === i + 1), "ids da Tabuada são 1–12 em ordem (save)");
ok(ft.every((f) => indiceFase(f.id) === f.id), "na Tabuada, índice === id (save legado)");
// navegação entre fases (dentro do mundo)
ok(proximaFase(1).id === 2, "próxima da fase 1 é a 2");
ok(proximaFase(12) === null, "última fase da Tabuada não tem próxima (não vaza p/ Divisão)");
ok(getFase("3").id === 3, "getFase aceita id como string (dataset HTML)");

// MUNDO DA DIVISÃO: 12 fases espelhando a Tabuada (Turnê Reversa)
const divisao = MUNDOS.find((m) => m.id === "divisao");
ok(!!divisao && !divisao.emBreve, "mundo Divisão existe e está jogável");
const fd = fasesDoMundo("divisao");
ok(fd.length === 12, "Divisão tem 12 fases");
ok(fd.every((f, i) => f.id === `d${i + 1}`), "ids da Divisão são d1–d12 em ordem");
ok(fd.every((f, i) => indiceFase(f.id) === i + 1), "índice das fases da Divisão");
fd.forEach((f, i) => {
  const orig = ft[i];
  ok(f.imgInimigo === `inimigo${orig.id}` && f.imgBoss === `boss${orig.id}`,
    `d${i + 1} reaproveita a arte da fase ${orig.id}`);
  ok(JSON.stringify(f.tabuadas) === JSON.stringify(orig.tabuadas),
    `d${i + 1} espelha as tabuadas da fase ${orig.id}`);
  ok(f.boss.mecanica === orig.boss.mecanica,
    `d${i + 1} espelha a mecânica do chefão da fase ${orig.id}`);
  ok(!!f.foco, `d${i + 1} declara o rótulo foco do tile`);
});
ok(proximaFase("d1").id === "d2", "próxima da d1 é a d2");
ok(proximaFase("d12") === null, "última fase da Divisão não tem próxima");
ok(getFase("d3").nome === fd[2].nome, "getFase encontra fase por id string");

if (falhas) {
  console.error(`\n❌ Regras: ${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("✅ Regras: todos os testes passaram.");
