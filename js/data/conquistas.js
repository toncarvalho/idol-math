/**
 * Conquistas (medalhas). Cada uma tem uma condição pura `cond(s)` avaliada
 * sobre um "snapshot" do progresso (ver Storage.avaliarConquistas). Desbloquear
 * dá moedas (`recompensa`). Tudo por perfil.
 *
 * snapshot s: { acertos, totalEstrelas, faseMax, bossRush, maxCombo,
 *               semErroVitorias, tempoMs, estrelasFase: {faseId:0..3} }
 */
const CONQUISTAS = [
  // estrelas só existem ao vencer fase (qualquer mundo) → vale para Soma/Divisão
  { id: "estreia", icone: "🎤", nome: "Estreia", desc: "Vença a 1ª fase", recompensa: 20,
    cond: (s) => s.totalEstrelas >= 1 },
  { id: "combo10", icone: "🔥", nome: "Combo x10", desc: "Faça um combo de 10", recompensa: 30,
    cond: (s) => s.maxCombo >= 10 },
  { id: "perfeito", icone: "💯", nome: "Show perfeito", desc: "Vença uma fase sem errar", recompensa: 40,
    cond: (s) => s.semErroVitorias >= 1 },
  { id: "cem", icone: "🧠", nome: "Cem acertos", desc: "Acerte 100 contas", recompensa: 30,
    cond: (s) => s.acertos >= 100 },
  // metas de estrela sobre o teto dos 3 mundos (36 fases × 3 = 108)
  { id: "meio", icone: "⭐", nome: "Meio caminho", desc: "Junte 54 estrelas", recompensa: 30,
    cond: (s) => s.totalEstrelas >= 54 },
  { id: "ouro", icone: "🌟", nome: "Tudo dourado", desc: "Junte 108 estrelas", recompensa: 100,
    cond: (s) => s.totalEstrelas >= 108 },
  { id: "mestre7", icone: "7️⃣", nome: "Mestre do 7", desc: "3 estrelas na fase do 7", recompensa: 40,
    cond: (s) => (s.estrelasFase[7] || 0) >= 3 },
  { id: "bossrush", icone: "💀", nome: "Sobrevivente", desc: "Desbloqueie o Boss Rush", recompensa: 50,
    cond: (s) => !!s.bossRush },
  { id: "imperatriz", icone: "👑", nome: "Imperatriz", desc: "Vença a fase 12", recompensa: 80,
    cond: (s) => (s.estrelasFase[12] || 0) >= 1 },
  { id: "maratona", icone: "⏱️", nome: "Maratona", desc: "Jogue 20 minutos", recompensa: 30,
    cond: (s) => s.tempoMs >= 20 * 60000 },
];

function getConquista(id) {
  return CONQUISTAS.find((c) => c.id === id) || null;
}
