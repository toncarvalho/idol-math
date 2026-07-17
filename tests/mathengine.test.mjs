/**
 * Testes do MathEngine (rode com: node tests/mathengine.test.mjs).
 * Carregamento buildless e contador de falhas: tests/_loader.mjs.
 */
import { carregar, criarOk } from "./_loader.mjs";

const { MathEngine } = carregar(["js/core/MathEngine.js"], ["MathEngine"]);
const { ok, resumo } = criarOk("MathEngine");

// gerarOpcoes: 4 únicas, contém a resposta, todas > 0
for (let i = 0; i < 2000; i++) {
  const resp = MathEngine.inteiroAleatorio(1, 144);
  const ops = MathEngine.gerarOpcoes(resp);
  ok(ops.length === 4, "opções devem ter 4 itens");
  ok(new Set(ops).size === 4, "opções não podem repetir");
  ok(ops.includes(resp), "opções devem conter a resposta");
  ok(
    ops.every((n) => n > 0),
    "opções devem ser positivas"
  );
}

// gerarPergunta: a*b == resposta, foco na tabuada, fator na faixa
const tabuadas = [7];
const faixa = { min: 1, max: 10 };
for (let i = 0; i < 2000; i++) {
  const q = MathEngine.gerarPergunta(tabuadas, faixa);
  ok(q.a * q.b === q.resposta, "a*b deve ser a resposta");
  const foco = tabuadas.includes(q.a) ? q.a : q.b;
  ok(tabuadas.includes(foco), "um dos fatores deve ser a tabuada-foco");
  const outro = tabuadas.includes(q.a) ? q.b : q.a;
  ok(outro >= faixa.min && outro <= faixa.max, "o outro fator deve estar na faixa");
}

// gerarOpcoes com fatores: mantém as garantias E inclui distrator pedagógico
// (linha vizinha: a×(b±1) ou (a±1)×b)
for (let i = 0; i < 2000; i++) {
  const a = MathEngine.inteiroAleatorio(1, 10);
  const b = MathEngine.inteiroAleatorio(1, 10);
  const resp = a * b;
  const ops = MathEngine.gerarOpcoes(resp, a, b);
  ok(ops.length === 4, "com fatores: opções devem ter 4 itens");
  ok(new Set(ops).size === 4, "com fatores: opções não podem repetir");
  ok(ops.includes(resp), "com fatores: opções devem conter a resposta");
  ok(
    ops.every((n) => n > 0),
    "com fatores: opções devem ser positivas"
  );
  const vizinhos = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b].filter(
    (n) => n > 0 && n !== resp
  );
  if (vizinhos.length) {
    ok(
      ops.some((n) => vizinhos.includes(n)),
      `deve incluir um erro clássico de tabuada (${a}×${b})`
    );
  }
}

// repetição inteligente: um fato com peso alto deve aparecer mais
const fatos = { "7x8": 8 }; // muito errado → deve repetir bastante
let cont78 = 0;
const N = 4000;
for (let i = 0; i < N; i++) {
  const q = MathEngine.gerarPergunta([7], { min: 1, max: 10 }, fatos);
  if ((q.a === 7 && q.b === 8) || (q.a === 8 && q.b === 7)) cont78++;
}
// sem peso, 7x8 sairia ~1/10 (10%); com peso 8 deve ser bem acima de 25%.
const frac = cont78 / N;
ok(frac > 0.25, `7x8 ponderado deve aparecer mais (${(frac * 100).toFixed(1)}%)`);

// chaveFato canônica (ordem não importa)
ok(MathEngine.chaveFato(7, 8) === MathEngine.chaveFato(8, 7), "chaveFato deve ser canônica");

// gerarPergunta expõe o fato canônico e o texto falado
for (let i = 0; i < 500; i++) {
  const q = MathEngine.gerarPergunta([7], faixa);
  ok(q.fatoA * q.fatoB === q.resposta, "fatoA×fatoB deve ser a resposta");
  ok(q.fatoA === 7, "fatoA é a tabuada-foco (canônico, sem inversão)");
  ok(q.falado === `${q.a} vezes ${q.b}`, "falado da multiplicação por extenso");
}

// gerarPerguntaDivisao: (a×b) ÷ a, divisor = tabuada da fase, quociente na faixa
for (let i = 0; i < 2000; i++) {
  const q = MathEngine.gerarPerguntaDivisao([7], faixa);
  ok(q.b === 7, "divisor deve ser a tabuada-foco");
  ok(q.a === q.b * q.resposta, "dividendo = divisor × quociente (conta exata)");
  ok(q.resposta >= faixa.min && q.resposta <= faixa.max, "quociente na faixa");
  ok(q.texto === `${q.a} ÷ ${q.b}`, "texto usa ÷");
  ok(q.falado === `${q.a} dividido por ${q.b}`, "falado da divisão por extenso");
  ok(q.fatoA === 7 && q.fatoA * q.fatoB === q.a, "fato canônico é a multiplicação por trás");
}

// ===================== SOMA & SUBTRAÇÃO =====================

// chaveConta: soma canônica, subtração preserva a ordem
ok(MathEngine.chaveConta(3, 7, "+") === MathEngine.chaveConta(7, 3, "+"), "chave de soma canônica");
ok(MathEngine.chaveConta(3, 7, "+") === "3+7", "chave de soma legível");
ok(MathEngine.chaveConta(15, 6, "-") === "15-6", "chave de subtração preserva a ordem");

// cada degrau da escada respeita as próprias restrições
const SPECS = {
  contar: { spec: { tipo: "contar", max: 10 }, ok: (q) => q.op === "+" && Math.min(q.a, q.b) <= 2 && q.resposta <= 10 },
  somaAte: { spec: { tipo: "somaAte", max: 10 }, ok: (q) => q.op === "+" && q.resposta <= 10 && q.a >= 1 && q.b >= 1 },
  dobros: { spec: { tipo: "dobros", max: 20 }, ok: (q) => q.op === "+" && Math.abs(q.a - q.b) <= 1 && q.resposta <= 20 },
  amigos10: { spec: { tipo: "amigos10" }, ok: (q) => q.op === "+" && (q.resposta === 10 || q.a === 10 || q.b === 10) },
  somaCruza: { spec: { tipo: "somaCruza", max: 18 }, ok: (q) => q.op === "+" && q.resposta >= 11 && q.resposta <= 18 && q.a <= 9 && q.b <= 9 },
  subAte: { spec: { tipo: "subAte", max: 10 }, ok: (q) => q.op === "-" && q.a <= 10 && q.resposta >= 1 },
  subSem: { spec: { tipo: "subSem" }, ok: (q) => q.op === "-" && q.a >= 11 && q.a <= 19 && q.b <= q.a % 10 },
  subCruza: { spec: { tipo: "subCruza" }, ok: (q) => q.op === "-" && q.a >= 11 && q.a <= 18 && q.b > q.a % 10 && q.resposta >= 1 && q.resposta <= 9 },
  dezenas: { spec: { tipo: "dezenas" }, ok: (q) => q.a % 10 === 0 && q.b % 10 === 0 && q.resposta >= 10 && q.resposta <= 100 },
  doisDigitosSem: { spec: { tipo: "doisDigitos", op: "+" }, ok: (q) => q.op === "+" && (q.a % 10) + (q.b % 10) <= 9 && q.resposta <= 99 },
  doisDigitosCruzaMais: { spec: { tipo: "doisDigitosCruza", op: "+" }, ok: (q) => q.op === "+" && (q.a % 10) + (q.b % 10) >= 10 && q.resposta <= 100 },
  doisDigitosCruzaMenos: { spec: { tipo: "doisDigitosCruza", op: "-" }, ok: (q) => q.op === "-" && q.a % 10 < q.b % 10 && q.resposta >= 1 },
  mistura: { spec: { tipo: "mistura", de: [{ tipo: "contar", max: 10 }, { tipo: "subAte", max: 10 }] }, ok: (q) => q.op === "+" || q.op === "-" },
};
for (const nome in SPECS) {
  const { spec, ok: valida } = SPECS[nome];
  for (let i = 0; i < 400; i++) {
    const q = MathEngine.gerarPerguntaConta(spec);
    const calc = q.op === "+" ? q.a + q.b : q.a - q.b;
    ok(calc === q.resposta, `${nome}: a ${q.op} b = resposta (${q.texto})`);
    ok(valida(q), `${nome}: restrições do degrau (${q.texto})`);
    ok(q.chave === MathEngine.chaveConta(q.fatoA, q.fatoB, q.op), `${nome}: chave coerente`);
    ok(!!q.falado, `${nome}: tem texto falado`);
  }
}

// subtração nunca inverte a ordem exibida (não é comutativa)
for (let i = 0; i < 300; i++) {
  const q = MathEngine.gerarPerguntaConta({ tipo: "subCruza" });
  ok(q.a === q.fatoA && q.b === q.fatoB, "subtração mantém a ordem a−b");
}

// opções de conta: 4 únicas, positivas, com a resposta e o erro de dezena
for (let i = 0; i < 1000; i++) {
  const q = MathEngine.gerarPerguntaConta({ tipo: "doisDigitosCruza", op: "+" });
  const ops = MathEngine.gerarOpcoesConta(q.resposta, q.a, q.b, q.op);
  ok(ops.length === 4 && new Set(ops).size === 4, "conta: 4 opções únicas");
  ok(ops.includes(q.resposta), "conta: contém a resposta");
  ok(ops.every((n) => n > 0), "conta: opções positivas");
  ok(ops.includes(q.resposta - 10), `vai-um esquecido entre as opções (${q.texto})`);
}
for (let i = 0; i < 1000; i++) {
  const q = MathEngine.gerarPerguntaConta({ tipo: "doisDigitosCruza", op: "-" });
  const ops = MathEngine.gerarOpcoesConta(q.resposta, q.a, q.b, q.op);
  ok(ops.includes(q.resposta + 10), `emprestar esquecido entre as opções (${q.texto})`);
}

// repetição inteligente na soma: fato fraco "3+7" aparece mais
{
  const fracos = { "3+7": 8 };
  let c37 = 0;
  const M = 4000;
  for (let i = 0; i < M; i++) {
    const q = MathEngine.gerarPerguntaConta({ tipo: "somaAte", max: 10 }, fracos);
    if (MathEngine.chaveConta(q.fatoA, q.fatoB, "+") === "3+7") c37++;
  }
  // sem peso, 3+7 sairia ~2% (2 de ~45 pares); com peso 8 deve passar de 8%
  ok(c37 / M > 0.08, `3+7 ponderado deve aparecer mais (${((c37 / M) * 100).toFixed(1)}%)`);
}

// divisão compartilha os pesos da repetição inteligente com a tabuada:
// o peso de "7x8" também puxa 56 ÷ 7
{
  let cont56 = 0;
  for (let i = 0; i < N; i++) {
    const q = MathEngine.gerarPerguntaDivisao([7], { min: 1, max: 10 }, fatos);
    if (q.a === 56) cont56++;
  }
  const f56 = cont56 / N;
  ok(f56 > 0.25, `56÷7 ponderado pelo peso de 7x8 deve aparecer mais (${(f56 * 100).toFixed(1)}%)`);
}

// ===================== RODADA UNIFICADA + CACHE =====================

// gerarRodada: pergunta + 4 opções coerentes em cada operação
{
  const faixaR = { min: 1, max: 10 };
  const faseTab = { tabuadas: [7] };
  const faseDiv = { tabuadas: [7] };
  const faseSoma = { conta: { tipo: "somaCruza", max: 18 } };
  for (let i = 0; i < 500; i++) {
    const rt = MathEngine.gerarRodada("tabuada", faseTab, faixaR);
    ok(rt.pergunta.a * rt.pergunta.b === rt.pergunta.resposta, "rodada tabuada: conta exata");
    ok(rt.opcoes.length === 4 && new Set(rt.opcoes).size === 4, "rodada tabuada: 4 opções únicas");
    ok(rt.opcoes.includes(rt.pergunta.resposta), "rodada tabuada: contém a resposta");

    const rd = MathEngine.gerarRodada("divisao", faseDiv, faixaR);
    ok(rd.pergunta.a === rd.pergunta.b * rd.pergunta.resposta, "rodada divisão: conta exata");
    ok(rd.opcoes.length === 4 && rd.opcoes.includes(rd.pergunta.resposta), "rodada divisão: opções ok");
    // divisão NÃO usa a linha vizinha: os distratores ficam na escala do
    // quociente (1..10 + deltas), nunca na escala dos produtos (>= 14)
    ok(rd.opcoes.every((n) => n >= 1 && n <= rd.pergunta.resposta + 6),
      `rodada divisão: distratores na escala do quociente (${rd.opcoes})`);

    const rs = MathEngine.gerarRodada("soma", faseSoma, faixaR);
    const calc = rs.pergunta.op === "+" ? rs.pergunta.a + rs.pergunta.b : rs.pergunta.a - rs.pergunta.b;
    ok(calc === rs.pergunta.resposta, "rodada soma: conta exata");
    ok(rs.opcoes.length === 4 && rs.opcoes.includes(rs.pergunta.resposta), "rodada soma: opções ok");
  }
}

// candidatosConta: cache por spec (mesma lista entre chamadas) e lista imutável
{
  const spec = { tipo: "mistura", de: [{ tipo: "doisDigitosCruza", op: "+" }, { tipo: "doisDigitosCruza", op: "-" }] };
  const l1 = MathEngine.candidatosConta(spec);
  const l2 = MathEngine.candidatosConta(spec);
  ok(l1 === l2, "candidatosConta: mesma lista cacheada entre chamadas (sem re-enumerar)");
  ok(l1.length > 1000, "candidatosConta: spec de 2 dígitos tem muitos candidatos");
  MathEngine.gerarPerguntaConta(spec, { "27+45": 8 }); // ramo ponderado
  ok(l1.every((c) => !("peso" in c)), "sorteio ponderado não grava peso na lista cacheada");
  ok(l1.every((c) => c.chave === MathEngine.chaveConta(c.a, c.b, c.op)),
    "candidatos têm a chave de peso pré-calculada");
}

resumo();
