/**
 * AudioFX — efeitos sonoros + música de fundo via Web Audio API.
 * Efeitos: síntese direta (power chords, blips) — sem assets.
 * Música: trilhas MP3 em loop (assets/musica/, ver docs/MUSICAS.md) por
 * contexto (menu/jogo/chefão); se o arquivo não carregar ou não decodificar,
 * cai no sequenciador synth original (baixo + arpejo) como fallback.
 * Respeita as configurações (efeitos/música).
 */
const AudioFX = (() => {
  let ctx = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicGain = null;

  // ---- trilhas MP3 ----
  const MUSICAS = {
    menu: "assets/musica/menu.mp3",
    jogo: "assets/musica/jogo.mp3",
    chefao: "assets/musica/chefao.mp3",
  };
  const VOL_MUSICA = 0.3; // MP3 masterizado; synth usa 0.05 (osciladores crus)
  const buffers = {}; // nome -> { buffer, loopIni, loopFim } | "erro"
  let trilhaAtual = "menu"; // última trilha pedida (mantida entre parar/voltar)
  let musicaPedida = false; // iniciarMusica sem pararMusica correspondente
  let fonteMp3 = null; // AudioBufferSourceNode em loop
  let geracaoMusica = 0; // invalida carregamentos async após parar/trocar

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tom(freq, dur, tipo = "square", vol = 0.18, delay = 0, dest = null) {
    const ac = ensureCtx();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest || ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // som de efeito — só toca se "efeitos" estiver ligado
  function sfx(fn) {
    if (!Storage.getConfig().efeitos) return;
    fn();
  }

  // ---- Música de fundo: fallback synth (sequenciador simples) ----
  const BASS = [110, 0, 165, 0, 131, 0, 196, 0, 110, 0, 165, 0, 147, 0, 196, 220];
  const LEAD = [0, 440, 0, 523, 0, 392, 0, 659, 0, 440, 0, 523, 0, 587, 0, 0];

  function tocarStep() {
    const ac = ensureCtx();
    if (!ac || !musicGain) return;
    const i = musicStep % BASS.length;
    const b = BASS[i];
    if (b) tom(b, 0.22, "sawtooth", 0.5, 0, musicGain);
    const l = LEAD[i];
    if (l) tom(l, 0.16, "triangle", 0.3, 0, musicGain);
    musicStep++;
  }

  function iniciarSynth() {
    if (!musicGain) return;
    musicGain.gain.value = 0.05; // baixinho, ambiente
    musicStep = 0;
    musicTimer = setInterval(tocarStep, 230); // ~130 BPM em colcheias
  }

  // ---- Música de fundo: trilhas MP3 ----
  // MP3 decodificado ganha silêncio do encoder nas pontas; sem aparar, o loop
  // "engasga". Acha o primeiro/último sample audível para loopStart/loopEnd.
  function pontosDeLoop(buffer) {
    const d = buffer.getChannelData(0);
    const limiar = 0.001;
    let ini = 0;
    let fim = d.length - 1;
    while (ini < fim && Math.abs(d[ini]) < limiar) ini++;
    while (fim > ini && Math.abs(d[fim]) < limiar) fim--;
    return { ini: ini / buffer.sampleRate, fim: (fim + 1) / buffer.sampleRate };
  }

  function carregarTrilha(nome) {
    const pronto = buffers[nome];
    // pode ser a trilha, "erro", ou a Promise de um carregamento em andamento
    // (Promise.resolve achata); evita fetch duplicado em troca rápida de trilha
    if (pronto) return Promise.resolve(pronto === "erro" ? null : pronto);
    const ac = ensureCtx();
    const url = MUSICAS[nome];
    if (!ac || !url) return Promise.resolve(null);
    buffers[nome] = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.arrayBuffer();
      })
      // forma com callbacks: Safari antigo não retorna Promise
      .then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
      .then((buffer) => {
        const p = pontosDeLoop(buffer);
        buffers[nome] = { buffer, loopIni: p.ini, loopFim: p.fim };
        return buffers[nome];
      })
      .catch(() => {
        buffers[nome] = "erro"; // não tenta de novo nesta sessão
        return null;
      });
    return buffers[nome];
  }

  function tocarTrilha(trilha) {
    const ac = ensureCtx();
    if (!ac || !musicGain) return;
    const src = ac.createBufferSource();
    src.buffer = trilha.buffer;
    src.loop = true;
    src.loopStart = trilha.loopIni;
    src.loopEnd = trilha.loopFim;
    src.connect(musicGain);
    const t0 = ac.currentTime;
    musicGain.gain.setValueAtTime(0.0001, t0);
    musicGain.gain.exponentialRampToValueAtTime(VOL_MUSICA, t0 + 0.8);
    src.start(t0, trilha.loopIni);
    fonteMp3 = src;
  }

  function pararTudo() {
    geracaoMusica++; // descarta qualquer carregamento em andamento
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    if (fonteMp3) {
      try {
        fonteMp3.stop();
      } catch (e) {}
      try {
        fonteMp3.disconnect();
      } catch (e) {}
      fonteMp3 = null;
    }
    if (musicGain) {
      try {
        musicGain.disconnect();
      } catch (e) {}
      musicGain = null;
    }
  }

  return {
    /** desbloqueia o contexto de áudio num gesto de toque */
    unlock() {
      ensureCtx();
    },

    // ----- efeitos -----
    acerto() {
      sfx(() => {
        tom(660, 0.08, "square", 0.16);
        tom(990, 0.12, "square", 0.16, 0.06);
      });
    },
    erro() {
      sfx(() => {
        tom(180, 0.22, "sawtooth", 0.2);
        tom(120, 0.28, "sawtooth", 0.18, 0.02);
      });
    },
    golpe() {
      sfx(() => {
        tom(110, 0.18, "sawtooth", 0.22);
        tom(165, 0.18, "sawtooth", 0.18);
        tom(220, 0.18, "square", 0.12);
      });
    },
    combo() {
      sfx(() => {
        tom(880, 0.06, "triangle", 0.14);
        tom(1175, 0.06, "triangle", 0.14, 0.05);
        tom(1568, 0.1, "triangle", 0.14, 0.1);
      });
    },
    vitoria() {
      sfx(() =>
        [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.2, "square", 0.16, i * 0.12))
      );
    },
    derrota() {
      sfx(() =>
        [392, 330, 262, 196].forEach((f, i) => tom(f, 0.25, "sawtooth", 0.18, i * 0.14))
      );
    },

    // ----- música de fundo -----
    /**
     * Toca a trilha pedida ("menu" | "jogo" | "chefao") em loop; sem argumento,
     * retoma a última trilha. MP3 com fallback no synth.
     */
    iniciarMusica(nome) {
      const trilha = MUSICAS[nome] ? nome : trilhaAtual;
      if (musicaPedida && trilha === trilhaAtual) return; // já está tocando
      if (!Storage.getConfig().musica) return;
      pararTudo();
      const ac = ensureCtx();
      if (!ac) return;
      trilhaAtual = trilha;
      musicaPedida = true;
      musicGain = ac.createGain();
      musicGain.gain.value = VOL_MUSICA;
      musicGain.connect(ac.destination);
      const g = geracaoMusica;
      carregarTrilha(trilha).then((buf) => {
        if (g !== geracaoMusica) return; // música parou/trocou enquanto carregava
        if (buf) tocarTrilha(buf);
        else iniciarSynth();
      });
    },
    pararMusica() {
      musicaPedida = false;
      pararTudo();
    },
    /** liga/desliga a música conforme a configuração atual (e troca a trilha) */
    sincronizarMusica(nome) {
      if (Storage.getConfig().musica) this.iniciarMusica(nome);
      else this.pararMusica();
    },
    musicaTocando() {
      return musicaPedida;
    },
    /** estado da música (usado pela verificação E2E) */
    musicaInfo() {
      return {
        trilha: trilhaAtual,
        tocando: musicaPedida,
        fonte: fonteMp3 ? "mp3" : musicTimer ? "synth" : null,
      };
    },
  };
})();

// Aba/app em segundo plano: para a música (gasta bateria; e o setInterval do
// synth é estrangulado pelo navegador, ficando irregular); retoma ao voltar.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    AudioFX._musicaAntesDeOcultar = AudioFX.musicaTocando();
    AudioFX.pararMusica();
  } else if (AudioFX._musicaAntesDeOcultar) {
    AudioFX._musicaAntesDeOcultar = false;
    AudioFX.iniciarMusica();
  }
});
