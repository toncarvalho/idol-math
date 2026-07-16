/**
 * Storage — persistência via localStorage com PERFIS LOCAIS (vários jogadores
 * no mesmo aparelho, sem servidor). Não é login/senha — é um seletor de jogador.
 *
 * Chaves:
 *  - idolmath.perfis.v1 → { atual: id|null, perfis: [{ id, nome, heroiId, criadoEm }] }
 *  - idolmath.save.<id> → progresso POR perfil
 *      { melhorPontuacao, faseDesbloqueada, estrelas:{}, fatos:{}, bossRush }
 *  - idolmath.config.v1 → configuração GLOBAL do aparelho (compartilhada)
 *      { musica, efeitos, timer, voz }
 *
 * Migração: se não houver índice de perfis mas existir o save antigo
 * (idolmath.save.v2), cria um perfil herdando o progresso + herói e move a
 * config para a chave global — ninguém perde estrelas.
 */
const Storage = (() => {
  const KEY_INDEX = "idolmath.perfis.v1";
  const KEY_CONFIG = "idolmath.config.v1";
  const KEY_SAVE = (id) => `idolmath.save.${id}`;
  const KEY_LEGADO = "idolmath.save.v2";
  const MAX_PERFIS = 6;

  // ---------- defaults ----------
  const defaultsSave = () => ({
    melhorPontuacao: 0,
    faseDesbloqueada: 1, // maior fase desbloqueada (1-based)
    estrelas: {}, // { faseId: 0..3 } melhor estrela por fase
    fatos: {}, // { "min x max": peso }  peso alto = errou mais (repetir mais)
    bossRush: false, // desbloqueado ao zerar a última fase
    estat: { acertos: 0, erros: 0, tempoMs: 0, maxCombo: 0, semErroVitorias: 0 },
    moedas: 0, // economia (loja de roupas)
    conquistas: {}, // { id: true } desbloqueadas
    // possui: [roupaId|efeitoId]; roupa: { heroId: roupaId }; efeito: id equipado (por perfil)
    cosmeticos: { possui: [], roupa: {}, efeito: null },
    desafio: { ultimoDia: null, ofensiva: 0, melhorOfensiva: 0 }, // desafio diário
  });

  const defaultsConfig = () => ({
    musica: true,
    efeitos: true,
    timer: true,
    voz: false,
  });

  // ---------- helpers de baixo nível ----------
  function ler(chave, fallback) {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  let _onFalhaGravacao = null; // callback da UI p/ avisar quando salvar falhar
  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) {
      // armazenamento cheio/bloqueado — segue em memória, mas avisa a UI
      if (_onFalhaGravacao) {
        try {
          _onFalhaGravacao(e);
        } catch (e2) {}
      }
    }
  }
  function remover(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (e) {}
  }

  // ---- datas (desafio diário) ----
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function diffDias(aISO, bISO) {
    return Math.round(
      (Date.parse(bISO + "T00:00:00") - Date.parse(aISO + "T00:00:00")) / 86400000
    );
  }

  function novoId() {
    return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  }

  // ---------- estado em memória ----------
  let _index; // { atual, perfis: [] }
  let _config; // config global
  let state; // save do perfil atual (defaultsSave se não houver atual)

  function carregarIndice() {
    const idx = ler(KEY_INDEX, null);
    if (idx && Array.isArray(idx.perfis)) {
      return { atual: idx.atual || null, perfis: idx.perfis };
    }
    return null;
  }

  function salvarIndice() {
    gravar(KEY_INDEX, _index);
  }

  function carregarSave(id) {
    if (!id) return defaultsSave();
    return Object.assign(defaultsSave(), ler(KEY_SAVE(id), {}));
  }

  function salvarSave() {
    if (_index.atual) gravar(KEY_SAVE(_index.atual), state);
  }

  function metaAtual() {
    if (!_index.atual) return null;
    return _index.perfis.find((p) => p.id === _index.atual) || null;
  }

  // ---------- migração do save antigo (v2, jogador único) ----------
  function migrarLegado() {
    const antigo = ler(KEY_LEGADO, null);
    if (!antigo) return null; // nada a migrar

    const id = novoId();
    const save = {
      melhorPontuacao: antigo.melhorPontuacao || 0,
      faseDesbloqueada: antigo.faseDesbloqueada || 1,
      estrelas: antigo.estrelas || {},
      fatos: antigo.fatos || {},
      bossRush: !!antigo.bossRush,
    };
    gravar(KEY_SAVE(id), save);

    // config antiga (incl. compat "muted") → config global
    const cfg = Object.assign(defaultsConfig(), antigo.config || {});
    if (typeof antigo.muted === "boolean" && (!antigo.config || antigo.config.efeitos === undefined)) {
      cfg.efeitos = !antigo.muted;
    }
    gravar(KEY_CONFIG, cfg);

    return {
      id,
      nome: "Jogador 1",
      heroiId: antigo.heroiId || 1,
      criadoEm: Date.now(),
    };
  }

  // ---------- inicialização ----------
  function init() {
    _index = carregarIndice();
    if (!_index) {
      // Sem índice: tentar migrar o save antigo (jogador único) para um perfil.
      // A migração grava KEY_CONFIG com a config antiga — por isso roda ANTES de
      // carregarmos _config (senão a config migrada não vai para a memória).
      const perfilMigrado = migrarLegado();
      if (perfilMigrado) {
        _index = { atual: perfilMigrado.id, perfis: [perfilMigrado] };
        remover(KEY_LEGADO);
      } else {
        _index = { atual: null, perfis: [] };
      }
      salvarIndice();
    }

    // Config global (já pode ter sido gravada pela migração).
    _config = Object.assign(defaultsConfig(), ler(KEY_CONFIG, {}));
    gravar(KEY_CONFIG, _config);

    state = carregarSave(_index.atual);
  }

  init();

  return {
    get() {
      return state;
    },

    // ===================== PERFIS =====================
    listarPerfis() {
      return _index.perfis.slice();
    },
    perfilAtual() {
      return metaAtual();
    },
    temPerfilAtual() {
      return !!metaAtual();
    },
    perfilCheio() {
      return _index.perfis.length >= MAX_PERFIS;
    },
    maxPerfis() {
      return MAX_PERFIS;
    },
    criarPerfil(nome, heroiId) {
      if (_index.perfis.length >= MAX_PERFIS) return null;
      const meta = {
        id: novoId(),
        nome: (nome || "Jogador").toString().slice(0, 12).trim() || "Jogador",
        heroiId: heroiId || 1,
        criadoEm: Date.now(),
      };
      _index.perfis.push(meta);
      _index.atual = meta.id;
      salvarIndice();
      state = defaultsSave();
      salvarSave();
      return meta;
    },
    selecionarPerfil(id) {
      const existe = _index.perfis.some((p) => p.id === id);
      if (!existe) return false;
      _index.atual = id;
      salvarIndice();
      state = carregarSave(id);
      return true;
    },
    removerPerfil(id) {
      const i = _index.perfis.findIndex((p) => p.id === id);
      if (i === -1) return false;
      _index.perfis.splice(i, 1);
      remover(KEY_SAVE(id));
      if (_index.atual === id) {
        _index.atual = null;
        state = defaultsSave();
      }
      salvarIndice();
      return true;
    },
    renomearPerfil(id, nome) {
      const meta = _index.perfis.find((p) => p.id === id);
      if (!meta) return false;
      meta.nome = (nome || meta.nome).toString().slice(0, 12).trim() || meta.nome;
      salvarIndice();
      return true;
    },

    // ===================== PROGRESSO / PONTUAÇÃO =====================
    setMelhorPontuacao(pontos) {
      if (pontos > state.melhorPontuacao) {
        state.melhorPontuacao = pontos;
        salvarSave();
      }
    },
    desbloquearFase(faseId) {
      if (faseId > (state.faseDesbloqueada || 1)) {
        state.faseDesbloqueada = faseId;
        salvarSave();
      }
    },
    faseMax() {
      return state.faseDesbloqueada || 1;
    },

    // ===================== HERÓI (avatar do perfil) =====================
    setHeroi(id) {
      const meta = metaAtual();
      if (meta) {
        meta.heroiId = id;
        salvarIndice();
      }
    },
    getHeroiId() {
      const meta = metaAtual();
      return (meta && meta.heroiId) || 1;
    },

    // ===================== ESTRELAS POR FASE =====================
    setEstrelas(faseId, estrelas) {
      const atual = state.estrelas[faseId] || 0;
      if (estrelas > atual) {
        state.estrelas[faseId] = estrelas;
        salvarSave();
      }
    },
    getEstrelas(faseId) {
      return state.estrelas[faseId] || 0;
    },
    totalEstrelas() {
      return Object.values(state.estrelas).reduce((s, n) => s + n, 0);
    },
    /** Total de estrelas de QUALQUER perfil (para a tela "Quem vai jogar?"). */
    totalEstrelasDe(id) {
      const save = carregarSave(id);
      return Object.values(save.estrelas || {}).reduce((s, n) => s + n, 0);
    },

    // ===================== REPETIÇÃO INTELIGENTE (fatos fracos) + ESTATÍSTICAS =====================
    registrarResposta(a, b, acertou) {
      const k = MathEngine.chaveFato(a, b); // chave canônica compartilhada com o motor
      let p = state.fatos[k] || 0;
      p = acertou ? Math.max(0, p * 0.5 - 0.2) : Math.min(8, p + 2);
      if (p <= 0.01) delete state.fatos[k];
      else state.fatos[k] = p;
      if (!state.estat) state.estat = { acertos: 0, erros: 0, tempoMs: 0 };
      if (acertou) state.estat.acertos += 1;
      else state.estat.erros += 1;
      salvarSave();
    },
    getFatos() {
      return state.fatos;
    },
    /** Acumula tempo de jogo (ms) no perfil atual. */
    adicionarTempo(ms) {
      if (!ms || ms < 0) return;
      if (!state.estat) state.estat = { acertos: 0, erros: 0, tempoMs: 0 };
      state.estat.tempoMs += ms;
      salvarSave();
    },
    /**
     * Resumo para o painel de progresso (pais/professor): precisão, tempo,
     * fraqueza por tabuada (1..10, a partir dos pesos de fatos) e fatos fracos.
     */
    estatisticas() {
      const e = state.estat || { acertos: 0, erros: 0, tempoMs: 0 };
      const acertos = e.acertos || 0;
      const erros = e.erros || 0;
      const total = acertos + erros;
      const precisao = total ? Math.round((acertos / total) * 100) : null;

      const fraqueza = {};
      for (let t = 1; t <= 10; t++) fraqueza[t] = 0;
      const lista = [];
      for (const k in state.fatos) {
        const peso = state.fatos[k];
        const partes = k.split("x").map(Number);
        const a = partes[0];
        const b = partes[1];
        if (a >= 1 && a <= 10) fraqueza[a] += peso;
        if (b >= 1 && b <= 10 && b !== a) fraqueza[b] += peso;
        lista.push({ a, b, peso });
      }
      let maxFraqueza = 0;
      for (let t = 1; t <= 10; t++) maxFraqueza = Math.max(maxFraqueza, fraqueza[t]);
      lista.sort((x, y) => y.peso - x.peso);
      const fatosFracos = lista.slice(0, 6).map((f) => `${f.a}×${f.b}`);

      return {
        acertos,
        erros,
        total,
        precisao,
        tempoMs: e.tempoMs || 0,
        fraquezaTabuadas: fraqueza,
        maxFraqueza,
        fatosFracos,
        totalEstrelas: this.totalEstrelas(),
        faseMax: this.faseMax(),
      };
    },

    // ===================== BOSS RUSH =====================
    desbloquearBossRush() {
      if (!state.bossRush) {
        state.bossRush = true;
        salvarSave();
      }
    },
    bossRushDesbloqueado() {
      return !!state.bossRush;
    },

    // ===================== MOEDAS =====================
    getMoedas() {
      return state.moedas || 0;
    },
    addMoedas(n) {
      if (!n) return;
      state.moedas = (state.moedas || 0) + n;
      salvarSave();
    },
    gastarMoedas(n) {
      if ((state.moedas || 0) < n) return false;
      state.moedas -= n;
      salvarSave();
      return true;
    },

    // ===================== ROUPAS / EFEITOS (loja) =====================
    /**
     * Snapshot do progresso para avaliar `requisito` de roupas-troféu
     * (requisitoAtendido em roupas.js) — mesmo formato nos testes.
     */
    requisitosSnapshot() {
      const e = state.estat || {};
      return {
        totalEstrelas: this.totalEstrelas(),
        bossRush: !!state.bossRush,
        melhorOfensiva: (state.desafio && state.desafio.melhorOfensiva) || 0,
        maxCombo: e.maxCombo || 0,
        acertos: e.acertos || 0,
      };
    },
    /** O requisito da roupa foi cumprido pelo perfil atual? (sem requisito = sim) */
    requisitoRoupaOk(roupaId) {
      const r = typeof getRoupa === "function" ? getRoupa(roupaId) : null;
      if (!r || typeof requisitoAtendido !== "function") return true;
      return requisitoAtendido(r, this.requisitosSnapshot());
    },
    roupaEquipada(heroId) {
      const eq = state.cosmeticos && state.cosmeticos.roupa && state.cosmeticos.roupa[heroId];
      if (eq) return eq;
      return typeof roupaBase === "function" ? roupaBase(heroId).id : getHeroi(heroId).img;
    },
    possuiRoupa(roupaId) {
      const r = typeof getRoupa === "function" ? getRoupa(roupaId) : null;
      if (r && r.preco === 0) return true; // base é grátis/sempre possuída
      return !!(state.cosmeticos && state.cosmeticos.possui.indexOf(roupaId) !== -1);
    },
    /** Compra (debita moedas) e já equipa. Retorna true se efetivou. */
    comprarRoupa(heroId, roupaId, preco) {
      if (!state.cosmeticos) state.cosmeticos = { possui: [], roupa: {} };
      if (this.possuiRoupa(roupaId)) {
        this.equiparRoupa(heroId, roupaId);
        return true;
      }
      if (!this.requisitoRoupaOk(roupaId)) return false; // troféu ainda bloqueado
      if ((state.moedas || 0) < preco) return false;
      state.moedas -= preco;
      state.cosmeticos.possui.push(roupaId);
      state.cosmeticos.roupa[heroId] = roupaId;
      salvarSave();
      return true;
    },
    equiparRoupa(heroId, roupaId) {
      if (!state.cosmeticos) state.cosmeticos = { possui: [], roupa: {} };
      state.cosmeticos.roupa[heroId] = roupaId;
      salvarSave();
    },
    /** Efeito de ataque equipado no perfil (id de EFEITOS; padrão = grátis). */
    efeitoEquipado() {
      const eq = state.cosmeticos && state.cosmeticos.efeito;
      if (eq) return eq;
      return typeof efeitoBase === "function" ? efeitoBase().id : "fx-raio";
    },
    possuiEfeito(efeitoId) {
      const e = typeof getEfeito === "function" ? getEfeito(efeitoId) : null;
      if (e && e.preco === 0) return true; // padrão sempre possuído
      return !!(state.cosmeticos && state.cosmeticos.possui.indexOf(efeitoId) !== -1);
    },
    /** Compra (debita moedas) e já equipa o efeito. Retorna true se efetivou. */
    comprarEfeito(efeitoId, preco) {
      if (!state.cosmeticos) state.cosmeticos = { possui: [], roupa: {} };
      if (this.possuiEfeito(efeitoId)) {
        this.equiparEfeito(efeitoId);
        return true;
      }
      if ((state.moedas || 0) < preco) return false;
      state.moedas -= preco;
      state.cosmeticos.possui.push(efeitoId);
      state.cosmeticos.efeito = efeitoId;
      salvarSave();
      return true;
    },
    equiparEfeito(efeitoId) {
      if (!state.cosmeticos) state.cosmeticos = { possui: [], roupa: {} };
      state.cosmeticos.efeito = efeitoId;
      salvarSave();
    },

    // ===================== CONQUISTAS =====================
    conquistasDesbloqueadas() {
      return state.conquistas || {};
    },
    /**
     * Avalia as CONQUISTAS contra um snapshot do progresso (+ ctx da partida),
     * desbloqueia as novas, credita as recompensas e retorna a lista das novas.
     */
    avaliarConquistas(ctx) {
      if (typeof CONQUISTAS === "undefined") return [];
      if (!state.conquistas) state.conquistas = {};
      const e = state.estat || {};
      const snap = {
        acertos: e.acertos || 0,
        totalEstrelas: this.totalEstrelas(),
        faseMax: this.faseMax(),
        bossRush: !!state.bossRush,
        maxCombo: e.maxCombo || 0,
        semErroVitorias: e.semErroVitorias || 0,
        tempoMs: e.tempoMs || 0,
        estrelasFase: state.estrelas || {},
      };
      const novas = [];
      CONQUISTAS.forEach((c) => {
        if (!state.conquistas[c.id] && c.cond(snap)) {
          state.conquistas[c.id] = true;
          state.moedas = (state.moedas || 0) + (c.recompensa || 0);
          novas.push(c);
        }
      });
      if (novas.length) salvarSave();
      return novas;
    },
    /** Atualiza recordes usados por conquistas ao terminar uma partida. */
    registrarFimDePartida(info) {
      if (!state.estat) state.estat = { acertos: 0, erros: 0, tempoMs: 0, maxCombo: 0, semErroVitorias: 0 };
      const mc = (info && info.maxCombo) || 0;
      if (mc > (state.estat.maxCombo || 0)) state.estat.maxCombo = mc;
      if (info && info.venceu && info.semErro) {
        state.estat.semErroVitorias = (state.estat.semErroVitorias || 0) + 1;
      }
      salvarSave();
    },

    // ===================== DESAFIO DIÁRIO (ofensiva/streak) =====================
    desafioFeitoHoje(hoje) {
      const h = hoje || hojeISO();
      return !!(state.desafio && state.desafio.ultimoDia === h);
    },
    /** Ofensiva atual (0 se nunca jogou ou a sequência quebrou). */
    ofensivaAtual(hoje) {
      const d = state.desafio;
      if (!d || !d.ultimoDia) return 0;
      const diff = diffDias(d.ultimoDia, hoje || hojeISO());
      return diff === 0 || diff === 1 ? d.ofensiva || 0 : 0;
    },
    melhorOfensiva() {
      return (state.desafio && state.desafio.melhorOfensiva) || 0;
    },
    /**
     * Registra a conclusão do desafio do dia. Se já feito hoje, não recompensa.
     * Senão estende a ofensiva (ou reinicia se pulou dia), credita moedas-bônus
     * (JOGO.moedas: desafioBase + min(ofensiva, teto) * desafioPorDia) e retorna
     * o resultado.
     */
    registrarDesafioDiario(hoje) {
      const h = hoje || hojeISO();
      if (!state.desafio) state.desafio = { ultimoDia: null, ofensiva: 0, melhorOfensiva: 0 };
      const d = state.desafio;
      if (d.ultimoDia === h) {
        return { ja: true, ofensiva: d.ofensiva, melhorOfensiva: d.melhorOfensiva, recompensa: 0 };
      }
      const diff = d.ultimoDia ? diffDias(d.ultimoDia, h) : null;
      d.ofensiva = diff === 1 ? (d.ofensiva || 0) + 1 : 1;
      d.ultimoDia = h;
      if (d.ofensiva > (d.melhorOfensiva || 0)) d.melhorOfensiva = d.ofensiva;
      const m = JOGO.moedas;
      const recompensa = m.desafioBase + Math.min(d.ofensiva, m.desafioTetoDias) * m.desafioPorDia;
      state.moedas = (state.moedas || 0) + recompensa;
      salvarSave();
      return { ja: false, ofensiva: d.ofensiva, melhorOfensiva: d.melhorOfensiva, recompensa };
    },

    // ===================== CONFIGURAÇÕES (globais do aparelho) =====================
    getConfig() {
      return _config;
    },
    setConfig(chave, valor) {
      _config[chave] = !!valor;
      gravar(KEY_CONFIG, _config);
    },

    // ===================== BACKUP (exportar/importar progresso) =====================
    /** Registra um aviso da UI para quando o localStorage falhar ao gravar. */
    onFalhaGravacao(fn) {
      _onFalhaGravacao = fn;
    },
    /** Snapshot completo (perfis + saves + config) para backup em arquivo. */
    exportarTudo() {
      const saves = {};
      _index.perfis.forEach((p) => {
        saves[p.id] = carregarSave(p.id);
      });
      return {
        formato: "idolmath-backup",
        versao: 1,
        geradoEm: new Date().toISOString(),
        config: _config,
        perfis: { atual: _index.atual, perfis: _index.perfis },
        saves,
      };
    },
    /**
     * Restaura um backup gerado por exportarTudo(), SUBSTITUINDO os perfis e
     * saves atuais. Valida o formato; retorna { ok, perfis } ou { ok:false }.
     */
    importarTudo(dados) {
      if (!dados || dados.formato !== "idolmath-backup") return { ok: false };
      const idx = dados.perfis;
      if (!idx || !Array.isArray(idx.perfis)) return { ok: false };
      const perfis = idx.perfis
        .filter((p) => p && typeof p.id === "string" && p.nome)
        .slice(0, MAX_PERFIS);
      if (!perfis.length) return { ok: false };

      _index.perfis.forEach((p) => remover(KEY_SAVE(p.id)));
      _index = {
        atual: perfis.some((p) => p.id === idx.atual) ? idx.atual : perfis[0].id,
        perfis,
      };
      salvarIndice();
      perfis.forEach((p) => {
        gravar(KEY_SAVE(p.id), Object.assign(defaultsSave(), (dados.saves || {})[p.id] || {}));
      });
      if (dados.config) {
        _config = Object.assign(defaultsConfig(), dados.config);
        gravar(KEY_CONFIG, _config);
      }
      state = carregarSave(_index.atual);
      return { ok: true, perfis: perfis.length };
    },
  };
})();
