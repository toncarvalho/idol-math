/**
 * Dados do jogo (data-driven).
 *
 * O jogo é organizado em MUNDOS (habilidades matemáticas); cada fase pertence
 * a um mundo. Dentro de um mundo, a dificuldade vem da fase (qual conteúdo é
 * treinado). A mecânica (velocidade, intervalo do fator, força do chefão) é
 * CONSTANTE em todas as fases — só o conteúdo muda. Ajuste tudo isso em JOGO.
 *
 * Para adicionar/editar uma fase, mexa em FASES.
 *
 * REGRAS DE SEGURANÇA DO SAVE (invioláveis — progresso salvo por faseId):
 *  - As fases da Tabuada mantêm os ids 1–12 para sempre; nunca renumerar.
 *  - Fases de mundos novos usam ids string próprios (ex.: "s1".., "d1"..).
 *  - A ordem dentro do array FASES define a progressão do mundo.
 */

/** Config global (mecânica constante entre as fases). */
const JOGO = {
  faixaFator: { min: 1, max: 10 }, // segundo fator das contas (ex.: 7 × n, n de 1..10)
  tempoResposta: 10, // segundos por pergunta (null = sem timer)
  numInimigos: 6, // inimigos comuns antes do chefão
  bossHp: 8, // acertos para derrotar o chefão
  vidas: 3, // vidas na fase normal e no Desafio do Dia
  vidasBossRush: 5, // vidas no Boss Rush (12 chefões seguidos)
  inimigosDesafio: 10, // inimigos do Desafio do Dia (sem chefão)
  pontos: {
    base: 10, // pontos por acerto (× combo)
    chefao: 20, // pontos por acerto no chefão (× combo)
    bonusVida: 50, // bônus de vitória por vida restante
    bonusCombo: 5, // bônus de vitória por ponto de combo máximo
  },
  moedas: {
    acerto: 2, // moedas por acerto em partida
    treinoAcerto: 1, // moedas por acerto no Treino
    bonusVitoria: 20, // bônus fixo ao vencer
    porEstrela: 10, // bônus por estrela conquistada
    desafioBase: 30, // recompensa base do Desafio do Dia
    desafioPorDia: 5, // extra por dia de ofensiva...
    desafioTetoDias: 7, // ...até este teto de dias
  },
  mecanicas: {
    // números das mecânicas especiais de chefão (QUAL mecânica cada chefão usa
    // é conteúdo → boss.mecanica na fase; o catálogo é MECANICAS_CHEFAO abaixo)
    tempoCurtoSeg: 6, // "tempoCurto": segundos por pergunta no chefão (< tempoResposta)
    embaralhaMs: 3500, // "embaralha": tempo até o chefão embaralhar as respostas
    blindadoGolpes: 2, // "blindado": acertos seguidos para causar 1 de dano...
    blindadoFatorHp: 0.5, // ...com HP reduzido para compensar (bossHp × fator)
    curaPorErro: 1, // "curandeiro": HP que o chefão recupera a cada erro
  },
  powerups: {
    comboEscudo: 4, // a cada combo múltiplo disto ganha 🛡️ escudo (máx. 1 guardado)
    comboRaio: 8, // a cada combo múltiplo disto ganha ⚡ golpe duplo (máx. 1)
  },
};

/**
 * Catálogo das mecânicas especiais de chefão (id → apresentação no banner/HUD).
 * Cada fase declara a sua em `boss.mecanica` (opcional — chefão sem mecânica é
 * o "baunilha" das primeiras fases). Os números ficam em JOGO.mecanicas.
 */
const MECANICAS_CHEFAO = {
  tempoCurto: { icone: "⏱️", nome: "Apressado", desc: "Menos tempo por pergunta!" },
  embaralha: { icone: "🌀", nome: "Trapaceiro", desc: "Embaralha as respostas!" },
  blindado: { icone: "🛡️", nome: "Blindado", desc: "Só 2 acertos seguidos causam dano!" },
  curandeiro: { icone: "💖", nome: "Curandeiro", desc: "Se cura quando você erra!" },
};

/** Mecânica do chefão de uma fase ({ id, icone, nome, desc }) ou null. */
function getMecanicaChefao(fase) {
  const id = fase && fase.boss && fase.boss.mecanica;
  const m = id ? MECANICAS_CHEFAO[id] : null;
  return m ? Object.assign({ id }, m) : null;
}

/**
 * MUNDOS — cada um cobre uma habilidade matemática, na ordem pedagógica da
 * escola (Soma & Subtração vem ANTES da Tabuada). Mundos com `emBreve: true`
 * aparecem na seleção como prévia, mas ainda não têm fases jogáveis.
 * `cor` tinge o card na seleção de mundos.
 */
const MUNDOS = [
  {
    id: "soma",
    nome: "Soma & Subtração",
    emoji: "🌟",
    descricao: "Contas de mais e de menos (1º–2º ano)",
    cor: 0x36d96b,
  },
  {
    id: "tabuada",
    nome: "Tabuada",
    emoji: "🎤",
    descricao: "Multiplicação do 1 ao 10 (3º ano)",
    cor: 0xff3ea5,
  },
  {
    id: "divisao",
    nome: "Divisão",
    emoji: "⚡",
    descricao: "A tabuada ao contrário (4º ano)",
    cor: 0x3ea5ff,
  },
];

/**
 * 12 fases. Cada inimigo comum precisa de 1 acerto; o chefão tem JOGO.bossHp.
 * corTema é usada no fundo/HUD da fase. `tabuadas` define o foco da fase.
 * `mundo` liga a fase a um MUNDOS.id — fases sem o campo pertencem à
 * "tabuada" (as 12 originais, anteriores aos mundos; ver mundoDaFase).
 */
const FASES = [
  {
    id: 1,
    nome: "Palco Neon",
    descricao: "Aqueça a plateia com as tabuadas 1 e 2!",
    tabuadas: [1, 2],
    corTema: 0x7b2ff7,
    inimigoEmoji: "🧚",
    boss: { nome: "Fadinha do Beat", emoji: "🧚", frase: "Mostre seu brilho!" },
  },
  {
    id: 2,
    nome: "Trio Trovão",
    descricao: "Revisão geral: tabuadas do 1 ao 3.",
    tabuadas: [1, 2, 3],
    corTema: 0x9b3ff7,
    inimigoEmoji: "⛈️",
    boss: { nome: "Trio Trovão", emoji: "⛈️", frase: "Três relâmpagos contra você!" },
  },
  {
    id: 3,
    nome: "Batida do Três",
    descricao: "Foco total na tabuada do 3.",
    tabuadas: [3],
    corTema: 0xff3ea5,
    inimigoEmoji: "🎧",
    boss: { nome: "DJ Tríade", emoji: "🎧", frase: "Sente o ritmo do três!", mecanica: "tempoCurto" },
  },
  {
    id: 4,
    nome: "Quarteto do Caos",
    descricao: "Foco total na tabuada do 4.",
    tabuadas: [4],
    corTema: 0xff5a3e,
    inimigoEmoji: "🥁",
    boss: { nome: "Quarteto do Caos", emoji: "🥁", frase: "Quatro batidas, sem erro!", mecanica: "embaralha" },
  },
  {
    id: 5,
    nome: "Penta Diva",
    descricao: "Foco total na tabuada do 5.",
    tabuadas: [5],
    corTema: 0xffd23e,
    inimigoEmoji: "⭐",
    boss: { nome: "Penta Diva", emoji: "⭐", frase: "Cinco estrelas no palco!", mecanica: "curandeiro" },
  },
  {
    id: 6,
    nome: "Sexteto Sombrio",
    descricao: "Foco total na tabuada do 6.",
    tabuadas: [6],
    corTema: 0x2ff7e6,
    inimigoEmoji: "🦇",
    boss: { nome: "Sexteto Sombrio", emoji: "🦇", frase: "Seis sombras te cercam!", mecanica: "blindado" },
  },
  {
    id: 7,
    nome: "Sete Trovões",
    descricao: "Foco total na tabuada do 7.",
    tabuadas: [7],
    corTema: 0x3ea5ff,
    inimigoEmoji: "🌩️",
    boss: { nome: "Sete Trovões", emoji: "🌩️", frase: "O sete ribomba!", mecanica: "tempoCurto" },
  },
  {
    id: 8,
    nome: "Aranha do Oito",
    descricao: "Foco total na tabuada do 8.",
    tabuadas: [8],
    corTema: 0x7b2ff7,
    inimigoEmoji: "🕷️",
    boss: { nome: "Aranha do Oito", emoji: "🕷️", frase: "Caia na minha teia!", mecanica: "embaralha" },
  },
  {
    id: 9,
    nome: "Nove Vidas",
    descricao: "Foco total na tabuada do 9.",
    tabuadas: [9],
    corTema: 0xff3ea5,
    inimigoEmoji: "🐈‍⬛",
    boss: { nome: "Nove Vidas", emoji: "🐈‍⬛", frase: "Nenhuma das minhas vidas perde!", mecanica: "curandeiro" },
  },
  {
    id: 10,
    nome: "Deca Rainha",
    descricao: "Foco total na tabuada do 10.",
    tabuadas: [10],
    corTema: 0xffd23e,
    inimigoEmoji: "👑",
    boss: { nome: "Deca Rainha", emoji: "👑", frase: "O dez é meu reino!", mecanica: "blindado" },
  },
  {
    id: 11,
    nome: "Caos Total",
    descricao: "Misturão! Todas as tabuadas de 1 a 10.",
    tabuadas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    corTema: 0xff5a3e,
    inimigoEmoji: "🌀",
    boss: { nome: "Caos Total", emoji: "🌀", frase: "Tudo ao mesmo tempo agora!", mecanica: "embaralha" },
  },
  {
    id: 12,
    nome: "Estádio Final",
    descricao: "A grande final! Todas as tabuadas, o mundo assistindo.",
    tabuadas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    corTema: 0xffd23e,
    inimigoEmoji: "🤘",
    boss: { nome: "Imperatriz Sônica", emoji: "👑", frase: "Só uma lenda me vence. Prove!", mecanica: "blindado" },
  },
];

/** Ids de fase podem ser number (Tabuada, 1–12) ou string ("s1", "d1"...) —
 *  a comparação é sempre por String para o dataset HTML funcionar igual. */
/**
 * MUNDO DA DIVISÃO — a "Turnê Reversa": os mesmos chefões da Tabuada voltam,
 * agora com as contas ao contrário (56 ÷ 7). Cada fase dN espelha a fase N:
 * mesma tabuada (como divisor), mesma mecânica de chefão e a MESMA arte
 * (imgInimigo/imgBoss reaproveitam as texturas inimigoN/bossN — nenhum SVG
 * novo). `foco` é o rótulo do tile na grade (a Tabuada deriva de `tabuadas`).
 */
const NOMES_DIVISAO = [
  { nome: "Palco Espelhado", desc: "A turnê reversa começa: divida por 1 e 2!", frase: "Agora é tudo ao contrário!" },
  { nome: "Trovão Reverso", desc: "Revisão ao contrário: divida por 1, 2 e 3.", frase: "Três raios, divididos!" },
  { nome: "Batida Partida", desc: "A tabuada do 3 ao contrário: 21 ÷ 3!", frase: "Reparta o ritmo comigo!" },
  { nome: "Caos ao Contrário", desc: "A tabuada do 4 ao contrário: 32 ÷ 4!", frase: "Quatro batidas... divididas!" },
  { nome: "Diva Invertida", desc: "A tabuada do 5 ao contrário: 45 ÷ 5!", frase: "Divida o palco comigo!" },
  { nome: "Sombras Repartidas", desc: "A tabuada do 6 ao contrário: 54 ÷ 6!", frase: "Divido as sombras... e você?" },
  { nome: "Trovões Partidos", desc: "A tabuada do 7 ao contrário: 63 ÷ 7!", frase: "O sete ribomba ao contrário!" },
  { nome: "Teia Dividida", desc: "A tabuada do 8 ao contrário: 72 ÷ 8!", frase: "Minha teia se divide em oito!" },
  { nome: "Vidas Repartidas", desc: "A tabuada do 9 ao contrário: 81 ÷ 9!", frase: "Reparto minhas vidas, nunca perco!" },
  { nome: "Reino Dividido", desc: "A tabuada do 10 ao contrário: 90 ÷ 10!", frase: "Dividir e reinar!" },
  { nome: "Caos Repartido", desc: "Misturão reverso! Divida por 1 a 10.", frase: "Tudo dividido ao mesmo tempo!" },
  { nome: "Estádio Reverso", desc: "A grande final da turnê reversa!", frase: "Divida comigo o palco final!" },
];
// espelha as 12 fases da Tabuada (snapshot: FASES ainda só tem a Tabuada aqui)
FASES.slice(0, NOMES_DIVISAO.length).forEach((f, i) => {
  const d = NOMES_DIVISAO[i];
  const t = f.tabuadas;
  FASES.push({
    id: `d${f.id}`,
    mundo: "divisao",
    nome: d.nome,
    descricao: d.desc,
    tabuadas: t,
    foco: t.length >= 10 ? "Mix ÷" : t.length === 1 ? `÷ ${t[0]}` : `÷ ${t[0]}–${t[t.length - 1]}`,
    corTema: f.corTema,
    inimigoEmoji: f.inimigoEmoji,
    imgInimigo: `inimigo${f.id}`,
    imgBoss: `boss${f.id}`,
    boss: {
      nome: f.boss.nome,
      emoji: f.boss.emoji,
      frase: d.frase,
      mecanica: f.boss.mecanica,
    },
  });
});

/**
 * MUNDO SOMA & SUBTRAÇÃO — a "Turnê de Ensaio" (prequel: os chefões antes da
 * fama, mesma arte via imgInimigo/imgBoss). Escada pedagógica em DEGRAUS
 * MÍNIMOS (1º–2º ano): cada fase adiciona UMA dificuldade nova. O conteúdo
 * de cada fase é um spec `conta` (catálogo em MathEngine.candidatosConta).
 */
const FASES_SOMA = [
  { nome: "Primeiro Ensaio", desc: "Some 1 ou 2: um passo de cada vez!", foco: "+1 +2",
    conta: { tipo: "contar", max: 10 }, frase: "Vamos começar devagarinho!" },
  { nome: "Aquecimento", desc: "Todas as somas até 10.", foco: "+ até 10",
    conta: { tipo: "somaAte", max: 10 }, frase: "Aqueça esses números!" },
  { nome: "Dança dos Dobros", desc: "Dobros e quase-dobros: 6+6, 6+7!", foco: "Dobros",
    conta: { tipo: "dobros", max: 20 }, frase: "Dobra o ritmo!" },
  { nome: "Amigos do Dez", desc: "Pares que fazem 10, e somas com 10.", foco: "Faz 10",
    conta: { tipo: "amigos10" }, frase: "Todo número tem seu par!" },
  { nome: "Salto da Dezena", desc: "Somas que passam do 10: 8+5!", foco: "+ passa 10",
    conta: { tipo: "somaCruza", max: 18 }, frase: "Salte além do dez!" },
  { nome: "Passos para Trás", desc: "Agora é tirar: subtração até 10.", foco: "− até 10",
    conta: { tipo: "subAte", max: 10 }, frase: "Volte no escuro!" },
  { nome: "Ritmo Leve", desc: "Tirar até 20, sem emprestar: 17−5.", foco: "− até 20",
    conta: { tipo: "subSem" }, frase: "Tire de leve, sem trovejar!" },
  { nome: "Salto para Trás", desc: "Subtração que passa do 10: 13−7!", foco: "− passa 10",
    conta: { tipo: "subCruza" }, frase: "Volte pela minha teia!" },
  { nome: "Show das Dezenas", desc: "Dezenas inteiras: 30+20, 70−40.", foco: "Dezenas",
    conta: { tipo: "dezenas" }, frase: "Dezenas inteiras, vidas inteiras!" },
  { nome: "Dupla no Palco", desc: "Dois dígitos tranquilos: 23+45, 57−24.", foco: "2 dígitos",
    conta: { tipo: "mistura", de: [{ tipo: "doisDigitos", op: "+" }, { tipo: "doisDigitos", op: "-" }] },
    frase: "Dois dígitos, um só reino!" },
  { nome: "Vai-Um no Palco", desc: "Somas com vai-um: 27+45!", foco: "Vai-um",
    conta: { tipo: "doisDigitosCruza", op: "+" }, frase: "O um vai... e você?" },
  { nome: "Ensaio Geral", desc: "Com emprestar + misturão: 52−27, 38+47!", foco: "Mix final",
    conta: { tipo: "mistura", de: [{ tipo: "doisDigitosCruza", op: "-" }, { tipo: "doisDigitosCruza", op: "+" }] },
    frase: "Mostre que está pronta para o palco!" },
];
// espelha as fases da TABUADA (as 12 primeiras do array; a Divisão já foi
// adicionada ao final, então filtramos pelas fases sem `mundo`)
FASES.filter((f) => !f.mundo).forEach((f, i) => {
  const s = FASES_SOMA[i];
  if (!s) return;
  FASES.push({
    id: `s${f.id}`,
    mundo: "soma",
    nome: s.nome,
    descricao: s.desc,
    conta: s.conta,
    foco: s.foco,
    corTema: f.corTema,
    inimigoEmoji: f.inimigoEmoji,
    imgInimigo: `inimigo${f.id}`,
    imgBoss: `boss${f.id}`,
    boss: {
      nome: f.boss.nome,
      emoji: f.boss.emoji,
      frase: s.frase,
      mecanica: f.boss.mecanica,
    },
  });
});

function getFase(id) {
  return FASES.find((f) => String(f.id) === String(id)) || FASES[0];
}

/** Existe uma fase com este id? */
function existeFase(id) {
  return FASES.some((f) => String(f.id) === String(id));
}

// ===================== MUNDOS (helpers) =====================

/** Mundo (id) ao qual a fase pertence — sem o campo, é a "tabuada". */
function mundoDaFase(fase) {
  return (fase && fase.mundo) || "tabuada";
}

function getMundo(mundoId) {
  return MUNDOS.find((m) => m.id === mundoId) || null;
}

/** Fases de um mundo, na ordem de progressão (a ordem do array FASES). */
function fasesDoMundo(mundoId) {
  return FASES.filter((f) => mundoDaFase(f) === mundoId);
}

/**
 * Posição (1-based) da fase dentro do seu mundo — é o número mostrado no tile
 * e a unidade de progresso salva por mundo (Storage.faseMax/desbloquearFase).
 * Para a Tabuada, índice === id (ids 1–12 em ordem), o que mantém os saves
 * antigos (faseDesbloqueada numérica) válidos sem migração.
 */
function indiceFase(faseId) {
  const f = getFase(faseId);
  return fasesDoMundo(mundoDaFase(f)).findIndex((x) => String(x.id) === String(f.id)) + 1;
}

/** A fase seguinte DENTRO do mesmo mundo, ou null se era a última. */
function proximaFase(faseId) {
  const f = getFase(faseId);
  const lista = fasesDoMundo(mundoDaFase(f));
  const i = lista.findIndex((x) => String(x.id) === String(f.id));
  return i >= 0 && i + 1 < lista.length ? lista[i + 1] : null;
}
