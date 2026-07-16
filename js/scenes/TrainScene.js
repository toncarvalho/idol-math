/**
 * TrainScene — Modo Treino: escolhe uma tabuada (ou Mix) e pratica sem timer
 * e sem perder vida. Alimenta a repetição inteligente (fatos fracos).
 */
class TrainScene extends Phaser.Scene {
  constructor() {
    super("TrainScene");
  }

  init(data) {
    // A seleção da tabuada é HTML (UIScreens.abrir("treino")); a cena já recebe
    // a(s) tabuada(s) escolhida(s). Fallback defensivo: Mix 1–10.
    this.tabInicial = (data && data.tabuadas) || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.tituloInicial = (data && data.titulo) || "Mix 1–10";
  }

  create() {
    this.cameras.main.fadeIn(180, 13, 13, 18);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg");
    AudioFX.sincronizarMusica();

    // tempo de jogo (painel de progresso)
    this._tInicio = this.time.now;
    this.events.once("shutdown", () => {
      try {
        Storage.adicionarTempo(this.time.now - this._tInicio);
      } catch (e) {}
      GameUI.sair();
    });

    // camada HTML de respostas (botão "↩" volta ao menu)
    GameUI.entrar({
      onMenu: () => {
        GameUI.sair();
        UIScreens.abrir("menu");
        this.scene.stop();
      },
    });

    this.iniciarTreino(this.tabInicial, this.tituloInicial);
  }

  // ---- prática ----
  iniciarTreino(tabuadas, titulo) {
    this.tab = tabuadas;
    this.acertos = 0;
    this.erros = 0;
    this.respondendo = false;
    this.montarTreino(titulo);
    this.novaPergunta();
  }

  montarTreino(titulo) {
    const cx = GAME_WIDTH / 2;
    UI.titulo(this, cx, 130, "TREINO", 60, "#36d96b");
    this.add
      .text(cx, 210, titulo, {
        fontFamily: UI.FONT,
        fontSize: "34px",
        color: "#ffd23e",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.txtPlacar = this.add
      .text(cx, 290, "", {
        fontFamily: UI.FONT,
        fontSize: "30px",
        color: "#2ff7e6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.txtPergunta = this.add
      .text(cx, 470, "", {
        fontFamily: UI.FONT,
        fontSize: "96px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.txtPergunta.setShadow(0, 0, "#36d96b", 12, true, true);

    this.txtDica = this.add
      .text(cx, 560, "", {
        fontFamily: UI.FONT,
        fontSize: "40px",
        fontStyle: "bold",
        color: "#36d96b",
      })
      .setOrigin(0.5)
      .setVisible(false);

    // os 4 botões de resposta são HTML (camada GameUI) — toque nativo confiável
    this.atualizarPlacar();
  }

  atualizarPlacar() {
    const total = this.acertos + this.erros;
    const prec = total ? Math.round((this.acertos / total) * 100) : 100;
    this.txtPlacar.setText(`✅ ${this.acertos}   ❌ ${this.erros}   🎯 ${prec}%`);
  }

  novaPergunta() {
    this.txtDica.setVisible(false);
    if (this.flashcard) {
      this.flashcard.destroy();
      this.flashcard = null;
    }
    this.q = MathEngine.gerarPergunta(this.tab, JOGO.faixaFator, Storage.getFatos());
    this.opcoes = MathEngine.gerarOpcoes(this.q.resposta, this.q.a, this.q.b);
    this.txtPergunta.setText(`${this.q.texto} = ?`);
    GameUI.anunciar(`Quanto é ${this.q.falado}?`);
    Util.falar(this.q.falado);
    GameUI.setRespostas(this.opcoes, (valor) => this.responder(valor));
    this.respondendo = false;
  }

  responder(valor) {
    if (this.respondendo) return;
    this.respondendo = true;
    const certo = valor === this.q.resposta;
    Storage.registrarResposta(this.q.chave, certo);
    if (certo) {
      this.acertos += 1;
      Storage.addMoedas(JOGO.moedas.treinoAcerto);
      GameUI.feedback(this.q.resposta, null);
      AudioFX.acerto();
      Util.vibrar(30);
      this.time.delayedCall(320, () => this.novaPergunta());
    } else {
      this.erros += 1;
      GameUI.feedback(this.q.resposta, valor);
      GameUI.anunciar(`Não foi dessa vez. ${this.q.texto} = ${this.q.resposta}.`);
      this.txtDica.setText(`${this.q.texto} = ${this.q.resposta}`).setVisible(true);
      this.flashcard = Util.flashcardMultiplicacao(this, this.q.a, this.q.b, 0x36d96b);
      AudioFX.erro();
      Util.vibrar([60, 40, 60]);
      this.time.delayedCall(1800, () => this.novaPergunta());
    }
    this.atualizarPlacar();
  }
}
