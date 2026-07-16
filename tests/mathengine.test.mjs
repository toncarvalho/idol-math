/**
 * Testes do MathEngine (rode com: node tests/mathengine.test.mjs).
 * Como o jogo é buildless (IIFE global), carregamos o arquivo e avaliamos.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(__dirname, "../js/core/MathEngine.js"), "utf8");
const MathEngine = new Function(code + "\nreturn MathEngine;")();

let falhas = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("  ✗", msg);
    falhas++;
  }
}

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

if (falhas) {
  console.error(`\n❌ ${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("✅ MathEngine: todos os testes passaram.");
