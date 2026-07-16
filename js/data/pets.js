/**
 * Pets companheiros: cada CONQUISTA desbloqueia um pet (além das moedas), e o
 * pet equipado acompanha a heroína no palco com um PODER automático — nenhum
 * botão novo durante o jogo. Equipar é por perfil (Storage.petEquipado).
 *
 * `poder.tipo` (implementados na GameScene; valem em fases, Desafio e Boss Rush):
 *  - moedasVitoria  (+valor% de moedas ao vencer)
 *  - congelaTempo   (1x por partida: congela o relógio quando está acabando)
 *  - guardaCombo    (1x por partida: o combo não zera ao errar)
 *  - tempoExtra     (+valor s de tempo em toda pergunta)
 *  - escudoInicial  (começa a partida com 🛡️ escudo)
 *  - dica5050       (1x por partida: esconde 2 respostas erradas na pergunta difícil)
 *  - moedasAcerto   (+valor moeda(s) por acerto)
 *  - danoChefao     (o 1º acerto em cada chefão causa +valor de dano)
 *  - vidaExtra      (+valor ❤️ no início; não infla as estrelas — ver GameScene)
 *  - reviver        (1x por partida: ao perder a última vida, volta com 1)
 *
 * Nenhum poder responde pela criança: o erro sempre conta para a repetição
 * inteligente e mostra a dica/grade. `img` é a chave de textura (BootScene);
 * `emoji` é o fallback se o SVG faltar. Arte: tools/gerar-pets.mjs.
 */
const PETS = [
  { id: "mimi", conquistaId: "estreia", nome: "Mimi", especie: "Gatinha", emoji: "🐱",
    img: "pet-mimi", poder: { tipo: "moedasVitoria", valor: 0.1 },
    poderDesc: "+10% de moedas ao vencer" },
  { id: "tato", conquistaId: "maratona", nome: "Tato", especie: "Tartaruga", emoji: "🐢",
    img: "pet-tato", poder: { tipo: "congelaTempo" },
    poderDesc: "1x por partida: congela o tempo quando está acabando" },
  { id: "pipoca", conquistaId: "combo10", nome: "Pipoca", especie: "Coelhinha", emoji: "🐰",
    img: "pet-pipoca", poder: { tipo: "guardaCombo" },
    poderDesc: "1x por partida: o combo não zera ao errar" },
  { id: "sofia", conquistaId: "cem", nome: "Sofia", especie: "Coruja", emoji: "🦉",
    img: "pet-sofia", poder: { tipo: "tempoExtra", valor: 2 },
    poderDesc: "+2s de tempo em toda pergunta" },
  { id: "rex", conquistaId: "meio", nome: "Rex", especie: "Cachorro", emoji: "🐶",
    img: "pet-rex", poder: { tipo: "escudoInicial" },
    poderDesc: "Começa a partida com 🛡️ escudo" },
  { id: "bis", conquistaId: "perfeito", nome: "Bis", especie: "Papagaio", emoji: "🦜",
    img: "pet-bis", poder: { tipo: "dica5050" },
    poderDesc: "1x por partida: canta a dica e esconde 2 respostas erradas" },
  { id: "zum", conquistaId: "mestre7", nome: "Zum", especie: "Abelha", emoji: "🐝",
    img: "pet-zum", poder: { tipo: "moedasAcerto", valor: 1 },
    poderDesc: "+1 moeda por acerto" },
  { id: "faisca", conquistaId: "bossrush", nome: "Faísca", especie: "Dragãozinho", emoji: "🐉",
    img: "pet-faisca", poder: { tipo: "danoChefao", valor: 1 },
    poderDesc: "Ataca junto: o 1º acerto em cada chefão causa dano extra" },
  { id: "majestade", conquistaId: "imperatriz", nome: "Majestade", especie: "Leão", emoji: "🦁",
    img: "pet-majestade", poder: { tipo: "vidaExtra", valor: 1 },
    poderDesc: "+1 ❤️ vida em toda partida" },
  { id: "luna", conquistaId: "ouro", nome: "Luna", especie: "Unicórnio", emoji: "🦄",
    img: "pet-luna", poder: { tipo: "reviver" },
    poderDesc: "1x por partida: ao perder a última ❤️, revive com 1" },
];

/** Pet pelo id (null se não existir — não force fallback: "sem pet" é válido). */
function getPet(id) {
  return PETS.find((p) => p.id === id) || null;
}

/** Pet que a conquista desbloqueia (null se a conquista não tiver pet). */
function petDaConquista(conquistaId) {
  return PETS.find((p) => p.conquistaId === conquistaId) || null;
}

/**
 * Pet equipado no perfil atual ({ ...PETS[i] } ou null), com guarda para os
 * testes/cenas: só devolve se ainda estiver desbloqueado (defesa contra saves
 * editados/importados).
 */
function petEquipadoInfo() {
  if (typeof Storage === "undefined" || !Storage.petEquipado) return null;
  const pet = getPet(Storage.petEquipado());
  if (!pet) return null;
  return Storage.petDesbloqueado(pet.id) ? pet : null;
}
