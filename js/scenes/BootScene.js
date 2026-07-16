/**
 * BootScene — gera as texturas via canvas/Graphics (sem assets externos):
 * fundo em gradiente, partícula de brilho e raio (projétil do ataque).
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Figuras dos heróis (SVG ilustrado — DiceBear/Avataaars).
    HEROIS.forEach((h) => {
      this.load.svg(h.img, `assets/herois/${h.file || h.id}.svg`, {
        width: 256,
        height: 256,
      });
    });
    // Roupas extras (loja) — cada uma como uma textura própria.
    if (typeof ROUPAS !== "undefined") {
      Object.values(ROUPAS).forEach((lista) => {
        lista.forEach((r) => {
          if (r.preco > 0) {
            this.load.svg(r.id, `assets/herois/${r.file}.svg`, {
              width: 256,
              height: 256,
            });
          }
        });
      });
    }
    // Pets companheiros (SVG flat; fallback: emoji do pet).
    if (typeof PETS !== "undefined") {
      PETS.forEach((p) => {
        this.load.svg(p.img, `assets/pets/pet-${p.id}.svg`, { width: 128, height: 128 });
      });
    }
    // Inimigos e chefões (SVG flat, mesmo estilo dos heróis).
    // Se um arquivo faltar, a cena usa o emoji da fase como fallback.
    FASES.forEach((f) => {
      this.load.svg(`inimigo${f.id}`, `assets/inimigos/inimigo-${f.id}.svg`, {
        width: 256,
        height: 256,
      });
      this.load.svg(`boss${f.id}`, `assets/inimigos/boss-${f.id}.svg`, {
        width: 256,
        height: 256,
      });
    });
  }

  create() {
    this.gerarFundo();
    this.gerarBrilho();
    this.gerarRaio();
    this.gerarEfeitos();
    // Navegação é HTML (overlay): abre o menu (ou a criação de perfil).
    // A BootScene fica como cena "host" ociosa por baixo do overlay; o gameplay
    // (GameScene/TrainScene) é iniciado sob demanda pelo UIScreens.
    UIScreens.irInicio();
  }

  /** Fundo vertical gradiente neon roxo->preto->rosa com estrelas estáticas. */
  gerarFundo() {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const tex = this.textures.createCanvas("bg", w, h);
    const ctx = tex.getContext();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1a0b3a");
    grad.addColorStop(0.5, "#0d0d12");
    grad.addColorStop(1, "#2a0a22");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // brilhos radiais kpop (cantos)
    this.radial(ctx, w * 0.15, h * 0.08, 360, "rgba(123,47,247,0.5)");
    this.radial(ctx, w * 0.85, h * 0.95, 380, "rgba(255,62,165,0.45)");

    // estrelinhas
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.8 + 0.4;
      ctx.globalAlpha = Math.random() * 0.7 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tex.refresh();
  }

  radial(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  /** Partícula de brilho (glow radial branco). */
  gerarBrilho() {
    const s = 64;
    const tex = this.textures.createCanvas("brilho", s, s);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,210,62,0.8)");
    g.addColorStop(1, "rgba(255,62,165,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    tex.refresh();
  }

  /** Raio — projétil do golpe da heroína (GameScene.animarAtaque). */
  gerarRaio() {
    const w = 40;
    const h = 64;
    const tex = this.textures.createCanvas("raio", w, h);
    const ctx = tex.getContext();
    ctx.beginPath();
    ctx.moveTo(24, 2);
    ctx.lineTo(8, 36);
    ctx.lineTo(20, 36);
    ctx.lineTo(14, 62);
    ctx.lineTo(34, 24);
    ctx.lineTo(22, 24);
    ctx.closePath();
    ctx.fillStyle = "#2ff7e6";
    ctx.shadowColor = "#2ff7e6";
    ctx.shadowBlur = 10;
    ctx.fill();
    tex.refresh();
  }

  /**
   * Projéteis alternativos do golpe (efeitos de ataque da loja — EFEITOS).
   * Mesmo formato do raio: canvas pequeno com glow, sem asset externo.
   */
  gerarEfeitos() {
    // 💗 coração
    this.desenharEfeito("fx-coracao", "#ff3ea5", (ctx) => {
      ctx.beginPath();
      ctx.moveTo(24, 20);
      ctx.bezierCurveTo(24, 12, 12, 8, 8, 18);
      ctx.bezierCurveTo(4, 28, 14, 38, 24, 46);
      ctx.bezierCurveTo(34, 38, 44, 28, 40, 18);
      ctx.bezierCurveTo(36, 8, 24, 12, 24, 20);
      ctx.closePath();
    });
    // 🌟 estrela de 5 pontas
    this.desenharEfeito("fx-estrela", "#ffd23e", (ctx) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 22 : 9;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = 24 + r * Math.cos(a);
        const y = 26 + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    });
    // 🎵 nota musical (haste + bandeira + cabeça)
    this.desenharEfeito("fx-nota", "#b06cff", (ctx) => {
      ctx.beginPath();
      ctx.ellipse(17, 42, 9, 6.5, -0.35, 0, Math.PI * 2);
      ctx.moveTo(25, 42);
      ctx.lineTo(25, 8);
      ctx.lineTo(29, 8);
      ctx.lineTo(29, 42);
      ctx.closePath();
      ctx.moveTo(25, 8);
      ctx.quadraticCurveTo(40, 12, 38, 26);
      ctx.quadraticCurveTo(34, 18, 25, 17);
      ctx.closePath();
    });
  }

  desenharEfeito(chave, cor, tracar) {
    const s = 52;
    const tex = this.textures.createCanvas(chave, s, s);
    const ctx = tex.getContext();
    tracar(ctx);
    ctx.fillStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 10;
    ctx.fill();
    tex.refresh();
  }
}
