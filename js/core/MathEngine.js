/**
 * MathEngine — geração pura de perguntas (multiplicação e divisão) e
 * alternativas. Sem dependência do Phaser, fácil de testar isoladamente.
 *
 * Multiplicação e divisão COMPARTILHAM a mesma tabela de fatos e os mesmos
 * pesos de repetição inteligente: errar 56 ÷ 7 e errar 7 × 8 é o mesmo buraco
 * de conhecimento (chaveFato canônica "7x8" para ambos).
 */
const MathEngine = (() => {
  function inteiroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function escolher(arr) {
    return arr[inteiroAleatorio(0, arr.length - 1)];
  }

  function chaveFato(a, b) {
    return `${Math.min(a, b)}x${Math.max(a, b)}`;
  }

  /**
   * Sorteia um fato (tabuada × fator) — ponderado pelos pesos de repetição
   * inteligente quando informados (fatos fracos aparecem mais). Compartilhado
   * pela multiplicação e pela divisão.
   */
  function sortearFato(tabuadas, faixa, fatos) {
    if (fatos && Object.keys(fatos).length) {
      // seleção ponderada: enumera combinações e favorece fatos fracos
      const combos = [];
      let total = 0;
      for (const t of tabuadas) {
        for (let f = faixa.min; f <= faixa.max; f++) {
          const peso = 1 + (fatos[chaveFato(t, f)] || 0) * 1.5;
          combos.push({ a: t, b: f, peso });
          total += peso;
        }
      }
      let r = Math.random() * total;
      for (const c of combos) {
        r -= c.peso;
        if (r <= 0) return c;
      }
      return combos[0];
    }
    return { a: escolher(tabuadas), b: inteiroAleatorio(faixa.min, faixa.max) };
  }

  /**
   * Gera uma pergunta de multiplicação.
   * @param {number[]} tabuadas  fatores "tema" da fase (ex.: [2,5,7])
   * @param {{min:number,max:number}} faixa  faixa do segundo fator
   * @param {Object} [fatos]  repetição inteligente: { "min x max": peso } — fatos
   *   com peso maior (mais errados) aparecem com mais frequência.
   * @returns {{a:number,b:number,resposta:number,texto:string,falado:string,
   *   fatoA:number,fatoB:number}}  a/b são os fatores COMO EXIBIDOS (ordem
   *   sorteada); fatoA/fatoB são os fatores canônicos do fato treinado (para
   *   registrar peso e desenhar a grade de pontos); falado é o texto por
   *   extenso para voz/leitor de tela.
   */
  function gerarPergunta(tabuadas, faixa, fatos) {
    const fato = sortearFato(tabuadas, faixa, fatos);
    const a = fato.a;
    const b = fato.b;
    // alterna a ordem para a jogadora não decorar posição
    const inverter = Math.random() < 0.5;
    const x = inverter ? b : a;
    const y = inverter ? a : b;
    return {
      a: x,
      b: y,
      resposta: a * b,
      texto: `${x} × ${y}`,
      falado: `${x} vezes ${y}`,
      fatoA: a,
      fatoB: b,
    };
  }

  /**
   * Gera uma pergunta de DIVISÃO — a tabuada ao contrário: sorteia o mesmo
   * fato da multiplicação e pergunta `(a×b) ÷ a`. O divisor vem de `tabuadas`
   * (a tabuada treinada pela fase); a resposta é o outro fator (1..faixa.max),
   * então os erros clássicos são os quocientes vizinhos (±1, ±2) — os deltas
   * de gerarOpcoes SEM passar a/b (os produtos vizinhos teriam escala errada).
   * fatoA/fatoB apontam o fato de multiplicação por trás (peso compartilhado).
   */
  function gerarPerguntaDivisao(tabuadas, faixa, fatos) {
    const fato = sortearFato(tabuadas, faixa, fatos);
    const divisor = fato.a;
    const quociente = fato.b;
    const produto = divisor * quociente;
    return {
      a: produto,
      b: divisor,
      resposta: quociente,
      texto: `${produto} ÷ ${divisor}`,
      falado: `${produto} dividido por ${divisor}`,
      fatoA: fato.a,
      fatoB: fato.b,
    };
  }

  /**
   * Gera 4 alternativas embaralhadas, sempre contendo a resposta,
   * com distratores plausíveis e sem duplicatas.
   *
   * Quando os fatores (a, b) são informados, prioriza os erros CLÁSSICOS de
   * tabuada — a "linha vizinha": a×(b±1) e (a±1)×b (ex.: 7×8 → 56, com 63,
   * 48 e 49 por perto) — o que treina de verdade, em vez de números aleatórios.
   * @param {number} resposta
   * @param {number} [a]  primeiro fator (opcional)
   * @param {number} [b]  segundo fator (opcional)
   * @returns {number[]}
   */
  function gerarOpcoes(resposta, a, b) {
    const opcoes = new Set([resposta]);

    // 1) distratores pedagógicos: até 2 resultados da "linha vizinha",
    //    sorteados para as alternativas não ficarem previsíveis
    if (a != null && b != null) {
      const vizinhos = embaralhar(
        [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b].filter(
          (n) => n > 0 && n !== resposta
        )
      );
      for (const v of vizinhos) {
        if (opcoes.size >= 3) break; // deixa ao menos 1 vaga p/ delta próximo
        opcoes.add(v);
      }
    }

    // 2) completa com deltas plausíveis (próximos da resposta)
    const deltasBase = [-1, 1, -2, 2, resposta > 12 ? -10 : -3, 3, -4, 4, 5, -5];

    let i = 0;
    while (opcoes.size < 4 && i < 50) {
      let candidato;
      if (i < deltasBase.length) {
        candidato = resposta + deltasBase[i];
      } else {
        candidato = resposta + inteiroAleatorio(-6, 6);
      }
      if (candidato > 0 && candidato !== resposta) {
        opcoes.add(candidato);
      }
      i++;
    }

    // fallback caso ainda falte (números muito pequenos)
    let extra = 1;
    while (opcoes.size < 4) {
      if (!opcoes.has(resposta + extra)) opcoes.add(resposta + extra);
      extra++;
    }

    return embaralhar([...opcoes]);
  }

  function embaralhar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = inteiroAleatorio(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { gerarPergunta, gerarPerguntaDivisao, gerarOpcoes, embaralhar, inteiroAleatorio, chaveFato };
})();
