/**
 * MathEngine — geração pura de perguntas (multiplicação, divisão e contas
 * de +/−) e alternativas. Sem dependência do Phaser, fácil de testar
 * isoladamente.
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
   * Chave de peso para contas de +/− (repetição inteligente). Soma é
   * comutativa → canônica ("3+7"); subtração NÃO → preserva a ordem ("15-6").
   * Convivem no mesmo mapa `fatos` das chaves "AxB" da tabuada/divisão.
   */
  function chaveConta(a, b, op) {
    if (op === "+") return `${Math.min(a, b)}+${Math.max(a, b)}`;
    return `${a}-${b}`;
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
      chave: chaveFato(a, b),
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
      chave: chaveFato(fato.a, fato.b),
    };
  }

  // ===================== SOMA & SUBTRAÇÃO =====================

  /**
   * Catálogo dos geradores de conta (+/−). Cada fase do mundo Soma &
   * Subtração declara `conta: { tipo, ... }` — um degrau da escada
   * pedagógica (1º–2º ano), do contar pra frente até o emprestar:
   *
   *  contar {max}            a+1 / a+2, resultado ≤ max
   *  somaAte {max}           a+b ≤ max (a, b ≥ 1)
   *  dobros {max}            b ∈ {a−1, a, a+1} — dobros e quase-dobros
   *  amigos10                pares que fazem 10 (7+3) e somas com 10 (10+5)
   *  somaCruza {max}         a, b ∈ 2..9 cruzando a dezena (11 ≤ a+b ≤ max)
   *  subAte {max}            a−b com a ≤ max, resultado ≥ 1
   *  subSem                  11..19 menos unidades, SEM emprestar (17−5)
   *  subCruza                11..18 menos 2..9 cruzando a dezena (13−7)
   *  dezenas                 dezenas cheias, + e − (30+20, 70−40)
   *  doisDigitos {op}        2 dígitos SEM vai-um/emprestar (23+45, 57−24)
   *  doisDigitosCruza {op}   2 dígitos COM vai-um (27+45) ou emprestar (52−27)
   *  mistura {de: [spec...]} união de outros specs (fase final)
   */
  function enumerarCandidatos(spec) {
    const lista = [];
    // chave pré-calculada: o sorteio ponderado consulta fatos[c.chave] sem
    // montar a string a cada pergunta (specs de 2 dígitos têm milhares de itens)
    const add = (a, b, op) => lista.push({ a, b, op, chave: chaveConta(a, b, op) });
    switch (spec.tipo) {
      case "contar":
        for (let a = 1; a <= spec.max - 1; a++)
          for (const b of [1, 2]) if (a + b <= spec.max) add(a, b, "+");
        break;
      case "somaAte":
        for (let a = 1; a < spec.max; a++)
          for (let b = 1; b <= spec.max - a; b++) add(a, b, "+");
        break;
      case "dobros":
        for (let a = 2; a <= 10; a++)
          for (const b of [a - 1, a, a + 1])
            if (b >= 1 && a + b <= spec.max) add(a, b, "+");
        break;
      case "amigos10":
        for (let a = 1; a <= 9; a++) add(a, 10 - a, "+");
        for (let b = 1; b <= 9; b++) add(10, b, "+");
        break;
      case "somaCruza":
        for (let a = 2; a <= 9; a++)
          for (let b = 2; b <= 9; b++)
            if (a + b >= 11 && a + b <= spec.max) add(a, b, "+");
        break;
      case "subAte":
        for (let a = 2; a <= spec.max; a++)
          for (let b = 1; b <= a - 1; b++) add(a, b, "-");
        break;
      case "subSem":
        for (let a = 11; a <= 19; a++)
          for (let b = 1; b <= a % 10; b++) add(a, b, "-");
        break;
      case "subCruza":
        for (let a = 11; a <= 18; a++)
          for (let b = (a % 10) + 1; b <= 9; b++) add(a, b, "-");
        break;
      case "dezenas":
        for (let a = 10; a <= 90; a += 10) {
          for (let b = 10; b <= 100 - a; b += 10) add(a, b, "+");
          for (let b = 10; b < a; b += 10) add(a, b, "-");
        }
        break;
      case "doisDigitos":
        for (let a = 11; a <= 88; a++) {
          if (a % 10 === 0) continue;
          for (let b = 11; b <= 88; b++) {
            if (b % 10 === 0) continue;
            if (
              spec.op === "+"
                ? (a % 10) + (b % 10) <= 9 && a + b <= 99
                : a > b && a % 10 >= b % 10
            )
              add(a, b, spec.op);
          }
        }
        break;
      case "doisDigitosCruza":
        for (let a = 11; a <= 89; a++) {
          if (a % 10 === 0) continue;
          for (let b = 11; b <= 89; b++) {
            if (b % 10 === 0) continue;
            if (
              spec.op === "+"
                ? (a % 10) + (b % 10) >= 10 && a + b <= 100
                : a > b && a % 10 < b % 10
            )
              add(a, b, spec.op);
          }
        }
        break;
      case "mistura":
        spec.de.forEach((s) => lista.push(...candidatosConta(s)));
        break;
    }
    return lista;
  }

  /**
   * Candidatos do spec, com CACHE por spec (WeakMap): as fases declaram specs
   * constantes (`fase.conta`), então a enumeração — milhares de iterações nos
   * specs de 2 dígitos — acontece uma vez só, não a cada pergunta. A lista
   * cacheada é somente-leitura: quem sortear não deve gravar nela.
   */
  const cacheCandidatos = new WeakMap();
  function candidatosConta(spec) {
    let lista = cacheCandidatos.get(spec);
    if (!lista) {
      lista = enumerarCandidatos(spec);
      cacheCandidatos.set(spec, lista);
    }
    return lista;
  }

  /**
   * Gera uma pergunta de soma/subtração a partir do spec da fase, com o
   * mesmo sorteio ponderado da tabuada (fatos fracos aparecem mais; chaves
   * "3+7" / "15-6" via chaveConta). Soma alterna a ordem exibida; subtração
   * não (não é comutativa).
   */
  function gerarPerguntaConta(spec, fatos) {
    const lista = candidatosConta(spec);
    let pick;
    if (fatos && Object.keys(fatos).length) {
      // pesos num array paralelo — a lista cacheada não é mutada
      const pesos = new Array(lista.length);
      let total = 0;
      for (let i = 0; i < lista.length; i++) {
        pesos[i] = 1 + (fatos[lista[i].chave] || 0) * 1.5;
        total += pesos[i];
      }
      let r = Math.random() * total;
      pick = lista[0];
      for (let i = 0; i < lista.length; i++) {
        r -= pesos[i];
        if (r <= 0) {
          pick = lista[i];
          break;
        }
      }
    } else {
      pick = escolher(lista);
    }
    let a = pick.a;
    let b = pick.b;
    if (pick.op === "+" && Math.random() < 0.5) {
      const t = a;
      a = b;
      b = t;
    }
    const resposta = pick.op === "+" ? a + b : a - b;
    return {
      a,
      b,
      op: pick.op,
      resposta,
      texto: `${a} ${pick.op === "+" ? "+" : "−"} ${b}`,
      falado: pick.op === "+" ? `${a} mais ${b}` : `${a} menos ${b}`,
      fatoA: pick.a,
      fatoB: pick.b,
      chave: pick.chave,
    };
  }

  /**
   * Alternativas para contas de +/− com os erros que criança comete de
   * verdade: erro de dezena (esqueceu o vai-um: resposta−10 / não emprestou:
   * resposta+10), "inverteu as unidades" na subtração (52−27 → 35) e erros
   * de contagem (±1, ±2). Sempre 4 opções únicas e positivas.
   */
  function gerarOpcoesConta(resposta, a, b, op) {
    const opcoes = new Set([resposta]);
    const seeds = [];
    if (op === "+" && (a % 10) + (b % 10) >= 10) seeds.push(resposta - 10);
    if (op === "-" && a % 10 < b % 10) {
      seeds.push(resposta + 10);
      seeds.push((Math.floor(a / 10) - Math.floor(b / 10)) * 10 + ((b % 10) - (a % 10)));
    }
    seeds.push(resposta + 1, resposta - 1, resposta + 2, resposta - 2);
    for (const s of seeds) {
      if (opcoes.size >= 4) break;
      if (s > 0 && s !== resposta) opcoes.add(s);
    }
    completarOpcoes(opcoes, resposta);
    return embaralhar([...opcoes]);
  }

  /**
   * Completa o Set até 4 opções válidas (> 0, ≠ resposta): tenta deltas
   * aleatórios próximos (±6) e, se ainda faltar (respostas muito pequenas),
   * cai nos sequenciais resposta+1, +2... Final comum de gerarOpcoes e
   * gerarOpcoesConta.
   */
  function completarOpcoes(opcoes, resposta) {
    let i = 0;
    while (opcoes.size < 4 && i < 50) {
      const c = resposta + inteiroAleatorio(-6, 6);
      if (c > 0 && c !== resposta) opcoes.add(c);
      i++;
    }
    let extra = 1;
    while (opcoes.size < 4) {
      if (!opcoes.has(resposta + extra)) opcoes.add(resposta + extra);
      extra++;
    }
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

    // 2) completa com deltas plausíveis (próximos da resposta), depois o
    //    final comum (aleatórios ±6 e fallback sequencial)
    const deltasBase = [-1, 1, -2, 2, resposta > 12 ? -10 : -3, 3, -4, 4, 5, -5];
    for (const d of deltasBase) {
      if (opcoes.size >= 4) break;
      const candidato = resposta + d;
      if (candidato > 0 && candidato !== resposta) opcoes.add(candidato);
    }
    completarOpcoes(opcoes, resposta);
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

  /**
   * Rodada completa de uma pergunta da GameScene: { pergunta, opcoes } conforme
   * a operação do mundo da fase. Concentra a política de distratores:
   *  - "soma": spec `fase.conta` + gerarOpcoesConta (vai-um/emprestar, ±1±2);
   *  - "divisao": gerarOpcoes SEM a/b — os distratores certos são os quocientes
   *    vizinhos (deltas ±1, ±2); os produtos da linha vizinha teriam escala errada;
   *  - "tabuada": gerarOpcoes com os fatores (erros da linha vizinha).
   * Pura: `operacao` e `faixa` vêm de fora (o chamador usa mundoDaFase e
   * JOGO.faixaFator) — o MathEngine segue sem dependências.
   */
  function gerarRodada(operacao, fase, faixa, fatos) {
    if (operacao === "soma") {
      const pergunta = gerarPerguntaConta(fase.conta, fatos);
      return {
        pergunta,
        opcoes: gerarOpcoesConta(pergunta.resposta, pergunta.a, pergunta.b, pergunta.op),
      };
    }
    if (operacao === "divisao") {
      const pergunta = gerarPerguntaDivisao(fase.tabuadas, faixa, fatos);
      return { pergunta, opcoes: gerarOpcoes(pergunta.resposta) };
    }
    const pergunta = gerarPergunta(fase.tabuadas, faixa, fatos);
    return { pergunta, opcoes: gerarOpcoes(pergunta.resposta, pergunta.a, pergunta.b) };
  }

  return {
    gerarPergunta,
    gerarPerguntaDivisao,
    gerarPerguntaConta,
    gerarRodada,
    gerarOpcoes,
    gerarOpcoesConta,
    embaralhar,
    inteiroAleatorio,
    chaveFato,
    chaveConta,
    candidatosConta, // exposto para os testes (cache/consistência dos specs)
  };
})();
