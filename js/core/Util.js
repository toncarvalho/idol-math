/**
 * Util — helpers pequenos: vibração (mobile), voz (Web Speech) e
 * flashcard de multiplicação. Tudo opcional/defensivo.
 */
const Util = (() => {
  return {
    /** Converte cor numérica (0xff3ea5) em string CSS ("#ff3ea5"). */
    corHex(cor) {
      return "#" + cor.toString(16).padStart(6, "0");
    },

    /** true se o usuário prefere movimento reduzido (evita shake/flash). */
    reduzirMovimento() {
      try {
        return !!(
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
      } catch (e) {
        return false;
      }
    },

    /** Vibra o aparelho (se suportado). */
    vibrar(ms) {
      if (navigator.vibrate) {
        try {
          navigator.vibrate(ms);
        } catch (e) {}
      }
    },

    /** Lê um texto em voz alta (Web Speech), se a configuração "voz" estiver ligada. */
    falar(texto) {
      if (!Storage.getConfig().voz) return;
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "pt-BR";
        u.rate = 1.0;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    },

    pararVoz() {
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    },

    /**
     * Flashcard de multiplicação (reforço conceitual no erro): mostra a × b
     * como uma grade de pontos (a linhas × b colunas) + a conta. Retorna um
     * container (depth alto) que a cena destrói na próxima pergunta.
     */
    flashcardMultiplicacao(scene, a, b, cor) {
      const cx = GAME_WIDTH / 2;
      const cont = scene.add.container(cx, 430).setDepth(120);

      const s = 22; // espaçamento entre pontos
      const r = 6; // raio do ponto
      const cols = b;
      const rows = a;
      const gridW = (cols - 1) * s;
      const gridH = (rows - 1) * s;
      const padX = 32;
      const padTop = 28;
      const capH = 92; // espaço da legenda
      const w = Math.max(gridW + padX * 2, 248);
      const h = gridH + padTop * 2 + capH;

      const bg = scene.add.graphics();
      bg.fillStyle(0x0d0d12, 0.94);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      bg.lineStyle(3, cor, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      cont.add(bg);

      const x0 = -gridW / 2;
      const y0 = -h / 2 + padTop;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          cont.add(scene.add.circle(x0 + j * s, y0 + i * s, r, cor));
        }
      }

      const baseCap = -h / 2 + padTop + gridH + 34;
      const eq = scene.add
        .text(0, baseCap, `${a} × ${b} = ${a * b}`, {
          fontFamily: UI.FONT,
          fontSize: "44px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      cont.add(eq);
      const sub = scene.add
        .text(0, baseCap + 44, `${a} grupos de ${b}`, {
          fontFamily: UI.FONT,
          fontSize: "24px",
          color: "#cccccc",
        })
        .setOrigin(0.5);
      cont.add(sub);

      cont.setScale(0);
      scene.tweens.add({ targets: cont, scale: 1, duration: 220, ease: "Back.out" });
      return cont;
    },

    /**
     * Flashcard de soma/subtração (reforço conceitual no erro): bolinhas em
     * linhas de 10 (moldura do dez). Soma: a bolinhas ciano + b douradas
     * (juntar). Subtração: a bolinhas, as b últimas riscadas (tirar).
     * Contas grandes (> 20 pontos) não desenham — a dica textual basta —
     * e retornam null (a cena já trata flashcard nulo).
     */
    flashcardConta(scene, a, b, op, cor) {
      const total = op === "+" ? a + b : a;
      if (total > 20) return null;
      const cx = GAME_WIDTH / 2;
      const cont = scene.add.container(cx, 430).setDepth(120);

      const s = 34; // espaçamento entre pontos
      const r = 11; // raio do ponto
      const porLinha = 10;
      const rows = Math.ceil(total / porLinha);
      const cols = Math.min(total, porLinha);
      const gridW = (cols - 1) * s;
      const gridH = (rows - 1) * s;
      const padX = 32;
      const padTop = 30;
      const capH = 96;
      const w = Math.max(gridW + padX * 2, 300);
      const h = gridH + padTop * 2 + capH;

      const bg = scene.add.graphics();
      bg.fillStyle(0x0d0d12, 0.94);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      bg.lineStyle(3, cor, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      cont.add(bg);

      const x0 = -gridW / 2;
      const y0 = -h / 2 + padTop;
      for (let i = 0; i < total; i++) {
        const x = x0 + (i % porLinha) * s;
        const y = y0 + Math.floor(i / porLinha) * s;
        if (op === "+") {
          // primeiro grupo (a) numa cor, segundo (b) noutra: JUNTAR
          cont.add(scene.add.circle(x, y, r, i < a ? 0x2ff7e6 : 0xffd23e));
        } else {
          // as b últimas ficam apagadas e riscadas: TIRAR
          const tirada = i >= a - b;
          cont.add(scene.add.circle(x, y, r, tirada ? 0x555566 : 0x2ff7e6));
          if (tirada) {
            const g = scene.add.graphics();
            g.lineStyle(4, 0xff5050, 1);
            g.lineBetween(x - r, y - r, x + r, y + r);
            cont.add(g);
          }
        }
      }

      const resposta = op === "+" ? a + b : a - b;
      const simbolo = op === "+" ? "+" : "−";
      const baseCap = -h / 2 + padTop + gridH + 40;
      cont.add(
        scene.add
          .text(0, baseCap, `${a} ${simbolo} ${b} = ${resposta}`, {
            fontFamily: UI.FONT,
            fontSize: "44px",
            fontStyle: "bold",
            color: "#ffffff",
          })
          .setOrigin(0.5)
      );
      cont.add(
        scene.add
          .text(0, baseCap + 44, op === "+" ? `${a} bolinhas e mais ${b}` : `${a} bolinhas, tira ${b}`, {
            fontFamily: UI.FONT,
            fontSize: "24px",
            color: "#cccccc",
          })
          .setOrigin(0.5)
      );

      cont.setScale(0);
      scene.tweens.add({ targets: cont, scale: 1, duration: 220, ease: "Back.out" });
      return cont;
    },
  };
})();
