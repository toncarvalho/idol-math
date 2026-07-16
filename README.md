# Idol Math ⚡ — Tabuada Kpop com toque de Heavy Metal 🤘

Jogo em JavaScript (Phaser 3) para **celular** que ensina a **tabuada** (multiplicação)
de um jeito divertido. Estética **kpop neon** voltada para meninas, com um **toque de metal**:
raios, palco em chamas e **chefões** ao final de cada fase.

Você é uma **idol de palco**: inimigos avançam trazendo contas de multiplicação. Toque na
resposta certa para atacar, encadeie **combos**, não perca suas **vidas** ❤️ e derrote o
**chefão** para passar de fase!

## ✨ Características

- 📱 **Mobile-first**: feito para toque, instalável como app (PWA), orientação retrato.
- 👥 **Perfis locais de jogador** (sem servidor): vários jogadores (irmãs, colegas) no mesmo
  aparelho escolhem "quem vai jogar" — cada perfil tem **nome + avatar** e **progresso/estrelas/
  recorde próprios**, tudo no `localStorage`. Não é login/senha — é um seletor de jogador.
- 🦸 **5 personagens** como avatar — 4 heroínas (Rubi, Lorena, Mel e Priya) e 1 herói (Léo) —
  cosméticos (figura + cor + nome); o personagem acompanha você pelas fases e pode ser trocado a
  qualquer momento. Figuras ilustradas geradas com **DiceBear (estilo Avataaars)**.
- 🗺️ **12 fases** em progressão por tabuada: 1–2 → 1–3 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10,
  e as **duas últimas misturam todas** (1–10). A dificuldade vem da tabuada da fase.
- 🔓 Cada fase **desbloqueia a próxima** ao ser vencida (progresso salvo).
- 👑 **Chefões** temáticos com barra de HP no fim de cada fase — e, da fase 3 em diante,
  cada um tem uma **mecânica especial**: ⏱️ Apressado (menos tempo por pergunta),
  🌀 Trapaceiro (embaralha as respostas), 🛡️ Blindado (só acertos seguidos causam dano)
  ou 💖 Curandeiro (se cura quando você erra).
- ⚡ **Power-ups por combo**: combo x4 dá um 🛡️ **escudo** (bloqueia a perda de 1 vida)
  e combo x8 dá um ⚡ **golpe duplo** (próximo acerto vale 2).
- 🔥 Combos, pontuação, vidas e **recorde salvo** no aparelho (localStorage).
- ⭐ **Estrelas por fase** (1–3) e relatório de fim de fase (precisão + fatos a treinar).
- 🧠 **Repetição inteligente**: as contas que você mais erra aparecem com mais frequência.
- 📊 **Painel de progresso** (pais/professor): precisão, tempo de jogo, estrelas e um **mapa de
  calor das tabuadas** (verde = dominada, vermelho = treinar mais), com atalho para treinar os
  pontos fracos.
- 🔢 **Visualização no erro**: ao errar, mostra a conta como **grade de pontos** (a×b) reforçando
  o conceito de multiplicação, não só a memória.
- 📚 **Modo Treino**: pratique uma tabuada (ou Mix) sem tempo e sem perder vida.
- 💀 **Boss Rush**: enfrente os 12 chefões em sequência (desbloqueia ao zerar a última fase).
- 🗓️ **Desafio do Dia + ofensiva**: um desafio rápido (mix de tabuadas) por dia; jogar dias
  seguidos acumula uma **ofensiva (🔥 streak)** e rende moedas-bônus crescentes.
- 🐾 **Pets companheiros**: cada conquista (combo x10, show perfeito, imperatriz…) rende
  **moedas** e **adota um pet** com um poder automático que ajuda no palco — congelar o
  tempo (🐢), segurar o combo (🐰), vida extra (🦁), reviver (🦄), dica 50/50 (🦜)…
  Equipe 1 por vez na tela **🐾 Pets**; ele acompanha a heroína durante a partida.
- 🪙 **Moedas & 🛍️ Loja**: ganhe moedas jogando e desbloqueie **roupas** para os personagens
  (cada roupa troca a figura; a equipada aparece no HUD e no menu) e **efeitos de ataque**
  (o projétil do golpe: raio, coração, estrela, nota). A loja tem abas de personagem,
  preview antes de comprar (compra em 2 toques) e roupas-troféu **Douradas** que além
  de moedas exigem um feito do jogo (36 ⭐, Boss Rush, ofensiva de 7 dias…).
- 💾 **Backup do progresso**: exporte/importe todos os jogadores num arquivo JSON
  (em **Ajustes**) — útil para trocar de aparelho ou se o navegador limpar os dados.
- ⏸️ **Pausa**, **dica no erro** (mostra a conta certa) e **transições suaves**.
- 🎵 Música de fundo + efeitos (Web Audio, sem arquivos), **vibração** e **leitura em voz alta** —
  tudo ligável/desligável em **Ajustes**.
- 🚀 **Sem build, sem npm**: só HTML + JS, com **service worker** (funciona offline). Phaser
  vendorizado localmente.

## ▶️ Como rodar

Por usar `localStorage` e `fetch` do `manifest.json`, abra via um servidor local
(não pelo `file://`):

```bash
# na raiz do projeto
python3 -m http.server 8000
# depois abra no navegador:
#   http://localhost:8000
```

No celular, abra o mesmo endereço na mesma rede, ou hospede no **GitHub Pages**
(Settings → Pages → branch). Para "instalar", use *Adicionar à tela inicial*.

## 🎮 Como jogar

1. Na primeira vez, **crie seu jogador** (nome + personagem). Depois é só escolher seu perfil na
   tela "Quem vai jogar?" — use **🔄 Trocar** no menu para alternar entre jogadores.
2. No menu, toque em **JOGAR** (ou **Continuar** para ir à última fase desbloqueada).
3. Selecione uma **fase** na grade (as próximas desbloqueiam ao vencer a anterior).
4. Responda as contas tocando na alternativa certa. Acerto = ataque + combo;
   erro ou tempo esgotado = perde uma vida.
5. Derrote todos os inimigos para enfrentar o **chefão** e vencer a fase!

## 🛠️ Estrutura do projeto

```
index.html            # ponto de entrada: telas HTML (overlay) + scripts + registro do SW
manifest.json         # configuração PWA
sw.js                 # service worker (offline / cache do app shell)
css/style.css         # fundo/glow e centralização do canvas
css/ui.css            # estilos das telas HTML (menu, fases, loja…)
js/main.js            # configuração do Phaser (Scale.FIT, retrato)
js/data/fases.js      # ⭐ FASES + config global JOGO (mecânica, pontos, moedas)
js/data/herois.js     # 🦸 HEROIS (figura + cor + nome) — cosméticos
js/data/roupas.js     # 🛍️ roupas da loja (por herói; Douradas têm `requisito`)
js/data/efeitos.js    # ✨ efeitos de ataque da loja (projétil do golpe)
js/data/conquistas.js # 🏅 conquistas (condição + recompensa)
js/data/pets.js       # 🐾 pets companheiros (1 por conquista; poder automático)
assets/herois/*.svg   # figuras dos personagens (DiceBear / Avataaars)
assets/inimigos/*.svg # figuras dos inimigos e chefões (flat neon; fallback: emoji)
assets/pets/*.svg     # figuras dos pets (flat neon; fallback: emoji)
tools/gerar-inimigos.mjs # gerador das figuras dos inimigos (node tools/gerar-inimigos.mjs)
tools/gerar-roupas.mjs   # gerador das roupas tiers 180/300 (node tools/gerar-roupas.mjs)
tools/gerar-pets.mjs     # gerador das figuras dos pets (node tools/gerar-pets.mjs)
js/core/MathEngine.js # geração de perguntas e alternativas (puro, testável)
js/core/Regras.js     # fórmulas de pontos/estrelas/moedas (puro, testável)
js/core/Audio.js      # música + efeitos sonoros (Web Audio)
js/core/Storage.js    # perfis locais + progresso/recorde/estrelas (localStorage)
js/core/UI.js         # textos/botões neon no canvas (Phaser)
js/core/Util.js       # vibração, voz, flashcard de multiplicação, cores
js/scenes/*.js        # Boot (texturas), Game e Train — só o gameplay é Phaser
js/ui/screens.js      # telas HTML: menu, perfis, fases, ajustes, loja, resultado…
js/ui/gameui.js       # botões de resposta + pausa (HTML sobre o canvas)
tests/*.mjs           # testes (npm test, ou node tests/<arquivo>.test.mjs)
assets/icon.svg       # ícone do app
```

## ➕ Como adicionar / ajustar fases

Tudo é orientado a dados em **`js/data/fases.js`**. O jogo é organizado em
**mundos** (array `MUNDOS`: Soma & Subtração, Tabuada, Divisão), e cada fase
pertence a um mundo. A **dificuldade vem do conteúdo da fase** (na Tabuada,
`tabuadas`). A mecânica (velocidade, intervalo do fator, força do chefão)
é **constante** e fica na config global `JOGO` — só o conteúdo muda entre fases.

Para uma nova fase, acrescente um objeto ao array `FASES`:

```js
{
  id: 13,                   // Tabuada usa ids 1–12 (NUNCA renumerar — o save
                            // guarda estrelas por id); mundos novos usam ids
                            // string próprios ("s1", "d1"…)
  mundo: "tabuada",         // MUNDOS.id (fases sem o campo são da "tabuada")
  nome: "Nome da Fase",
  descricao: "Uma frase de atmosfera.",
  tabuadas: [3, 6, 9],      // foco da fase (quais tabuadas treinar)
  corTema: 0x2ff7e6,        // cor do tema (hex)
  inimigoEmoji: "👾",
  // mecanica é opcional: "tempoCurto" | "embaralha" | "blindado" | "curandeiro"
  // (catálogo MECANICAS_CHEFAO no mesmo arquivo; números em JOGO.mecanicas)
  boss: { nome: "Nome do Chefão", emoji: "🐉", frase: "Provocação!", mecanica: "embaralha" },
}
```

A fase aparece automaticamente na grade do seu mundo e na progressão (a ordem
no array `FASES` é a ordem de jogo dentro do mundo). Para mexer na mecânica de
todas as fases (timer, intervalo do segundo fator, nº de inimigos, HP do chefão),
edite a config `JOGO` no topo do mesmo arquivo:

```js
const JOGO = { faixaFator: { min: 1, max: 10 }, tempoResposta: 10, numInimigos: 6, bossHp: 8 };
// tempoResposta: null  → sem timer
```

## 🙏 Créditos

- **[Phaser 3](https://phaser.io/)** — motor do jogo (vendorizado em `vendor/`).
- Figuras dos personagens (Rubi, Lorena, Mel, Léo e Priya) geradas com
  **[DiceBear](https://www.dicebear.com/)**, estilo
  **[Avataaars](https://www.dicebear.com/styles/avataaars/)** (por Pablo Stanley) — uso livre,
  inclusive comercial. Geradas no momento do desenvolvimento e embutidas como SVG; o jogo não
  depende do DiceBear em runtime.

---

Feito com Phaser 3. Divirta-se e mande ver na tabuada! ⚡🎤
