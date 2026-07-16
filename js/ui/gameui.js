/**
 * GameUI — camada HTML de gameplay sobre o canvas do Phaser.
 *
 * Os botões de RESPOSTA (e a pausa) eram desenhados no canvas e sofriam do bug
 * de área de toque do Phaser (toques perto da borda caíam no botão vizinho ou
 * em zona morta → acerto julgado como erro). Aqui eles são <button> HTML reais,
 * posicionados sobre a região inferior do canvas, com detecção de toque nativa.
 *
 * As cenas Phaser (GameScene/TrainScene) continuam desenhando inimigo, conta,
 * timer e HUD no canvas, e chamam GameUI para mostrar/atualizar as respostas e
 * receber o toque de volta.
 */
const GameUI = (() => {
  const CORES = ["rosa", "roxo", "ciano", "ouro"];
  let onPick = null; // callback(valorNumero) da resposta tocada
  let acoesPausa = {}; // { continuar, fases, menu }

  const el = (id) => document.getElementById(id);
  const root = () => el("jogo-root");
  const grade = () => el("jogo-respostas");
  const btns = () =>
    grade() ? Array.from(grade().querySelectorAll(".resp-btn")) : [];

  /** Posiciona a faixa de respostas e o botão de pausa sobre o canvas. */
  function posicionar() {
    const g = window.game;
    if (!g || !g.canvas) return;
    const r = g.canvas.getBoundingClientRect();
    const resp = grade();
    if (resp) {
      resp.style.left = r.left + "px";
      resp.style.width = r.width + "px";
      resp.style.top = r.top + r.height * 0.585 + "px";
      resp.style.height = r.height * 0.345 + "px";
    }
    const pb = el("jogo-pausa-btn");
    if (pb) {
      pb.style.top = r.top + 10 + "px";
      pb.style.right = window.innerWidth - (r.left + r.width) + 12 + "px";
    }
  }

  const api = {
    /** entra no modo gameplay: mostra a camada + botão de pausa/menu */
    entrar(opts) {
      opts = opts || {};
      const r = root();
      if (!r) return;
      api.fecharModal();
      const pb = el("jogo-pausa-btn");
      if (pb) {
        if (opts.onPause) {
          pb.hidden = false;
          pb.textContent = "⏸";
          pb._fn = opts.onPause;
        } else if (opts.onMenu) {
          pb.hidden = false;
          pb.textContent = "↩";
          pb._fn = opts.onMenu;
        } else {
          pb.hidden = true;
          pb._fn = null;
        }
      }
      r.hidden = false;
      api.esconderRespostas();
      posicionar();
      // recomputa posição no próximo quadro (canvas pode ainda estar ajustando)
      requestAnimationFrame(posicionar);
    },

    /** sai do gameplay (esconde toda a camada) */
    sair() {
      const r = root();
      if (r) r.hidden = true;
      api.fecharModal();
    },

    /** mostra as 4 alternativas e registra o callback de toque */
    setRespostas(opcoes, pick) {
      onPick = pick;
      const bs = btns();
      bs.forEach((b, i) => {
        b.textContent = `${opcoes[i]}`;
        b.dataset.val = `${opcoes[i]}`;
        b.className = "resp-btn " + CORES[i];
        b.disabled = false;
      });
      const resp = grade();
      if (resp) resp.hidden = false;
      posicionar();
    },

    /** feedback do resultado: pinta a correta (verde) e a errada (vermelha) e trava */
    feedback(correta, errada) {
      btns().forEach((b) => {
        b.disabled = true;
        if (b.dataset.val === `${correta}`) b.classList.add("certo");
        if (errada != null && b.dataset.val === `${errada}`) b.classList.add("errado");
      });
    },

    esconderRespostas() {
      const resp = grade();
      if (resp) resp.hidden = true;
    },

    /**
     * Apaga alternativas erradas (dica 5050 do pet 🦜): os botões com esses
     * valores ficam desabilitados e "apagados", sem sair do lugar.
     */
    apagarOpcoes(valores) {
      const alvo = valores.map((v) => `${v}`);
      btns().forEach((b) => {
        if (alvo.indexOf(b.dataset.val) !== -1) {
          b.disabled = true;
          b.classList.add("apagado");
        }
      });
    },

    /** Anuncia texto para leitores de tela (a conta é desenhada no canvas). */
    anunciar(texto) {
      const p = el("jogo-anuncio");
      if (p) p.textContent = texto;
    },

    // ----- pausa -----
    setPausaAcoes(acoes) {
      acoesPausa = acoes || {};
    },
    abrirModal() {
      const m = el("jogo-modal");
      if (m) m.hidden = false;
    },
    fecharModal() {
      const m = el("jogo-modal");
      if (m) m.hidden = true;
    },

    posicionar,

    /** liga os listeners (uma vez) */
    init() {
      const r = root();
      if (!r) return;
      // respostas
      const resp = grade();
      if (resp) {
        resp.addEventListener("click", (ev) => {
          const b = ev.target.closest(".resp-btn");
          if (!b || b.disabled) return;
          AudioFX.unlock();
          if (onPick) onPick(Number(b.dataset.val));
        });
      }
      // pausa / menu
      const pb = el("jogo-pausa-btn");
      if (pb) {
        pb.addEventListener("click", () => {
          AudioFX.unlock();
          if (pb._fn) pb._fn();
        });
      }
      // ações do modal de pausa
      const m = el("jogo-modal");
      if (m) {
        m.addEventListener("click", (ev) => {
          const alvo = ev.target.closest("[data-pausa]");
          if (!alvo) return;
          AudioFX.unlock();
          const fn = acoesPausa[alvo.dataset.pausa];
          if (fn) fn();
        });
      }
    },
  };

  return api;
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => GameUI.init());
} else {
  GameUI.init();
}
