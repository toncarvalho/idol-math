/**
 * Efeitos de ataque (cosméticos da loja): o visual do projétil que a heroína
 * dispara a cada acerto (GameScene.animarAtaque). O 1º ("Raio") é o padrão,
 * grátis e sempre possuído; os demais são comprados com moedas.
 *
 * `tex` é a chave da textura — todas são geradas proceduralmente no BootScene
 * (gerarEfeitos), sem arquivo de asset. Equipar é POR PERFIL (não por herói):
 * Storage.efeitoEquipado / comprarEfeito / equiparEfeito.
 */
const EFEITOS = [
  { id: "fx-raio", nome: "Raio", icone: "⚡", preco: 0, tex: "raio" },
  { id: "fx-coracao", nome: "Coração", icone: "💗", preco: 150, tex: "fx-coracao" },
  { id: "fx-estrela", nome: "Estrela", icone: "🌟", preco: 200, tex: "fx-estrela" },
  { id: "fx-nota", nome: "Nota", icone: "🎵", preco: 250, tex: "fx-nota" },
];

/** Efeito pelo id (fallback: o padrão). */
function getEfeito(id) {
  return EFEITOS.find((e) => e.id === id) || EFEITOS[0];
}

/** Efeito padrão (grátis). */
function efeitoBase() {
  return EFEITOS[0];
}

/**
 * Chave de textura do projétil do perfil atual (efeito equipado na loja).
 * Fallback para o raio padrão quando não há Storage (testes) ou nada equipado.
 */
function texturaEfeito() {
  if (typeof Storage !== "undefined" && Storage.efeitoEquipado) {
    return getEfeito(Storage.efeitoEquipado()).tex;
  }
  return efeitoBase().tex;
}
