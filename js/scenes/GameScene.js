/**
 * GameScene — loop principal: perguntas de tabuada, combos, vidas,
 * inimigos comuns e o chefão. Suporta o modo Boss Rush.
 * Recursos: repetição inteligente, dica no erro, voz, vibração, pausa, estrelas.
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.bossRush = !!(data && data.bossRush);
    this.diario = !!(data && data.diario);
    this.heroi = getHeroi((data && data.heroId) || Storage.getHeroiId());

    if (this.bossRush) {
      this.brIdx = 0;
      this.fase = FASES[0];
      this.vidas = JOGO.vidasBossRush;
    } else if (this.diario) {
      // fase sintética: mix de todas as tabuadas, sem chefão
      this.fase = {
        id: 0,
        nome: "Desafio do Dia",
        tabuadas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        corTema: 0xffd23e,
        inimigoEmoji: "🌟",
        imgInimigo: "inimigo5", // reaproveita a arte da estrela (fase 5)
        boss: { nome: "", emoji: "🌟", frase: "" },
      };
      this.vidas = JOGO.vidas;
    } else {
      this.fase = getFase((data && data.faseId) || 1);
      this.vidas = JOGO.vidas;
    }
    this.vidasIniciais = this.vidas;

    this.pontuacao = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.inimigosRestantes = this.diario ? JOGO.inimigosDesafio : JOGO.numInimigos;
    this.isBoss = false;
    this.bossHp = 0;
    this.bossHpMax = 0;
    this.acabou = false;
    this.pausado = false;
    // O Phaser REUTILIZA a instância da cena: sem este reset, sair pelo menu
    // de pausa durante a janela de feedback deixaria respondendo=true preso,
    // travando respostas e timer na próxima partida.
    this.respondendo = false;
    // Idem para o relógio e os tweens da cena: o Phaser (3.80) NÃO reseta
    // Clock.paused/TweenManager.paused no restart. Sair pelo menu de pausa
    // deixava ambos pausados; na partida seguinte o delayedCall do feedback
    // nunca disparava → 1ª resposta "não computada" e jogo travado.
    this.time.paused = false;
    this.tweens.resumeAll();

    // pet companheiro (conquistas) e controle dos poderes:
    // petUsado = poderes 1x por partida (congelaTempo/guardaCombo/dica5050/reviver);
    // petDanoBoss rearma a cada chefão (iniciarChefao)
    this.pet = typeof petEquipadoInfo === "function" ? petEquipadoInfo() : null;
    this.petUsado = false;
    this.petDanoBoss = false;
    this.dicaApagadas = null; // alternativas apagadas pela dica do 🦜 (pergunta atual)
    // 🦁 vida extra: não infla as estrelas — vitoria() desconta vidaBonus
    this.vidaBonus = this.temPoder("vidaExtra") ? this.pet.poder.valor : 0;
    this.vidas += this.vidaBonus;

    // power-ups de combo (🛡️ bloqueia a perda de 1 vida; ⚡ próximo acerto vale 2)
    this.escudo = this.temPoder("escudoInicial"); // 🐶 Rex começa com escudo
    this.raioX2 = false;
    // mecânica especial do chefão atual ({ id, icone, ... } — ver fases.js) e
    // progresso da guarda do chefão "blindado" (acertos seguidos acumulados)
    this.mec = null;
    this.guardaChefao = 0;
    this._evEmbaralha = null; // delayedCall pendente do chefão "embaralha"

    // estatísticas da partida (relatório + repetição inteligente)
    this.acertos = 0;
    this.erros = 0;
    this.errosFatos = []; // textos "7 × 8" errados nesta partida
    this.moedasPartida = 0; // moedas ganhas (acertos + bônus)
  }

  /** O pet equipado tem este poder? (pet = null ⇒ false) */
  temPoder(tipo) {
    return !!(this.pet && this.pet.poder.tipo === tipo);
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.fadeIn(180, 13, 13, 18);
    this.add.image(cx, GAME_HEIGHT / 2, "bg").setTint(this.fase.corTema);

    // tempo de jogo (painel de progresso): acumula ao sair da cena
    this._tInicio = this.time.now;
    this.events.once("shutdown", () => {
      try {
        Storage.adicionarTempo(this.time.now - this._tInicio);
      } catch (e) {}
      GameUI.sair();
    });

    // camada HTML de respostas + pausa sobre o canvas
    GameUI.entrar({ onPause: () => this.pausar() });
    GameUI.setPausaAcoes({
      continuar: () => this.retomar(),
      fases: () => {
        this.retomar(); // despausa relógio/tweens ANTES do stop (ver init)
        GameUI.sair();
        UIScreens.abrir("grade");
        this.scene.stop();
      },
      menu: () => {
        this.retomar(); // despausa relógio/tweens ANTES do stop (ver init)
        GameUI.sair();
        UIScreens.abrir("menu");
        this.scene.stop();
      },
    });

    this.particulas = this.add.particles(0, 0, "brilho", {
      speed: { min: 120, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: 600,
      blendMode: "ADD",
      emitting: false,
    });
    this.particulas.setDepth(50);

    this.criarHUD();
    this.criarPalco();
    AudioFX.sincronizarMusica();

    if (this.bossRush) this.iniciarChefao();
    else this.proximoInimigo(true);
  }

  // ---------- HUD ----------
  criarHUD() {
    const cx = GAME_WIDTH / 2;

    this.txtVidas = this.add.text(30, 30, "", {
      fontFamily: UI.FONT,
      fontSize: "40px",
    });
    this.txtPontos = this.add
      .text(cx, 40, "0", {
        fontFamily: UI.FONT,
        fontSize: "44px",
        fontStyle: "bold",
        color: "#ffd23e",
      })
      .setOrigin(0.5, 0);

    const corHeroi = Util.corHex(this.heroi.cor);
    this.txtCombo = this.add
      .text(GAME_WIDTH - 30, 84, "", {
        fontFamily: UI.FONT,
        fontSize: "34px",
        fontStyle: "bold",
        color: corHeroi,
      })
      .setOrigin(1, 0);

    // power-ups guardados (🛡️/⚡), abaixo do combo
    this.txtPower = this.add
      .text(GAME_WIDTH - 30, 132, "", { fontSize: "38px" })
      .setOrigin(1, 0);

    // (o herói aparece em cena no palco — criarHeroi; a pausa é HTML — GameUI)
    this.atualizarHUD();
  }

  atualizarHUD() {
    this.txtVidas.setText("❤️".repeat(this.vidas) || "💔");
    this.txtPontos.setText(`${this.pontuacao}`);
    this.txtCombo.setText(this.combo > 1 ? `Combo x${this.combo}` : "");
    this.txtPower.setText(`${this.escudo ? "🛡️" : ""}${this.raioX2 ? "⚡" : ""}`);
  }

  // ---------- Palco / inimigo ----------
  criarPalco() {
    const cx = GAME_WIDTH / 2;

    this.txtFase = this.add
      .text(cx, 130, this.tituloFase(), {
        fontFamily: UI.FONT,
        fontSize: "32px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // inimigo: arte SVG (assets/inimigos) com fallback para o emoji da fase.
    // Container para animar figura e fallback do mesmo jeito.
    this.inimigoCont = this.add.container(cx, 350);
    this.inimigoImg = this.add.image(0, 0, "__WHITE").setVisible(false);
    this.inimigoTxt = this.add
      .text(0, 0, "", { fontSize: "150px" })
      .setOrigin(0.5)
      .setVisible(false);
    this.inimigoCont.add([this.inimigoImg, this.inimigoTxt]);
    this.tweens.add({
      targets: this.inimigoCont,
      y: 330,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.criarHeroi();
    this.criarPet();

    this.txtInimigoNome = this.add
      .text(cx, 492, "", {
        fontFamily: UI.FONT,
        fontSize: "30px",
        fontStyle: "bold",
        color: "#ff3ea5",
      })
      .setOrigin(0.5);

    this.hpBarBg = this.add.graphics();
    this.hpBar = this.add.graphics();

    // guarda do chefão "blindado" (🛡️ que faltam p/ causar dano), ao lado da barra de HP
    this.txtGuarda = this.add
      .text(cx + 240, 534, "", { fontSize: "26px" })
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.txtPergunta = this.add
      .text(cx, 620, "", {
        fontFamily: UI.FONT,
        fontSize: "92px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.txtPergunta.setShadow(0, 0, "#2ff7e6", 10, true, true);

    // texto de dica (mostra a conta certa no erro)
    this.txtDica = this.add
      .text(cx, 690, "", {
        fontFamily: UI.FONT,
        fontSize: "40px",
        fontStyle: "bold",
        color: "#36d96b",
      })
      .setOrigin(0.5)
      .setVisible(false);

    // barra de tempo (retângulo escalado por frame)
    this.timerW = 500;
    this.timerX = GAME_WIDTH / 2 - this.timerW / 2;
    this.timerY = 730;
    this.timerBarBg = this.add.graphics();
    this.timerBarBg.fillStyle(0x000000, 0.4);
    this.timerBarBg.fillRoundedRect(this.timerX, this.timerY, this.timerW, 18, 9);
    this.timerBarBg.setVisible(false);
    this.timerFill = this.add
      .rectangle(this.timerX, this.timerY + 9, this.timerW, 18, 0x2ff7e6)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.timerAtivo = false;

    this._floatPool = [];
  }

  tituloFase() {
    if (this.bossRush) return `Boss Rush — ${this.brIdx + 1}/${FASES.length}`;
    if (this.diario) return "🗓️ Desafio do Dia";
    return `Fase ${this.fase.id}: ${this.fase.nome}`;
  }

  /**
   * A heroína no palco (canto esquerdo), com a roupa equipada e um refletor
   * na cor dela. Fallback: emoji do herói se a textura faltar.
   */
  criarHeroi() {
    this.heroiBaseX = 104;
    const y = 470;
    this.heroiCont = this.add.container(this.heroiBaseX, y).setDepth(20);
    const refletor = this.add.ellipse(0, 70, 128, 30, this.heroi.cor, 0.25);
    const tex = texturaAvatar(this.heroi.id);
    if (this.textures.exists(tex)) {
      this.heroiImg = this.add.image(0, 0, tex).setDisplaySize(150, 150);
    } else {
      this.heroiImg = this.add
        .text(0, 0, this.heroi.emoji, { fontSize: "84px" })
        .setOrigin(0.5);
    }
    this.heroiCont.add([refletor, this.heroiImg]);
    this.tweens.add({
      targets: this.heroiImg,
      y: -10,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
      delay: 300,
    });
  }

  /** O pet companheiro no palco, aos pés da heroína (textura ou emoji). */
  criarPet() {
    if (!this.pet) return;
    this.petCont = this.add.container(40, 552).setDepth(21);
    if (this.textures.exists(this.pet.img)) {
      this.petImg = this.add.image(0, 0, this.pet.img).setDisplaySize(76, 76);
    } else {
      this.petImg = this.add
        .text(0, 0, this.pet.emoji, { fontSize: "52px" })
        .setOrigin(0.5);
    }
    this.petCont.add(this.petImg);
    this.tweens.add({
      targets: this.petImg,
      y: -8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
      delay: 500,
    });
  }

  /** O pet comemora quando o poder dispara: aviso + pulinho + brilhos. */
  petAtiva(msg, corTexto) {
    if (msg) {
      this.flutuarTexto(msg, corTexto || "#ffd23e");
      GameUI.anunciar(msg);
    }
    if (!this.petCont) return;
    this.particulas.emitParticleAt(this.petCont.x, this.petCont.y - 12, 8);
    if (!Util.reduzirMovimento()) {
      this.tweens.add({
        targets: this.petCont,
        y: this.petCont.y - 26,
        duration: 140,
        yoyo: true,
        repeat: 1,
        ease: "Quad.out",
      });
    }
  }

  /** Mostra a figura do inimigo/chefão (textura se existir; senão o emoji). */
  mostrarInimigo(chave, emoji, tamanho, tamanhoEmoji) {
    if (chave && this.textures.exists(chave)) {
      this.inimigoImg.setTexture(chave).setDisplaySize(tamanho, tamanho).setVisible(true);
      this.inimigoTxt.setVisible(false);
    } else {
      this.inimigoTxt.setText(emoji).setFontSize(tamanhoEmoji).setVisible(true);
      this.inimigoImg.setVisible(false);
    }
  }

  chaveInimigo() {
    return this.fase.imgInimigo || `inimigo${this.fase.id}`;
  }

  chaveBoss() {
    return this.fase.imgBoss || `boss${this.fase.id}`;
  }

  /** Golpe da heroína: avanço + raio voando até o inimigo, impacto com faíscas. */
  animarAtaque() {
    const alvoX = this.inimigoCont.x;
    const alvoY = this.inimigoCont.y;
    if (!Util.reduzirMovimento()) {
      this.tweens.add({
        targets: this.heroiCont,
        x: this.heroiBaseX + 46,
        duration: 100,
        yoyo: true,
        ease: "Quad.out",
      });
    }
    // textura do projétil = efeito de ataque equipado na loja (padrão: raio)
    const texFx = typeof texturaEfeito === "function" ? texturaEfeito() : "raio";
    const raio = this.add.image(this.heroiCont.x + 48, this.heroiCont.y - 30, texFx).setDepth(60);
    raio.setRotation(
      Phaser.Math.Angle.Between(this.heroiCont.x, this.heroiCont.y, alvoX, alvoY) + Math.PI / 2
    );
    this.tweens.add({
      targets: raio,
      x: alvoX - 14,
      y: alvoY + 8,
      duration: 140,
      ease: "Quad.in",
      onComplete: () => {
        raio.destroy();
        this.particulas.emitParticleAt(alvoX, alvoY, 14);
        this.tweens.add({
          targets: this.inimigoCont,
          scale: 0.8,
          angle: Phaser.Math.Between(-12, 12),
          duration: 90,
          yoyo: true,
          onComplete: () => this.inimigoCont.setAngle(0),
        });
      },
    });
  }

  /** Contra-ataque do inimigo: investida + heroína atingida (pisca vermelho). */
  animarGolpeRecebido() {
    if (!Util.reduzirMovimento()) {
      this.tweens.add({
        targets: this.inimigoCont,
        x: "-=110",
        duration: 150,
        yoyo: true,
        ease: "Quad.out",
      });
    }
    if (this.heroiImg.setTint) this.heroiImg.setTint(0xff5050);
    this.tweens.add({
      targets: this.heroiCont,
      angle: -12,
      duration: 120,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.heroiCont.setAngle(0);
        if (this.heroiImg.clearTint) this.heroiImg.clearTint();
      },
    });
  }

  desenharHpBar() {
    const cx = GAME_WIDTH / 2;
    const w = 460;
    const x = cx - w / 2;
    const y = 520;
    this.hpBarBg.clear();
    this.hpBar.clear();
    if (this.isBoss) {
      const frac = Phaser.Math.Clamp(this.bossHp / this.bossHpMax, 0, 1);
      this.hpBarBg.fillStyle(0x000000, 0.5);
      this.hpBarBg.fillRoundedRect(x, y, w, 28, 12);
      this.hpBar.fillStyle(0xff3ea5, 1);
      this.hpBar.fillRoundedRect(x, y, w * frac, 28, 12);
      this.hpBarBg.lineStyle(2, 0xffffff, 0.6);
      this.hpBarBg.strokeRoundedRect(x, y, w, 28, 12);
    }
  }

  proximoInimigo(primeiro) {
    if (this.acabou) return;
    if (this.inimigosRestantes <= 0 && !this.isBoss) {
      if (this.diario) this.vitoria();
      else this.iniciarChefao();
      return;
    }
    if (!this.isBoss) {
      this.txtInimigoNome.setText(`Inimigos: ${this.inimigosRestantes}`);
      this.mostrarInimigo(this.chaveInimigo(), this.fase.inimigoEmoji, 215, 150);
    }
    this.desenharHpBar();
    if (!primeiro) {
      this.inimigoCont.setScale(0);
      this.tweens.add({
        targets: this.inimigoCont,
        scale: 1,
        duration: 250,
        ease: "Back.out",
      });
    }
    this.novaPergunta();
  }

  iniciarChefao() {
    this.isBoss = true;
    this.petDanoBoss = this.temPoder("danoChefao"); // 🐉 rearma a cada chefão
    const boss = this.fase.boss;
    this.mec = getMecanicaChefao(this.fase);
    this.guardaChefao = 0;
    this.txtGuarda.setVisible(false);
    this.bossHpMax = Regras.hpChefao(this.mec && this.mec.id);
    this.bossHp = this.bossHpMax;

    this.cameras.main.setBackgroundColor(0x0d0d12);
    this.mostrarInimigo(this.chaveBoss(), boss.emoji, 270, 190);
    this.txtInimigoNome.setText(`⚠️ ${boss.nome}${this.mec ? " " + this.mec.icone : ""} ⚠️`);
    this.txtFase.setText(this.tituloFase());

    const banner = this.add
      .text(GAME_WIDTH / 2, 360, `${boss.emoji}\nCHEFÃO!\n${boss.nome}`, {
        fontFamily: UI.FONT,
        fontSize: "60px",
        fontStyle: "bold",
        color: "#ffd23e",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(100);
    banner.setShadow(0, 0, "#ff3ea5", 20, true, true);

    // apresenta a mecânica especial (a criança precisa saber a "regra" do chefão)
    let bannerMec = null;
    if (this.mec) {
      bannerMec = this.add
        .text(GAME_WIDTH / 2, 550, `${this.mec.icone} ${this.mec.nome}: ${this.mec.desc}`, {
          fontFamily: UI.FONT,
          fontSize: "30px",
          fontStyle: "bold",
          color: "#2ff7e6",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(100);
    }
    GameUI.anunciar(`Chefão: ${boss.nome}.${this.mec ? ` ${this.mec.desc}` : ""}`);
    if (!Util.reduzirMovimento()) this.cameras.main.shake(400, 0.01);
    AudioFX.golpe();

    this.limparBotoes();
    this.txtPergunta.setText("");

    this.time.delayedCall(1400, () => {
      banner.destroy();
      if (bannerMec) bannerMec.destroy();
      this.desenharHpBar();
      this.atualizarGuarda();
      this.novaPergunta();
    });
  }

  /** Indicador da guarda do chefão "blindado" (🛡️ restantes p/ causar dano). */
  atualizarGuarda() {
    const blindado =
      this.isBoss && !this.acabou && this.mec && this.mec.id === "blindado";
    if (blindado) {
      const falta = Math.max(0, JOGO.mecanicas.blindadoGolpes - this.guardaChefao);
      this.txtGuarda.setText("🛡️".repeat(falta)).setVisible(true);
    } else {
      this.txtGuarda.setVisible(false);
    }
  }

  // ---------- Perguntas ----------
  novaPergunta() {
    if (this.acabou) return;
    this.dicaApagadas = null;
    this.txtDica.setVisible(false);
    if (this.flashcard) {
      this.flashcard.destroy();
      this.flashcard = null;
    }
    this.q = MathEngine.gerarPergunta(
      this.fase.tabuadas,
      JOGO.faixaFator,
      Storage.getFatos()
    );
    this.opcoes = MathEngine.gerarOpcoes(this.q.resposta, this.q.a, this.q.b);
    this.txtPergunta.setText(`${this.q.texto} = ?`);
    GameUI.anunciar(`Quanto é ${this.q.a} vezes ${this.q.b}?`);
    Util.falar(`${this.q.a} vezes ${this.q.b}`);

    // botões de resposta em HTML (camada GameUI) — toque nativo confiável
    GameUI.setRespostas(this.opcoes, (valor) => this.responder(valor));
    this.iniciarTimer();

    // pet 🦜 Bis: na 1ª pergunta difícil (fato com peso alto) — ou no chefão,
    // se nenhuma apareceu — canta a dica: apaga 2 alternativas erradas
    if (this.temPoder("dica5050") && !this.petUsado) {
      const peso = (Storage.getFatos() || {})[MathEngine.chaveFato(this.q.a, this.q.b)] || 0;
      if (peso >= 4 || this.isBoss) {
        this.petUsado = true;
        // guarda as apagadas: o chefão "embaralha" re-renderiza os botões e
        // desfaria a dica (embaralharOpcoes reaplica)
        this.dicaApagadas = this.opcoes.filter((v) => v !== this.q.resposta).slice(0, 2);
        GameUI.apagarOpcoes(this.dicaApagadas);
        this.petAtiva("🦜 Bis cantou a dica!", "#8ff09a");
      }
    }

    // chefão "embaralha": no meio da pergunta as respostas trocam de lugar
    this.cancelarEmbaralho();
    if (this.isBoss && this.mec && this.mec.id === "embaralha") {
      this._evEmbaralha = this.time.delayedCall(JOGO.mecanicas.embaralhaMs, () =>
        this.embaralharOpcoes()
      );
    }
  }

  cancelarEmbaralho() {
    if (this._evEmbaralha) {
      this._evEmbaralha.remove(false);
      this._evEmbaralha = null;
    }
  }

  /** Golpe do chefão "embaralha": as mesmas opções trocam de lugar (1x por pergunta). */
  embaralharOpcoes() {
    this._evEmbaralha = null;
    if (this.acabou || this.respondendo || this.pausado) return;
    this.opcoes = MathEngine.embaralhar(this.opcoes);
    GameUI.setRespostas(this.opcoes, (valor) => this.responder(valor));
    // setRespostas reseta os botões — reaplica a dica do 🦜 já consumida
    if (this.dicaApagadas) GameUI.apagarOpcoes(this.dicaApagadas);
    GameUI.anunciar("O chefão embaralhou as respostas!");
    this.flutuarTexto("🌀 Embaralhou!", "#2ff7e6");
    AudioFX.golpe();
    if (!Util.reduzirMovimento()) {
      this.tweens.add({
        targets: this.inimigoCont,
        angle: 360,
        duration: 350,
        ease: "Quad.out",
        onComplete: () => this.inimigoCont.setAngle(0),
      });
    }
  }

  limparBotoes() {
    GameUI.esconderRespostas();
    this.cancelarEmbaralho();
    this.pararTimer();
    this.timerBarBg.setVisible(false);
    this.timerFill.setVisible(false);
  }

  // ---------- Timer ----------
  iniciarTimer() {
    this.pararTimer();
    let segundos = Storage.getConfig().timer ? JOGO.tempoResposta : null;
    // chefão "apressado": menos tempo por pergunta (só se o timer estiver ligado)
    if (segundos && this.isBoss && this.mec && this.mec.id === "tempoCurto") {
      segundos = JOGO.mecanicas.tempoCurtoSeg;
    }
    // pet 🦉 Sofia: mais tempo para pensar (vale até contra o chefão apressado)
    if (segundos && this.temPoder("tempoExtra")) segundos += this.pet.poder.valor;
    if (!segundos) {
      this.timerBarBg.setVisible(false);
      this.timerFill.setVisible(false);
      return;
    }
    this.tempoTotal = segundos * 1000;
    this.tempoRestante = this.tempoTotal;
    this.timerFill.scaleX = 1;
    this.timerFill.setFillStyle(0x2ff7e6);
    this.timerBarBg.setVisible(true);
    this.timerFill.setVisible(true);
    this.timerAtivo = true;
  }

  pararTimer() {
    this.timerAtivo = false;
  }

  update(time, delta) {
    if (this.pausado || !this.timerAtivo || this.acabou || this.respondendo) return;
    this.tempoRestante -= delta;
    // pet 🐢 Tato: quando o tempo está acabando, congela o relógio (1x por partida)
    if (this.tempoRestante <= 2000 && this.temPoder("congelaTempo") && !this.petUsado) {
      this.petUsado = true;
      this.pararTimer();
      this.petAtiva("🐢 Tato congelou o tempo!", "#8fe89b");
      return;
    }
    const frac = Phaser.Math.Clamp(this.tempoRestante / this.tempoTotal, 0, 1);
    this.timerFill.scaleX = frac;
    const cor = frac > 0.3 ? 0x2ff7e6 : 0xff3030;
    if (this.timerFill.fillColor !== cor) this.timerFill.setFillStyle(cor);
    if (this.tempoRestante <= 0) {
      this.pararTimer();
      this.tempoEsgotado();
    }
  }

  tempoEsgotado() {
    if (this.acabou) return;
    this.cancelarEmbaralho();
    this.errar(null);
  }

  // ---------- Respostas ----------
  responder(valor) {
    if (this.acabou || this.respondendo || this.pausado) return;
    this.cancelarEmbaralho();
    this.pararTimer();
    const certo = valor === this.q.resposta;
    Storage.registrarResposta(this.q.a, this.q.b, certo);
    if (certo) this.acertar();
    else this.errar(valor);
  }

  acertar() {
    this.respondendo = true;
    GameUI.feedback(this.q.resposta, null);
    this.acertos += 1;
    this.moedasPartida += JOGO.moedas.acerto;
    // pet 🐝 Zum: moedas extras por acerto
    if (this.temPoder("moedasAcerto")) this.moedasPartida += this.pet.poder.valor;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const ganho = Regras.pontosAcerto(this.isBoss, this.combo);
    this.pontuacao += ganho;

    // ⚡ golpe duplo guardado: este acerto vale 2 (dano no chefão / inimigos)
    let dano = this.raioX2 ? 2 : 1;
    if (this.raioX2) {
      this.raioX2 = false;
      this.time.delayedCall(240, () => this.flutuarTexto("⚡ Golpe duplo!", "#ffd23e"));
    }
    // pet 🐉 Faísca: ataca junto no 1º acerto de cada chefão
    if (this.isBoss && this.petDanoBoss) {
      this.petDanoBoss = false;
      dano += this.pet.poder.valor;
      this.time.delayedCall(140, () => this.petAtiva("🐉 Faísca atacou junto!", "#7df5e5"));
    }
    // power-up ganho ao atingir o combo (Regras.powerupPorCombo)
    const pu = Regras.powerupPorCombo(this.combo, this.escudo, this.raioX2);
    if (pu === "escudo") {
      this.escudo = true;
      GameUI.anunciar("Você ganhou um escudo!");
      this.time.delayedCall(240, () => this.flutuarTexto("🛡️ Escudo!", "#9ad8ff"));
    } else if (pu === "raio") {
      this.raioX2 = true;
      GameUI.anunciar("Você ganhou um golpe duplo!");
      this.time.delayedCall(240, () => this.flutuarTexto("⚡ Golpe duplo pronto!", "#ffd23e"));
    }

    AudioFX.acerto();
    if (this.combo >= 3) AudioFX.combo();
    AudioFX.golpe();
    Util.vibrar(30);

    this.animarAtaque();
    this.flutuarTexto(`+${ganho}`, "#ffd23e");
    this.atualizarHUD();

    this.time.delayedCall(320, () => {
      this.respondendo = false;
      if (this.isBoss) {
        let dmg = dano;
        // chefão "blindado": só acertos seguidos suficientes causam 1 de dano
        if (this.mec && this.mec.id === "blindado") {
          this.guardaChefao += dano;
          if (this.guardaChefao >= JOGO.mecanicas.blindadoGolpes) {
            this.guardaChefao = 0;
            dmg = 1;
          } else {
            dmg = 0;
            this.flutuarTexto("🛡️ Guarda rachando!", "#9ad8ff");
          }
          this.atualizarGuarda();
        }
        this.bossHp -= dmg;
        this.desenharHpBar();
        if (this.bossHp <= 0) this.chefaoDerrotado();
        else this.novaPergunta();
      } else {
        this.inimigosRestantes -= dano;
        this.proximoInimigo(false);
      }
    });
  }

  errar(valorErrado) {
    this.respondendo = true;
    this.erros += 1;
    this.errosFatos.push(this.q.texto);
    // pet 🐰 Pipoca: segura o combo uma vez por partida (o erro ainda conta)
    if (this.combo > 0 && this.temPoder("guardaCombo") && !this.petUsado) {
      this.petUsado = true;
      this.time.delayedCall(240, () => this.petAtiva("🐰 Pipoca segurou o combo!", "#ffb3dd"));
    } else {
      this.combo = 0;
    }
    // chefão "blindado": errar zera o progresso da guarda
    if (this.isBoss && this.mec && this.mec.id === "blindado" && this.guardaChefao) {
      this.guardaChefao = 0;
      this.atualizarGuarda();
    }
    // chefão "curandeiro": recupera HP a cada erro
    if (this.isBoss && this.mec && this.mec.id === "curandeiro" && this.bossHp < this.bossHpMax) {
      this.bossHp = Math.min(this.bossHpMax, this.bossHp + JOGO.mecanicas.curaPorErro);
      this.desenharHpBar();
      this.time.delayedCall(280, () => this.flutuarTexto("💖 Chefão se curou!", "#ff8a3d"));
    }
    // 🛡️ escudo guardado bloqueia a perda desta vida (o erro ainda conta:
    // combo zera, entra no relatório e na repetição inteligente)
    const protegido = this.escudo;
    if (protegido) this.escudo = false;
    else this.vidas -= 1;
    AudioFX.erro();
    Util.vibrar([60, 40, 60]);
    this.animarGolpeRecebido();
    if (!protegido && !Util.reduzirMovimento()) {
      this.cameras.main.shake(250, 0.012);
      this.cameras.main.flash(150, 120, 0, 0);
    }

    // destaca a resposta correta (verde) e a tocada errada (vermelha) + dica
    GameUI.feedback(this.q.resposta, valorErrado);
    GameUI.anunciar(
      `Não foi dessa vez. ${this.q.texto} = ${this.q.resposta}.` +
        (protegido ? " Seu escudo te protegeu!" : "")
    );
    this.txtDica.setText(`${this.q.texto} = ${this.q.resposta}`).setVisible(true);
    this.flashcard = Util.flashcardMultiplicacao(this, this.q.a, this.q.b, 0x36d96b);
    this.flutuarTexto(protegido ? "🛡️ Escudo protegeu!" : "-1 ❤️", protegido ? "#9ad8ff" : "#ff5050");
    this.atualizarHUD();

    this.time.delayedCall(1500, () => {
      this.respondendo = false;
      // pet 🦄 Luna: na última vida, revive uma vez em vez de perder
      if (this.vidas <= 0 && this.temPoder("reviver") && !this.petUsado) {
        this.petUsado = true;
        this.vidas = 1;
        this.petAtiva("🦄 Luna te reviveu! +1 ❤️", "#e8dcff");
        this.atualizarHUD();
        this.novaPergunta();
        return;
      }
      if (this.vidas <= 0) this.derrota();
      else this.novaPergunta();
    });
  }

  // chefão derrotado: Boss Rush avança; normal → vitória
  chefaoDerrotado() {
    if (this.bossRush && this.brIdx < FASES.length - 1) {
      this.brIdx += 1;
      this.fase = FASES[this.brIdx];
      this.isBoss = false;
      this.iniciarChefao();
    } else {
      this.vitoria();
    }
  }

  flutuarTexto(str, cor) {
    let t = this._floatPool.find((o) => !o.visible);
    if (!t) {
      t = this.add
        .text(0, 0, "", { fontFamily: UI.FONT, fontSize: "60px", fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(80);
      this._floatPool.push(t);
    }
    t.setText(str)
      .setColor(cor)
      .setPosition(GAME_WIDTH / 2, 760)
      .setAlpha(1)
      .setVisible(true);
    this.tweens.add({
      targets: t,
      y: 640,
      alpha: 0,
      duration: 700,
      onComplete: () => t.setVisible(false),
    });
  }

  // ---------- Pausa ----------
  pausar() {
    if (this.acabou || this.pausado) return;
    this.pausado = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    Util.pararVoz();
    GameUI.abrirModal(); // modal de pausa em HTML (ações já registradas no create)
  }

  retomar() {
    if (!this.pausado) return;
    this.pausado = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    GameUI.fecharModal();
  }

  // ---------- Fim ----------
  /** Abre a tela HTML de resultado com os dados comuns da partida + extras. */
  abrirResultado(extra) {
    this.time.delayedCall(700, () => {
      UIScreens.abrir(
        "resultado",
        Object.assign(
          {
            pontuacao: this.pontuacao,
            maxCombo: this.maxCombo,
            faseId: this.fase.id,
            heroId: this.heroi.id,
            acertos: this.acertos,
            erros: this.erros,
            errosFatos: this.errosFatos,
          },
          extra
        )
      );
      this.scene.stop();
    });
  }

  vitoria() {
    if (this.acabou) return;
    this.acabou = true;
    this.pararTimer();
    this.limparBotoes();
    this.atualizarGuarda();
    AudioFX.vitoria();
    Util.vibrar([40, 30, 80]);

    // comemoração da heroína no palco
    if (this.heroiCont) {
      this.particulas.emitParticleAt(this.heroiCont.x, this.heroiCont.y - 20, 16);
      this.tweens.add({
        targets: this.heroiCont,
        scale: 1.12,
        duration: 180,
        yoyo: true,
        repeat: 2,
      });
    }

    this.pontuacao += Regras.bonusVitoria(this.vidas, this.maxCombo);
    Storage.setMelhorPontuacao(this.pontuacao);

    // ---- Desafio do Dia: registra ofensiva + bônus, sem estrelas/fases ----
    if (this.diario) {
      const res = Storage.registrarDesafioDiario();
      let moedas = this.moedasPartida + res.recompensa;
      let aCreditar = this.moedasPartida; // res.recompensa já foi creditada no Storage
      // pet 🐱 Mimi: bônus % sobre as moedas da vitória
      if (this.temPoder("moedasVitoria")) {
        const bonus = Math.ceil(moedas * this.pet.poder.valor);
        moedas += bonus;
        aCreditar += bonus;
      }
      Storage.addMoedas(aCreditar);
      Storage.registrarFimDePartida({
        maxCombo: this.maxCombo,
        semErro: this.erros === 0,
        venceu: true,
      });
      const novasConquistas = Storage.avaliarConquistas({ venceu: true });
      this.abrirResultado({
        venceu: true,
        diario: true,
        jaFeito: res.ja,
        ofensiva: res.ofensiva,
        melhorOfensiva: res.melhorOfensiva,
        faseId: 1,
        estrelas: 0,
        temProxima: false,
        moedasGanhas: moedas,
        novasConquistas,
      });
      return;
    }

    // estrelas medem maestria: a vida extra do pet 🦁 não conta para elas
    const estrelas = Regras.calcularEstrelas(this.vidas - this.vidaBonus, this.bossRush);
    let temProxima = false;
    if (this.bossRush) {
      Storage.desbloquearBossRush();
    } else {
      Storage.setEstrelas(this.fase.id, estrelas);
      const proxima = this.fase.id + 1;
      temProxima = existeFase(proxima);
      if (temProxima) Storage.desbloquearFase(proxima);
      else Storage.desbloquearBossRush(); // zerou a última → libera Boss Rush
    }

    // moedas: acertos + bônus de vitória (pet 🐱 Mimi: +% em cima); conquistas
    let moedas = Regras.moedasVitoria(this.moedasPartida, estrelas);
    if (this.temPoder("moedasVitoria")) {
      moedas += Math.ceil(moedas * this.pet.poder.valor);
    }
    Storage.addMoedas(moedas);
    Storage.registrarFimDePartida({
      maxCombo: this.maxCombo,
      semErro: this.erros === 0,
      venceu: true,
    });
    const novasConquistas = Storage.avaliarConquistas({ venceu: true, faseId: this.fase.id });

    this.abrirResultado({
      venceu: true,
      bossRush: this.bossRush,
      estrelas,
      temProxima,
      moedasGanhas: moedas,
      novasConquistas,
    });
  }

  derrota() {
    if (this.acabou) return;
    this.acabou = true;
    this.pararTimer();
    this.limparBotoes();
    this.atualizarGuarda();
    AudioFX.derrota();
    Storage.setMelhorPontuacao(this.pontuacao);

    // mesmo perdendo, ganha as moedas dos acertos e conquistas cumulativas valem
    Storage.addMoedas(this.moedasPartida);
    Storage.registrarFimDePartida({
      maxCombo: this.maxCombo,
      semErro: false,
      venceu: false,
    });
    const novasConquistas = Storage.avaliarConquistas({ venceu: false, faseId: this.fase.id });

    // Desafio do Dia perdido: tela do desafio (não registra/quebra a ofensiva).
    const extra = this.diario
      ? {
          diario: true,
          ofensiva: Storage.ofensivaAtual(),
          melhorOfensiva: Storage.melhorOfensiva(),
          jaFeito: Storage.desafioFeitoHoje(),
        }
      : {};

    this.abrirResultado({
      venceu: false,
      bossRush: this.bossRush,
      estrelas: 0,
      temProxima: false,
      moedasGanhas: this.moedasPartida,
      novasConquistas,
      ...extra,
    });
  }
}
