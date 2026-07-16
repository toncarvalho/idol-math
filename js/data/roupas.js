/**
 * Roupas (cosméticos "de verdade") por personagem. Cada roupa é uma variante
 * da figura do herói (mesma identidade, roupa diferente), carregada como
 * textura no BootScene. A 1ª de cada herói é a "Padrão" (grátis, já possuída).
 *
 * `id` é a chave de textura (a base usa a chave do próprio herói, "heroiN").
 * `file` é o nome do SVG em assets/herois/ (os tiers 180/300 são gerados por
 * tools/gerar-roupas.mjs — edite lá e re-rode para mudar a arte).
 *
 * Preços em camadas (60/100/180/300) para dar objetivos de curto e longo
 * prazo. A "Dourada" (300) é a roupa-troféu: além das moedas exige um feito
 * do meta-game (`requisito`, avaliado por requisitoAtendido contra um
 * snapshot do progresso — ver Storage.requisitosSnapshot).
 */
const ROUPAS = {
  1: [
    { id: "heroi1", nome: "Padrão", preco: 0, file: "rubi" },
    { id: "rubi-festa", nome: "Festa", preco: 60, file: "rubi-festa" },
    { id: "rubi-inverno", nome: "Inverno", preco: 100, file: "rubi-inverno" },
    { id: "rubi-neon", nome: "Neon", preco: 180, file: "rubi-neon" },
    { id: "rubi-dourada", nome: "Dourada", preco: 300, file: "rubi-dourada",
      requisito: { tipo: "estrelas", valor: 36, desc: "Junte 36 ⭐" } },
  ],
  2: [
    { id: "heroi2", nome: "Padrão", preco: 0, file: "lorena" },
    { id: "lorena-rock", nome: "Rock", preco: 60, file: "lorena-rock" },
    { id: "lorena-esporte", nome: "Esporte", preco: 100, file: "lorena-esporte" },
    { id: "lorena-galaxia", nome: "Galáxia", preco: 180, file: "lorena-galaxia" },
    { id: "lorena-dourada", nome: "Dourada", preco: 300, file: "lorena-dourada",
      requisito: { tipo: "bossRush", desc: "Desbloqueie o Boss Rush 💀" } },
  ],
  3: [
    { id: "heroi3", nome: "Padrão", preco: 0, file: "mel" },
    { id: "mel-diva", nome: "Diva", preco: 60, file: "mel-diva" },
    { id: "mel-verao", nome: "Verão", preco: 100, file: "mel-verao" },
    { id: "mel-pop", nome: "Pop", preco: 180, file: "mel-pop" },
    { id: "mel-dourada", nome: "Dourada", preco: 300, file: "mel-dourada",
      requisito: { tipo: "ofensiva", valor: 7, desc: "Ofensiva de 7 dias 🔥" } },
  ],
  4: [
    { id: "heroi4", nome: "Padrão", preco: 0, file: "leo" },
    { id: "leo-aventura", nome: "Aventura", preco: 60, file: "leo-aventura" },
    { id: "leo-gamer", nome: "Gamer", preco: 100, file: "leo-gamer" },
    { id: "leo-astro", nome: "Astro", preco: 180, file: "leo-astro" },
    { id: "leo-dourada", nome: "Dourada", preco: 300, file: "leo-dourada",
      requisito: { tipo: "combo", valor: 15, desc: "Faça um combo x15 ⚡" } },
  ],
  5: [
    { id: "heroi5", nome: "Padrão", preco: 0, file: "priya" },
    { id: "priya-festival", nome: "Festival", preco: 60, file: "priya-festival" },
    { id: "priya-esporte", nome: "Esporte", preco: 100, file: "priya-esporte" },
    { id: "priya-show", nome: "Show", preco: 180, file: "priya-show" },
    { id: "priya-dourada", nome: "Dourada", preco: 300, file: "priya-dourada",
      requisito: { tipo: "acertos", valor: 300, desc: "Acerte 300 contas 🧠" } },
  ],
};

/** Lista de roupas de um herói. */
function roupasDoHeroi(heroId) {
  return ROUPAS[heroId] || ROUPAS[1];
}

/** Procura uma roupa pelo id de textura (em todos os heróis). */
function getRoupa(roupaId) {
  for (const k in ROUPAS) {
    const r = ROUPAS[k].find((x) => x.id === roupaId);
    if (r) return r;
  }
  return null;
}

/** Roupa "Padrão" (grátis) de um herói. */
function roupaBase(heroId) {
  return roupasDoHeroi(heroId)[0];
}

/**
 * O requisito da roupa-troféu foi cumprido? Pura: recebe um snapshot do
 * progresso ({ totalEstrelas, bossRush, melhorOfensiva, maxCombo, acertos })
 * para ser testável sem Storage. Roupa sem requisito passa sempre.
 */
function requisitoAtendido(roupa, snap) {
  const q = roupa && roupa.requisito;
  if (!q) return true;
  const s = snap || {};
  switch (q.tipo) {
    case "estrelas": return (s.totalEstrelas || 0) >= q.valor;
    case "bossRush": return !!s.bossRush;
    case "ofensiva": return (s.melhorOfensiva || 0) >= q.valor;
    case "combo": return (s.maxCombo || 0) >= q.valor;
    case "acertos": return (s.acertos || 0) >= q.valor;
    default: return false;
  }
}
