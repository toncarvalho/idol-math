/**
 * UIScreens — camada de navegação em HTML sobreposta ao canvas do Phaser.
 *
 * Toda a navegação (Menu, Perfis, Herói, Mundos, Grade de fases, Ajustes,
 * Conquistas, Progresso, Loja, Resultado) é HTML real — botões <button>/<input> nativos,
 * acessíveis, sem os bugs de área de toque do canvas. O Phaser roda apenas o
 * gameplay (GameScene/TrainScene); ao terminar, a cena devolve o controle para
 * este overlay. A BootScene gera as texturas e chama UIScreens.irInicio().
 *
 * Reaproveita Storage, AudioFX, Util e os dados (HEROIS, FASES, CONQUISTAS,
 * ROUPAS) — sem alterá-los.
 */
const UIScreens = (() => {
  // ----- estado -----
  let dadosResultado = null;      // dados da última partida (tela de resultado)
  let modoPerfil = "selecao";     // "selecao" | "criacao"
  let removendoPerfil = false;
  let novoHeroiId = 1;
  let perfilParaRemover = null;
  let lojaHeroiSel = null;        // herói exibido na loja (abas de personagem)
  let lojaSel = null;             // item aguardando confirmação: { tipo: "roupa"|"efeito", id }
  let mundoSel = "tabuada";       // mundo exibido na grade de fases

  // ----- helpers -----
  function root() {
    return document.getElementById("ui-root");
  }
  function corHex(cor) {
    return Util.corHex(cor);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }
  function arquivoAvatar(roupaId, heroId) {
    const r = typeof getRoupa === "function" ? getRoupa(roupaId) : null;
    if (r) return r.file;
    return getHeroi(heroId).file;
  }

  // ----- toast (avisos rápidos: backup, falha ao salvar) -----
  let toastTimer = null;
  function toast(txt) {
    let el = document.getElementById("ui-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ui-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = txt;
    el.classList.add("on");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("on"), 3200);
  }

  // ===================== AJUSTES =====================
  const ITENS_AJUSTES = [
    { chave: "musica", emoji: "🎵", nome: "Música" },
    { chave: "efeitos", emoji: "🔊", nome: "Efeitos" },
    { chave: "timer", emoji: "⏱️", nome: "Cronômetro" },
    { chave: "voz", emoji: "🗣️", nome: "Ler em voz alta" },
  ];
  function pintarAjuste(chave) {
    const btn = document.querySelector(`#screen-ajustes [data-cfg="${chave}"]`);
    if (!btn) return;
    const it = ITENS_AJUSTES.find((x) => x.chave === chave);
    const ligado = !!Storage.getConfig()[chave];
    btn.textContent = `${it.emoji}  ${it.nome}:  ${ligado ? "LIGADO" : "desligado"}`;
    btn.classList.toggle("on", ligado);
    btn.setAttribute("aria-pressed", String(ligado));
  }
  function montarAjustes() {
    ITENS_AJUSTES.forEach((it) => pintarAjuste(it.chave));
  }
  function alternarAjuste(chave) {
    const atual = Storage.getConfig()[chave];
    Storage.setConfig(chave, !atual);
    if (chave === "musica") AudioFX.sincronizarMusica();
    if (chave === "efeitos" && !atual) AudioFX.acerto();
    pintarAjuste(chave);
  }

  // ----- backup do progresso (exportar/importar arquivo JSON) -----
  function exportarProgresso() {
    const dados = Storage.exportarTudo();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `idolmath-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("💾 Backup exportado! Guarde o arquivo num lugar seguro.");
  }
  function importarProgresso(arquivo) {
    if (!arquivo) return;
    arquivo
      .text()
      .then((txt) => {
        let dados = null;
        try {
          dados = JSON.parse(txt);
        } catch (e) {}
        const lista = dados && dados.perfis && dados.perfis.perfis;
        const n = Array.isArray(lista) ? lista.length : 0;
        if (!n || dados.formato !== "idolmath-backup") {
          toast("Arquivo de backup inválido 😕");
          return;
        }
        const okConf = window.confirm(
          `Importar backup com ${n} jogador(es)?\nOs jogadores atuais deste aparelho serão SUBSTITUÍDOS.`
        );
        if (!okConf) return;
        const r = Storage.importarTudo(dados);
        if (!r.ok) {
          toast("Não foi possível importar o backup 😕");
          return;
        }
        AudioFX.sincronizarMusica();
        toast(`✅ ${r.perfis} jogador(es) restaurado(s)!`);
        api.irInicio();
      })
      .catch(() => toast("Não foi possível ler o arquivo 😕"));
  }

  // ===================== PETS (conquistas → companheiros com poderes) =====================
  function montarConquistas() {
    const desbloq = Storage.conquistasDesbloqueadas();
    const feitas = CONQUISTAS.filter((c) => desbloq[c.id]).length;
    const cont = document.getElementById("conq-contagem");
    if (cont) cont.textContent = `🐾 ${feitas}/${CONQUISTAS.length} adotados · toque para equipar`;
    const lista = document.getElementById("conq-lista");
    if (!lista) return;
    const equipado = Storage.petEquipado();
    lista.innerHTML = CONQUISTAS.map((c) => {
      const pet = typeof petDaConquista === "function" ? petDaConquista(c.id) : null;
      const feito = !!desbloq[c.id];
      if (!pet) {
        // conquista sem pet (futuras): linha de medalha simples
        return `
          <div class="conq-row ${feito ? "done" : "locked"}">
            <span class="conq-ico">${feito ? c.icone : "🔒"}</span>
            <span class="conq-txt"><b>${esc(c.nome)}</b><small>${esc(c.desc)}</small></span>
            <span class="conq-pre">🪙 ${c.recompensa}</span>
          </div>`;
      }
      const img = `<img class="pet-av ${feito ? "" : "silhueta"}" src="assets/pets/pet-${pet.id}.svg"
        alt="${feito ? esc(pet.nome) : "Pet misterioso"}" loading="lazy"
        onerror="this.outerHTML='<span class=&quot;conq-ico&quot;>${pet.emoji}</span>'">`;
      if (!feito) {
        // bloqueado: silhueta-surpresa + poder + como desbloquear (a conquista)
        return `
          <div class="conq-row pet-row locked">
            ${img}
            <span class="conq-txt"><b>Quem será? 🔒</b><small>${esc(pet.poderDesc)}</small>
              <small class="pet-como">Para adotar: ${esc(c.desc)} ${c.icone} · 🪙 ${c.recompensa}</small></span>
          </div>`;
      }
      const eq = pet.id === equipado;
      return `
        <button class="conq-row pet-row done ${eq ? "eq" : ""}" type="button" data-pet="${pet.id}">
          ${img}
          <span class="conq-txt"><b>${esc(pet.nome)} · ${esc(pet.especie)}</b><small>${esc(pet.poderDesc)}</small>
            <small class="pet-como">${c.icone} ${esc(c.nome)}</small></span>
          <span class="pet-estado">${eq ? "✓ Junto!" : "Equipar"}</span>
        </button>`;
    }).join("");
  }
  /** Toque num pet desbloqueado: equipa (ou desequipa, se já estava junto). */
  function escolherPet(petId) {
    if (!Storage.petDesbloqueado(petId)) return;
    const vaiEquipar = Storage.petEquipado() !== petId;
    Storage.equiparPet(vaiEquipar ? petId : null);
    if (vaiEquipar) AudioFX.acerto();
    montarConquistas();
  }

  // ===================== PROGRESSO =====================
  let treinoFracas = [];
  function formatarTempo(ms) {
    const min = Math.floor(ms / 60000);
    if (min >= 60) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
    if (min >= 1) return `${min} min`;
    return `${Math.round(ms / 1000)}s`;
  }
  function classeFraqueza(peso, max) {
    if (max <= 0 || peso <= 0) return "verde";
    return peso / max <= 0.5 ? "amarelo" : "vermelho";
  }
  function montarProgresso() {
    const meta = Storage.perfilAtual();
    const nome = document.getElementById("prog-nome");
    if (nome) nome.textContent = meta ? `👤 ${esc(meta.nome)}` : "";
    const corpo = document.getElementById("prog-corpo");
    if (!corpo) return;
    const est = Storage.estatisticas();
    if (est.total === 0) {
      corpo.innerHTML = `<p class="prog-vazio">Ainda sem dados.<br>Jogue uma partida ou o Treino! 🎮</p>`;
      treinoFracas = [];
      return;
    }
    const prec = est.precisao === null ? "—" : `${est.precisao}%`;
    const nums = `
      <div class="prog-nums">
        <div class="prog-num"><span class="pn-ico">🎯</span><b>${prec}</b><small>${est.acertos}/${est.total}</small></div>
        <div class="prog-num"><span class="pn-ico">⏱️</span><b>${formatarTempo(est.tempoMs)}</b><small>tempo</small></div>
        <div class="prog-num"><span class="pn-ico">⭐</span><b>${est.totalEstrelas}/${FASES.length * 3}</b><small>estrelas</small></div>
      </div>`;
    let heat = "";
    for (let t = 1; t <= 10; t++) {
      heat += `<span class="heat-cell ${classeFraqueza(est.fraquezaTabuadas[t], est.maxFraqueza)}">${t}</span>`;
    }
    const mapa = `<p class="prog-legenda">Tabuadas — 🟥 treinar mais · 🟩 dominada</p><div class="prog-heat">${heat}</div>`;
    const fracosHtml = est.fatosFracos.length
      ? `<p class="prog-focar">📚 Focar: ${est.fatosFracos.join("   ")}</p>` : "";
    const tabs = [];
    for (let t = 1; t <= 10; t++) tabs.push({ t, w: est.fraquezaTabuadas[t] });
    tabs.sort((a, b) => b.w - a.w);
    treinoFracas = tabs.filter((x) => x.w > 0).slice(0, 3).map((x) => x.t);
    const treinoBtn = treinoFracas.length
      ? `<button class="ui-btn prog-treino" type="button" data-acao="treino-fracas">🎯 Treinar ${treinoFracas.join(", ")}</button>` : "";
    corpo.innerHTML = nums + mapa + fracosHtml + treinoBtn;
  }

  // ===================== LOJA =====================
  // Fluxo de compra em 2 toques (jogo infantil, sem compra acidental):
  // 1º toque num item não possuído SELECIONA (preview + botão "Comprar");
  // 2º toque no mesmo card, ou no botão, CONFIRMA. Itens possuídos equipam
  // direto. Abas trocam o personagem exibido sem sair da loja.
  function mostrarMsgLoja(txt) {
    const m = document.getElementById("loja-msg");
    if (m) m.textContent = txt;
  }
  function lojaHeroiAtual() {
    return lojaHeroiSel || Storage.getHeroiId();
  }
  function itemSelecionado() {
    if (!lojaSel) return null;
    return lojaSel.tipo === "roupa" ? getRoupa(lojaSel.id) : getEfeito(lojaSel.id);
  }
  function cardLoja(attr, id, miolo, info) {
    const selCls = lojaSel && lojaSel.id === id ? " sel" : "";
    return `
      <button class="roupa-card ${info.cls}${selCls}" type="button" ${attr}="${id}" style="--cor:${info.cor}">
        ${miolo}
        <span class="roupa-estado">${info.estado}</span>${info.falta}
      </button>`;
  }
  /** Estado do card (classe, rótulo, "faltam N") comum a roupas e efeitos. */
  function infoCard(equipado, possui, preco, moedas, reqOk, cor) {
    // "Em uso" é neutro — serve para roupa (a Neon) e efeito (o Raio)
    if (equipado) return { cls: "equipada", estado: "✓ Em uso", falta: "", cor };
    if (possui) return { cls: "possui", estado: "Equipar", falta: "", cor };
    if (!reqOk) return { cls: "bloq", estado: `🔒 🪙 ${preco}`, falta: "", cor };
    const falta = moedas < preco
      ? `<span class="roupa-falta">faltam 🪙 ${preco - moedas}</span>` : "";
    return { cls: "comprar", estado: `🪙 ${preco}`, falta, cor };
  }
  function montarLoja() {
    const heroId = lojaHeroiAtual();
    const heroi = getHeroi(heroId);
    const equipada = Storage.roupaEquipada(heroId);
    const cor = corHex(heroi.cor);
    const moedas = Storage.getMoedas();
    const saldo = document.getElementById("loja-saldo");
    if (saldo) saldo.textContent = `🪙 ${moedas} moedas`;
    mostrarMsgLoja("");
    const corpo = document.getElementById("loja-corpo");
    if (!corpo) return;

    // abas de personagem (troca sem sair da loja)
    const tabs = HEROIS.map((h) => `
      <button class="loja-tab ${h.id === heroId ? "sel" : ""}" type="button"
        data-lojaheroi="${h.id}" style="--cor:${corHex(h.cor)}" aria-label="${esc(h.nome)}">
        <img src="assets/herois/${arquivoAvatar(Storage.roupaEquipada(h.id), h.id)}.svg" alt="">
      </button>`).join("");

    // preview grande: item selecionado (experimentar antes de comprar) ou o equipado
    let previewFile = arquivoAvatar(equipada, heroId);
    let previewFx = "";
    let legenda = esc(heroi.nome);
    const sel = itemSelecionado();
    if (sel && lojaSel.tipo === "roupa") {
      previewFile = sel.file;
      legenda = `${esc(heroi.nome)} · ${esc(sel.nome)}`;
    } else if (sel && lojaSel.tipo === "efeito") {
      previewFx = `<span class="loja-preview-fx">${sel.icone}</span>`;
      legenda = `${esc(heroi.nome)} · ${esc(sel.nome)}`;
    }

    // área de confirmação do item selecionado
    let confirmar = "";
    if (sel) {
      const reqOk = lojaSel.tipo !== "roupa" || Storage.requisitoRoupaOk(sel.id);
      if (!reqOk) {
        confirmar = `<p class="loja-req">🔒 Para desbloquear: ${esc(sel.requisito.desc)}</p>`;
      } else if (moedas < sel.preco) {
        confirmar = `<p class="loja-req">Faltam 🪙 ${sel.preco - moedas} — jogue pra ganhar! 🎮</p>`;
      } else {
        confirmar = `<button class="ui-btn mg-ouro loja-comprar" type="button" data-acao="loja-comprar">
          🛍️ Comprar ${esc(sel.nome)} por 🪙 ${sel.preco}</button>`;
      }
    }

    const cards = roupasDoHeroi(heroId).map((r) => {
      const info = infoCard(
        r.id === equipada, Storage.possuiRoupa(r.id), r.preco, moedas,
        Storage.requisitoRoupaOk(r.id), cor
      );
      const miolo = `
        <img class="roupa-img" src="assets/herois/${r.file}.svg" alt="${esc(r.nome)}" loading="lazy">
        <span class="roupa-nome">${esc(r.nome)}</span>`;
      return cardLoja("data-roupa", r.id, miolo, info);
    }).join("");

    const fxEquipado = Storage.efeitoEquipado();
    const fxCards = EFEITOS.map((e) => {
      const info = infoCard(
        e.id === fxEquipado, Storage.possuiEfeito(e.id), e.preco, moedas, true, cor
      );
      const miolo = `
        <span class="fx-icone">${e.icone}</span>
        <span class="roupa-nome">${esc(e.nome)}</span>`;
      return cardLoja("data-efeito", e.id, miolo, info);
    }).join("");

    corpo.innerHTML = `
      <div class="loja-tabs">${tabs}</div>
      <div class="loja-preview" style="--cor:${cor}">
        <img src="assets/herois/${previewFile}.svg" alt="${esc(heroi.nome)}">${previewFx}
      </div>
      <p class="loja-hero" style="color:${cor}">${legenda}</p>
      ${confirmar}
      <div class="loja-grid">${cards}</div>
      <p class="loja-sec">✨ Efeito de ataque <small>vale para todos os personagens</small></p>
      <div class="loja-grid loja-grid-fx">${fxCards}</div>`;
  }
  function escolherRoupa(roupaId) {
    const heroId = lojaHeroiAtual();
    const roupa = typeof getRoupa === "function" ? getRoupa(roupaId) : null;
    if (!roupa) return;
    if (Storage.possuiRoupa(roupa.id)) {
      if (roupa.id !== Storage.roupaEquipada(heroId)) {
        Storage.equiparRoupa(heroId, roupa.id);
        AudioFX.acerto();
      }
      lojaSel = null;
      return montarLoja();
    }
    // não possuída: 1º toque seleciona (preview); 2º toque confirma a compra
    if (lojaSel && lojaSel.tipo === "roupa" && lojaSel.id === roupa.id) {
      return comprarSelecionado();
    }
    lojaSel = { tipo: "roupa", id: roupa.id };
    montarLoja();
  }
  function escolherEfeito(efeitoId) {
    const efeito = typeof getEfeito === "function" ? getEfeito(efeitoId) : null;
    if (!efeito || efeito.id !== efeitoId) return;
    if (Storage.possuiEfeito(efeito.id)) {
      if (efeito.id !== Storage.efeitoEquipado()) {
        Storage.equiparEfeito(efeito.id);
        AudioFX.acerto();
      }
      lojaSel = null;
      return montarLoja();
    }
    if (lojaSel && lojaSel.tipo === "efeito" && lojaSel.id === efeito.id) {
      return comprarSelecionado();
    }
    lojaSel = { tipo: "efeito", id: efeito.id };
    montarLoja();
  }
  function comprarSelecionado() {
    const item = itemSelecionado();
    if (!item) return;
    if (lojaSel.tipo === "roupa" && !Storage.requisitoRoupaOk(item.id)) {
      AudioFX.erro();
      return mostrarMsgLoja(`🔒 Para desbloquear: ${item.requisito.desc}`);
    }
    const falta = item.preco - Storage.getMoedas();
    if (falta > 0) {
      AudioFX.erro();
      return mostrarMsgLoja(`Faltam 🪙 ${falta} — jogue pra ganhar! 🎮`);
    }
    const ok = lojaSel.tipo === "roupa"
      ? Storage.comprarRoupa(lojaHeroiAtual(), item.id, item.preco)
      : Storage.comprarEfeito(item.id, item.preco);
    if (!ok) {
      AudioFX.erro();
      return;
    }
    lojaSel = null;
    AudioFX.vitoria();
    montarLoja();
    celebrarCompra(item.nome);
  }
  /** Festinha da compra: mensagem + pulso no preview + chuva de confetes. */
  function celebrarCompra(nome) {
    mostrarMsgLoja(`🎉 ${nome} é sua!`);
    const prev = document.querySelector("#screen-loja .loja-preview");
    if (prev) {
      prev.classList.add("pulsa");
      setTimeout(() => prev.classList.remove("pulsa"), 600);
    }
    if (Util.reduzirMovimento()) return;
    const card = document.querySelector("#screen-loja .ui-card");
    if (!card) return;
    const EMOJIS = ["✨", "🎉", "⭐", "💖", "🪙"];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement("span");
      s.className = "loja-confete";
      s.textContent = EMOJIS[i % EMOJIS.length];
      s.style.left = `${6 + Math.random() * 86}%`;
      s.style.animationDelay = `${(Math.random() * 0.3).toFixed(2)}s`;
      s.style.fontSize = `${16 + Math.round(Math.random() * 14)}px`;
      card.appendChild(s);
      setTimeout(() => s.remove(), 1800);
    }
  }

  // ===================== MENU =====================
  function montarMenu() {
    AudioFX.sincronizarMusica();
    const meta = Storage.perfilAtual();
    const heroId = meta ? meta.heroiId : Storage.getHeroiId();
    // "Continuar" retoma o ÚLTIMO mundo jogado (não só a Tabuada)
    const mundoCont = getMundo(Storage.ultimoMundo()) || getMundo("tabuada");
    const faseMax = Storage.faseMax(mundoCont.id);
    const ofensiva = Storage.ofensivaAtual();
    const feito = Storage.desafioFeitoHoje();
    const avatarFile = arquivoAvatar(Storage.roupaEquipada(heroId), heroId);
    const petM = typeof petEquipadoInfo === "function" ? petEquipadoInfo() : null;
    const corpo = document.getElementById("menu-corpo");
    if (!corpo) return;
    corpo.innerHTML = `
      <div class="menu-header">
        <button class="menu-avatar" type="button" data-acao="heroi" title="Trocar avatar">
          <img src="assets/herois/${avatarFile}.svg" alt="avatar">
        </button>
        ${petM ? `<span class="menu-pet" title="${esc(petM.nome)}"><img src="assets/pets/pet-${petM.id}.svg" alt="${esc(petM.nome)}"></span>` : ""}
        <div class="menu-id">
          <span class="menu-nome">${meta ? esc(meta.nome) : ""}</span>
          <span class="menu-saldo">🪙 ${Storage.getMoedas()}${ofensiva > 0 ? `   🔥 ${ofensiva}` : ""}</span>
        </div>
        <button class="ui-btn menu-trocar" type="button" data-acao="perfis" title="Trocar jogador">🔄</button>
      </div>
      <button class="ui-btn menu-jogar" type="button" data-acao="jogar">▶  JOGAR</button>
      ${faseMax > 1 ? `<button class="ui-btn menu-continuar" type="button" data-acao="continuar">↪  Continuar (${mundoCont.emoji} Fase ${faseMax})</button>` : ""}
      <div class="menu-grid3">
        <button class="ui-btn mg-rosa" type="button" data-acao="treino">📚 Treino</button>
        <button class="ui-btn mg-verde" type="button" data-acao="progresso">📊 Progresso</button>
        <button class="ui-btn mg-cinza" type="button" data-acao="ajustes">⚙️ Ajustes</button>
      </div>
      <div class="menu-grid3">
        <button class="ui-btn ${feito ? "mg-cinza" : "mg-laranja"}" type="button" data-acao="desafio">${feito ? "🗓️ Desafio ✓" : "🗓️ Desafio"}</button>
        <button class="ui-btn mg-ouro" type="button" data-acao="conquistas">🐾 Pets</button>
        <button class="ui-btn mg-rosa" type="button" data-acao="loja">🛍️ Loja</button>
      </div>
      <p class="menu-stats">🗺️ ${FASES.length} fases  ·  ⭐ ${Storage.totalEstrelas()}/${FASES.length * 3}  ·  🏆 ${Storage.get().melhorPontuacao}</p>`;
  }

  // ===================== MUNDOS (seleção de habilidade) =====================
  function estrelasDoMundo(mundoId) {
    return fasesDoMundo(mundoId).reduce((s, f) => s + Storage.getEstrelas(f.id), 0);
  }
  function montarMundos() {
    const sub = document.getElementById("mundos-sub");
    if (sub) sub.textContent = "Qual habilidade você vai treinar?";
    const corpo = document.getElementById("mundos-corpo");
    if (!corpo) return;
    corpo.innerHTML = MUNDOS.map((m) => {
      const cor = corHex(m.cor);
      // mundo ainda em construção: prévia não-clicável (mostra o que vem aí)
      if (m.emBreve) {
        return `
          <div class="mundo-row breve" style="--cor:${cor}">
            <span class="mundo-emoji">${m.emoji}</span>
            <span class="mundo-info"><b>${esc(m.nome)}</b><small>${esc(m.descricao)}</small></span>
            <span class="mundo-breve">🚧 Em breve</span>
          </div>`;
      }
      const fases = fasesDoMundo(m.id);
      return `
        <button class="mundo-row" type="button" data-mundo="${m.id}" style="--cor:${cor}">
          <span class="mundo-emoji">${m.emoji}</span>
          <span class="mundo-info"><b style="color:${cor}">${esc(m.nome)}</b><small>${esc(m.descricao)}</small></span>
          <span class="mundo-prog">⭐ ${estrelasDoMundo(m.id)}/${fases.length * 3}</span>
        </button>`;
    }).join("");
  }

  // ===================== GRADE DE FASES (do mundo selecionado) =====================
  function rotuloFoco(fase) {
    if (fase.foco) return fase.foco; // mundos novos declaram o rótulo na fase
    const t = fase.tabuadas;
    if (!t) return "";
    if (t.length >= 10) return "Mix";
    if (t.length === 1) return `Tab. ${t[0]}`;
    return `Tab. ${t[0]}–${t[t.length - 1]}`;
  }
  /** Arquivo do chefão para o tile: respeita arte reaproveitada (imgBoss
   *  "boss7" → boss-7.svg; sem imgBoss, usa o id da própria fase). */
  function arquivoBossTile(fase) {
    const chave = fase.imgBoss || `boss${fase.id}`;
    return chave.replace(/^boss/, "boss-");
  }
  function montarGrade() {
    const mundo = getMundo(mundoSel) || getMundo("tabuada");
    const fases = fasesDoMundo(mundo.id);
    const faseMax = Storage.faseMax(mundo.id);
    const titulo = document.getElementById("grade-titulo");
    if (titulo) titulo.textContent = `${mundo.emoji} ${mundo.nome.toUpperCase()}`;
    const sub = document.getElementById("grade-sub");
    if (sub) sub.textContent = `${mundo.descricao}  ·  ⭐ ${estrelasDoMundo(mundo.id)}`;
    const tiles = fases.map((f, i) => {
      const num = i + 1; // posição no mundo (na Tabuada, igual ao id)
      const desbloqueada = num <= faseMax;
      if (!desbloqueada) {
        return `<div class="fase-tile bloq"><span class="ft-num">${num}</span><span class="ft-lock">🔒</span></div>`;
      }
      const e = Storage.getEstrelas(f.id);
      const estr = "★".repeat(e) + "☆".repeat(3 - e);
      return `
        <button class="fase-tile" type="button" data-fase="${f.id}" style="--cor:${corHex(f.corTema)}">
          <span class="ft-num">${num}</span>
          <span class="ft-emo"><img src="assets/inimigos/${arquivoBossTile(f)}.svg" alt=""
            onerror="this.parentNode.textContent='${f.boss.emoji}'"></span>
          <span class="ft-foco">${rotuloFoco(f)}</span>
          <span class="ft-estrelas ${e ? "on" : ""}">${estr}</span>
        </button>`;
    }).join("");
    const corpo = document.getElementById("grade-corpo");
    if (!corpo) return;
    // Boss Rush é dos chefões da Tabuada — só aparece nesse mundo
    const bossRush = mundo.id === "tabuada" && Storage.bossRushDesbloqueado()
      ? `<button class="ui-btn grade-boss" type="button" data-acao="bossrush">💀  BOSS RUSH</button>` : "";
    corpo.innerHTML = `<div class="grade-tiles">${tiles}</div>${bossRush}`;
  }

  // ===================== HERÓI (trocar avatar) =====================
  function montarHeroi() {
    const sel = Storage.getHeroiId();
    const corpo = document.getElementById("heroi-corpo");
    if (!corpo) return;
    corpo.innerHTML = HEROIS.map((h) => {
      const file = arquivoAvatar(Storage.roupaEquipada(h.id), h.id);
      const cor = corHex(h.cor);
      const atual = h.id === sel;
      return `
        <button class="hero-row ${atual ? "atual" : ""}" type="button" data-heroi="${h.id}" style="--cor:${cor}">
          <img class="hero-av" src="assets/herois/${file}.svg" alt="${esc(h.nome)}">
          <span class="hero-info"><b style="color:${cor}">${esc(h.nome)}</b><small>${esc(h.descricao)}</small></span>
          ${atual ? '<span class="hero-check">✓</span>' : ""}
        </button>`;
    }).join("");
  }

  // ===================== PERFIS =====================
  function montarPerfis() {
    const titulo = document.getElementById("perfis-titulo");
    if (modoPerfil === "criacao" || Storage.listarPerfis().length === 0) {
      if (titulo) titulo.textContent = "NOVO JOGADOR";
      montarPerfisCriacao();
    } else {
      if (titulo) titulo.textContent = "QUEM VAI JOGAR?";
      montarPerfisSelecao();
    }
  }
  function montarPerfisSelecao() {
    const corpo = document.getElementById("perfis-corpo");
    if (!corpo) return;
    const perfis = Storage.listarPerfis();
    const atualId = Storage.perfilAtual() && Storage.perfilAtual().id;
    const cards = perfis.map((meta) => {
      const h = getHeroi(meta.heroiId);
      const marca = removendoPerfil ? '<span class="pf-marca">🗑️</span>'
        : meta.id === atualId ? '<span class="pf-check">✓</span>' : "";
      return `
        <button class="perfil-card ${removendoPerfil ? "rem" : ""} ${meta.id === atualId ? "atual" : ""}" type="button" data-perfil="${meta.id}" style="--cor:${corHex(h.cor)}">
          <img class="pf-av" src="assets/herois/${h.file}.svg" alt="${esc(meta.nome)}">
          <span class="pf-nome">${esc(meta.nome)}</span>
          <span class="pf-estr">⭐ ${Storage.totalEstrelasDe(meta.id)}</span>
          ${marca}
        </button>`;
    }).join("");
    const podeNovo = !Storage.perfilCheio() && !removendoPerfil;
    const podeMenu = Storage.temPerfilAtual() && !removendoPerfil;
    corpo.innerHTML = `
      ${removendoPerfil ? '<p class="ui-msg">Toque num jogador para remover</p>' : ""}
      <div class="perfil-grid">${cards}</div>
      ${podeNovo ? '<button class="ui-btn pf-novo" type="button" data-acao="novo-jogador">➕  Novo jogador</button>' : ""}
      ${perfis.length ? `<button class="ui-btn pf-remover ${removendoPerfil ? "on" : ""}" type="button" data-acao="remover-toggle">${removendoPerfil ? "✓  Concluir" : "🗑️  Remover"}</button>` : ""}
      ${podeMenu ? '<button class="ui-btn ui-voltar" type="button" data-acao="menu">↩  Menu</button>' : ""}`;
  }
  function montarPerfisCriacao() {
    const corpo = document.getElementById("perfis-corpo");
    if (!corpo) return;
    const temPerfis = Storage.listarPerfis().length > 0;
    const heroCards = HEROIS.map((h) =>
      `<button class="hero-pick ${h.id === novoHeroiId ? "sel" : ""}" type="button" data-novoheroi="${h.id}" style="--cor:${corHex(h.cor)}">
        <img src="assets/herois/${h.file}.svg" alt="${esc(h.nome)}">
        <span style="color:${corHex(h.cor)}">${esc(h.nome)}</span>
      </button>`).join("");
    corpo.innerHTML = `
      <label class="pf-label" for="nome-input">Seu nome:</label>
      <input id="nome-input" class="nome-input" type="text" maxlength="12" placeholder="Digite seu nome" autocomplete="off" autocapitalize="words">
      <p class="pf-label">Escolha seu personagem:</p>
      <div class="hero-grid">${heroCards}</div>
      <button class="ui-btn pf-criar" type="button" data-acao="criar-perfil">✨  Criar jogador</button>
      <button class="ui-btn ui-voltar" type="button" data-acao="perfis-voltar">↩  ${temPerfis ? "Voltar" : "Menu"}</button>`;
  }
  function marcarHeroPick() {
    document.querySelectorAll("#perfis-corpo .hero-pick").forEach((b) => {
      b.classList.toggle("sel", +b.dataset.novoheroi === novoHeroiId);
    });
  }
  function tocarPerfil(id) {
    if (removendoPerfil) {
      perfilParaRemover = Storage.listarPerfis().find((p) => p.id === id) || null;
      api.abrir("confirma");
      return;
    }
    AudioFX.acerto();
    Storage.selecionarPerfil(id);
    api.abrir("menu");
  }
  function criarPerfil() {
    const input = document.getElementById("nome-input");
    const nome = ((input && input.value) || "").trim();
    if (!nome) {
      if (input) {
        input.focus();
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 400);
      }
      return;
    }
    AudioFX.acerto();
    Storage.criarPerfil(nome, novoHeroiId);
    modoPerfil = "selecao";
    api.abrir("menu");
  }
  function perfisVoltar() {
    if (Storage.listarPerfis().length > 0) {
      modoPerfil = "selecao";
      api.abrir("perfis");
    } else if (Storage.temPerfilAtual()) {
      api.abrir("menu");
    } else {
      modoPerfil = "criacao";
      api.abrir("perfis");
    }
  }

  // ===================== TREINO (seleção de tabuada) =====================
  function montarTreino() {
    const corpo = document.getElementById("treino-corpo");
    if (!corpo) return;
    let tiles = "";
    for (let n = 1; n <= 10; n++) {
      tiles += `<button class="treino-tile" type="button" data-treino="${n}">${n}</button>`;
    }
    corpo.innerHTML = `
      <div class="treino-grid">${tiles}</div>
      <button class="ui-btn treino-mix" type="button" data-acao="treino-mix">🌀  Mix (1–10)</button>`;
  }

  // ===================== CONFIRMA (remover perfil) =====================
  function montarConfirma() {
    const corpo = document.getElementById("confirma-corpo");
    if (!corpo) return;
    const nome = perfilParaRemover ? perfilParaRemover.nome : "";
    corpo.innerHTML = `
      <p class="confirma-txt">Apagar "${esc(nome)}" e todo o progresso deste jogador?</p>
      <button class="ui-btn confirma-sim" type="button" data-acao="apagar-perfil">🗑️  Apagar</button>
      <button class="ui-btn ui-voltar" type="button" data-acao="cancelar-apagar">Cancelar</button>`;
  }
  function apagarPerfil() {
    if (perfilParaRemover) {
      AudioFX.erro();
      Storage.removerPerfil(perfilParaRemover.id);
    }
    perfilParaRemover = null;
    if (Storage.listarPerfis().length === 0) {
      modoPerfil = "criacao";
      removendoPerfil = false;
    } else {
      modoPerfil = "selecao";
    }
    api.abrir("perfis");
  }

  // ===================== RESULTADO =====================
  /** Linha "você adotou um pet!" quando uma conquista nova traz pet junto. */
  function htmlNovosPets(d) {
    if (!d.novasConquistas || !d.novasConquistas.length) return "";
    if (typeof petDaConquista !== "function") return "";
    const pets = d.novasConquistas.map((c) => petDaConquista(c.id)).filter(Boolean);
    if (!pets.length) return "";
    return `<p class="res-pet">🐾 Você adotou ${pets
      .map((p) => `${esc(p.nome)} ${p.emoji}`)
      .join(" e ")}! Equipe na tela 🐾 Pets</p>`;
  }
  function estrelasHtml(n) {
    let s = "";
    for (let i = 0; i < 3; i++) s += `<span class="res-star ${i < n ? "on" : ""}">★</span>`;
    return s;
  }
  function montarResultado() {
    const d = dadosResultado || {};
    const titulo = document.getElementById("resultado-titulo");
    const corpo = document.getElementById("resultado-corpo");
    if (!corpo) return;
    if (d.diario) return montarResultadoDiario(d, titulo, corpo);
    const venceu = d.venceu;
    if (titulo) {
      titulo.textContent = venceu ? "🏆 VITÓRIA!" : "FIM DE SHOW";
      titulo.style.color = venceu ? "#ffd23e" : "#ff3ea5";
    }
    const fase = getFase(d.faseId);
    const sub = d.bossRush
      ? (venceu ? "Você sobreviveu ao Boss Rush!" : "O Boss Rush te derrubou...")
      : (venceu ? `Você derrotou ${esc(fase.boss.nome)}!` : "A plateia ficou no escuro...");
    const total = d.acertos + d.erros;
    const precisao = total ? Math.round((d.acertos / total) * 100) : 100;
    const fatos = [...new Set(d.errosFatos || [])].slice(0, 6);
    const fatosTxt = fatos.length ? `📚 Treine: ${fatos.join("   ")}` : "🎉 Mandou bem! Nenhum erro.";
    corpo.innerHTML = `
      ${d.bossRush && venceu ? '<div class="res-coroa">👑🏆👑</div>' : `<div class="res-stars">${estrelasHtml(d.estrelas || 0)}</div>`}
      <p class="res-sub">${sub}</p>
      <div class="res-painel">
        <div><span>Pontuação</span><b>${d.pontuacao}</b></div>
        <div><span>Precisão</span><b>${precisao}%  (${d.acertos}/${total})</b></div>
        <div><span>Combo máximo</span><b>x${d.maxCombo}</b></div>
        <div><span>Recorde</span><b>${Storage.get().melhorPontuacao}</b></div>
      </div>
      ${d.moedasGanhas ? `<p class="res-coins">🪙 +${d.moedasGanhas} moedas</p>` : ""}
      ${d.novasConquistas && d.novasConquistas.length ? `<p class="res-conq">🏅 Nova conquista!  ${d.novasConquistas.map((c) => esc(c.icone + " " + c.nome)).join("   ")}</p>` : ""}
      ${htmlNovosPets(d)}
      <p class="res-fatos ${fatos.length ? "" : "ok"}">${fatosTxt}</p>
      ${venceu && d.temProxima
        ? '<button class="ui-btn res-prox" type="button" data-acao="result-proxima">▶  Próxima Fase</button>'
        : `<button class="ui-btn res-replay" type="button" data-acao="result-replay">↻  ${venceu ? "Jogar de novo" : "Tentar de novo"}</button>`}
      <button class="ui-btn res-fases" type="button" data-acao="result-fases">🗺  Fases</button>
      <button class="ui-btn ui-voltar" type="button" data-acao="menu">🏠  Menu</button>`;
  }
  function montarResultadoDiario(d, titulo, corpo) {
    const venceu = d.venceu;
    if (titulo) {
      titulo.textContent = venceu ? "🔥 DESAFIO!" : "QUASE!";
      titulo.style.color = venceu ? "#ffd23e" : "#ff3ea5";
    }
    const total = d.acertos + d.erros;
    const precisao = total ? Math.round((d.acertos / total) * 100) : 100;
    const frase = d.ofensiva === 1 ? "1 dia seguido" : `${d.ofensiva} dias seguidos`;
    const aviso = !venceu
      ? "Você não completou o desafio — tente de novo! 💪"
      : d.jaFeito
      ? "Você já fez o desafio de hoje — volte amanhã pra manter a ofensiva! 😉"
      : "Volte amanhã pra aumentar a ofensiva! 🔥";
    corpo.innerHTML = `
      <div class="res-fogo">${venceu ? "🔥" : "💪"}</div>
      <p class="res-ofensiva">${venceu ? frase : `Ofensiva: ${d.ofensiva}`}</p>
      <p class="res-melhor">Melhor ofensiva: ${d.melhorOfensiva}</p>
      <div class="res-painel">
        <div><span>Pontuação</span><b>${d.pontuacao}</b></div>
        <div><span>Precisão</span><b>${precisao}%  (${d.acertos}/${total})</b></div>
        <div><span>Combo máximo</span><b>x${d.maxCombo}</b></div>
      </div>
      ${d.moedasGanhas ? `<p class="res-coins">🪙 +${d.moedasGanhas} moedas</p>` : ""}
      <p class="res-aviso">${aviso}</p>
      ${d.novasConquistas && d.novasConquistas.length ? `<p class="res-conq">🏅 Nova conquista!  ${d.novasConquistas.map((c) => esc(c.icone + " " + c.nome)).join("   ")}</p>` : ""}
      ${htmlNovosPets(d)}
      <button class="ui-btn res-replay" type="button" data-acao="result-diario-replay">↻  Jogar de novo</button>
      <button class="ui-btn ui-voltar" type="button" data-acao="menu">🏠  Menu</button>`;
  }

  // ----- ponte com o Phaser: iniciar uma cena de gameplay -----
  function iniciarJogo(key, data) {
    api.fechar();
    const g = window.game;
    if (!g) return;
    g.scene.getScenes(true).forEach((s) => {
      if (s.scene.key !== "BootScene") g.scene.stop(s.scene.key);
    });
    g.scene.start(key, data || {});
  }

  // ----- builders por tela -----
  const BUILDERS = {
    menu: montarMenu,
    mundos: montarMundos,
    grade: montarGrade,
    perfis: montarPerfis,
    heroi: montarHeroi,
    ajustes: montarAjustes,
    conquistas: montarConquistas,
    progresso: montarProgresso,
    loja: montarLoja,
    resultado: montarResultado,
    confirma: montarConfirma,
    treino: montarTreino,
  };

  // ----- roteador de cliques -----
  function rotear(acao) {
    switch (acao) {
      case "menu": case "voltar": return api.abrir("menu");
      case "jogar": case "mundos": return api.abrir("mundos");
      case "grade": return api.abrir("grade");
      case "result-fases":
        // volta para a grade do mundo da fase que acabou de ser jogada
        mundoSel = mundoDaFase(getFase(dadosResultado.faseId));
        return api.abrir("grade");
      case "progresso": return api.abrir("progresso");
      case "conquistas": return api.abrir("conquistas");
      case "loja":
        lojaHeroiSel = Storage.getHeroiId(); lojaSel = null; return api.abrir("loja");
      case "loja-comprar": return comprarSelecionado();
      case "ajustes": return api.abrir("ajustes");
      case "exportar": return exportarProgresso();
      case "importar": {
        const inp = document.getElementById("importar-arquivo");
        if (inp) {
          inp.value = "";
          inp.click();
        }
        return;
      }
      case "heroi": return api.abrir("heroi");
      case "perfis":
        modoPerfil = "selecao"; removendoPerfil = false; return api.abrir("perfis");
      case "treino": return api.abrir("treino");
      case "treino-mix":
        return iniciarJogo("TrainScene", { tabuadas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], titulo: "Mix 1–10" });
      case "treino-fracas":
        return iniciarJogo("TrainScene", { tabuadas: treinoFracas, titulo: `Pontos fracos: ${treinoFracas.join(", ")}` });
      case "continuar": {
        // maior fase desbloqueada do ÚLTIMO mundo jogado (id string p/ s*/d*)
        const mundo = (getMundo(Storage.ultimoMundo()) || getMundo("tabuada")).id;
        const fase = fasesDoMundo(mundo)[Storage.faseMax(mundo) - 1] || fasesDoMundo(mundo)[0];
        return iniciarJogo("GameScene", { faseId: fase.id, heroId: Storage.getHeroiId() });
      }
      case "desafio":
        return iniciarJogo("GameScene", { diario: true, heroId: Storage.getHeroiId() });
      case "bossrush":
        return iniciarJogo("GameScene", { bossRush: true, heroId: Storage.getHeroiId() });
      case "novo-jogador":
        modoPerfil = "criacao"; novoHeroiId = novoHeroiId || 1; return montarPerfis();
      case "remover-toggle":
        removendoPerfil = !removendoPerfil; return montarPerfis();
      case "criar-perfil": return criarPerfil();
      case "perfis-voltar": return perfisVoltar();
      case "apagar-perfil": return apagarPerfil();
      case "cancelar-apagar":
        modoPerfil = "selecao"; return api.abrir("perfis");
      case "result-proxima": {
        const prox = proximaFase(dadosResultado.faseId); // seguinte no mesmo mundo
        if (!prox) return api.abrir("menu");
        return iniciarJogo("GameScene", { faseId: prox.id, heroId: dadosResultado.heroId });
      }
      case "result-replay":
        return iniciarJogo("GameScene", { faseId: dadosResultado.faseId, heroId: dadosResultado.heroId, bossRush: dadosResultado.bossRush });
      case "result-diario-replay":
        return iniciarJogo("GameScene", { diario: true, heroId: dadosResultado.heroId });
    }
  }

  const api = {
    /** mostra o overlay com a tela indicada (esconde as demais) */
    abrir(nome, dados) {
      const r = root();
      if (!r) return;
      if (nome === "resultado" && dados) dadosResultado = dados;
      r.querySelectorAll(".ui-screen").forEach((sec) => {
        sec.hidden = sec.id !== `screen-${nome}`;
      });
      if (BUILDERS[nome]) BUILDERS[nome]();
      r.hidden = false;
      const card = r.querySelector(`#screen-${nome} .ui-card`);
      if (card) card.scrollTop = 0;
      const input = r.querySelector(`#screen-${nome} input`);
      const primeiro = input || r.querySelector(`#screen-${nome} button`);
      if (primeiro) primeiro.focus({ preventScroll: true });
    },

    /** abre a grade de fases de um mundo (gameplay: pausa → Fases) */
    abrirGrade(mundoId) {
      if (mundoId && getMundo(mundoId)) mundoSel = mundoId;
      api.abrir("grade");
    },

    /** esconde o overlay (usado ao entrar no gameplay) */
    fechar() {
      const r = root();
      if (r) r.hidden = true;
    },

    /** ponto de entrada após o Boot: menu (com perfil) ou seleção/criação */
    irInicio() {
      modoPerfil = "selecao";
      api.abrir(Storage.temPerfilAtual() ? "menu" : "perfis");
    },

    /** liga o listener delegado de cliques do overlay */
    init() {
      const r = root();
      if (!r) return;

      // aviso quando o localStorage falhar ao salvar (cheio/bloqueado)
      let ultimoAviso = 0;
      Storage.onFalhaGravacao(() => {
        const agora = Date.now();
        if (agora - ultimoAviso < 30000) return; // no máx. 1 aviso a cada 30s
        ultimoAviso = agora;
        toast("⚠️ Não consegui salvar o progresso — exporte um backup em Ajustes!");
      });

      // seleção de arquivo do Importar (Ajustes)
      const inpImportar = document.getElementById("importar-arquivo");
      if (inpImportar) {
        inpImportar.addEventListener("change", () => {
          importarProgresso(inpImportar.files && inpImportar.files[0]);
        });
      }

      r.addEventListener("click", (ev) => {
        const alvo = ev.target.closest(
          "[data-cfg],[data-roupa],[data-efeito],[data-lojaheroi],[data-pet],[data-mundo],[data-fase],[data-treino],[data-heroi],[data-perfil],[data-novoheroi],[data-acao]"
        );
        if (!alvo || !r.contains(alvo)) return;
        AudioFX.unlock();
        if (alvo.dataset.cfg) return alternarAjuste(alvo.dataset.cfg);
        if (alvo.dataset.roupa) return escolherRoupa(alvo.dataset.roupa);
        if (alvo.dataset.pet) return escolherPet(alvo.dataset.pet);
        if (alvo.dataset.efeito) return escolherEfeito(alvo.dataset.efeito);
        if (alvo.dataset.lojaheroi) {
          lojaHeroiSel = +alvo.dataset.lojaheroi;
          lojaSel = null;
          return montarLoja();
        }
        if (alvo.dataset.mundo) {
          mundoSel = alvo.dataset.mundo;
          return api.abrir("grade");
        }
        // id de fase pode ser number (Tabuada) ou string ("s1"...) — não coagir
        // com +; getFase compara por String.
        if (alvo.dataset.fase)
          return iniciarJogo("GameScene", { faseId: alvo.dataset.fase, heroId: Storage.getHeroiId() });
        if (alvo.dataset.treino) {
          const n = +alvo.dataset.treino;
          return iniciarJogo("TrainScene", { tabuadas: [n], titulo: `Tabuada do ${n}` });
        }
        if (alvo.dataset.heroi) {
          AudioFX.acerto();
          Storage.setHeroi(+alvo.dataset.heroi);
          return api.abrir("menu");
        }
        // id de perfil é string ("p..."); NÃO coagir com + (viraria NaN).
        if (alvo.dataset.perfil) return tocarPerfil(alvo.dataset.perfil);
        if (alvo.dataset.novoheroi) {
          AudioFX.acerto();
          novoHeroiId = +alvo.dataset.novoheroi;
          return marcarHeroPick();
        }
        if (alvo.dataset.acao) return rotear(alvo.dataset.acao);
      });
    },
  };

  return api;
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => UIScreens.init());
} else {
  UIScreens.init();
}
