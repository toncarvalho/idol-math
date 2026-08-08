# Ponto de partida — Demo Web (Fase 1)

> **Objetivo:** a versão web vira **demo jogável** (canal de aquisição); o app
> empacotado (Capacitor) roda o jogo completo. Decisão de produto (ago/2026):
> **as 2 primeiras fases de cada mundo são grátis** — 6 fases jogáveis de 36.
>
> Este documento é o ponto de partida da implementação: onde cada trava entra,
> com arquivo e linha do código atual (`master`, commit `fab9d95`).

---

## 1. O que é grátis e o que é premium

| Conteúdo | Demo web | App pago |
|---|---|---|
| 🌟 Soma & Subtração — fases `s1`, `s2` | ✅ | ✅ |
| 🎤 Tabuada — fases `1`, `2` | ✅ | ✅ |
| ⚡ Divisão — fases `d1`, `d2` | ✅ | ✅ |
| Demais 30 fases (3–12 de cada mundo) | 💎 | ✅ |
| 📚 Treino (livre, sem timer) | ✅ | ✅ |
| 📊 Progresso (painel dos pais) | ✅ | ✅ |
| 🐾 Pets / conquistas | ✅ | ✅ |
| 🗓️ Desafio do Dia | 💎 | ✅ |
| 💀 Boss Rush | 💎 | ✅ |
| 🛍️ Loja de roupas | 💎 | ✅ |
| Perfis, backup, ajustes | ✅ | ✅ |

**Racional das escolhas:**

- **Treino e Progresso ficam grátis de propósito.** São o argumento para o
  adulto que instala (pedagogia real + painel de acompanhamento); travar isso
  esconde justamente o que convence a comprar.
- **Desafio do Dia e Boss Rush são premium** porque são o loop de retenção — o
  motivo de voltar todo dia. Boss Rush, aliás, já é inalcançável na demo
  (exige zerar a fase 12 da Tabuada).
- **A loja é premium, mas as moedas continuam sendo ganhas e salvas.** A tela
  de bloqueio precisa dizer isso com todas as letras: *"suas moedas ficam
  guardadas — a loja abre na versão completa"*. Sem isso vira promessa
  quebrada, que é exatamente o que não queremos num app infantil.
- **Nada de contagem regressiva, "última chance" ou botão de compra disfarçado
  de botão de jogar.** O gate é informativo e tem sempre um caminho de volta.

---

## 2. Princípio da arquitetura: travar a **entrada**, nunca o **save**

`Storage.desbloquearFase()` (`js/core/Storage.js:259`) continua rodando
normalmente ao vencer uma fase. A demo **não** mexe no formato do save.

Consequência prática (e argumento de venda): a criança joga a fase 2, o
progresso da fase 3 é gravado, e quando a família compra o app o backup
exportado (`Ajustes → Exportar`) restaura tudo. Nenhuma migração, nenhum risco
para as *Regras de segurança do save* documentadas em `js/data/fases.js:11`.

---

## 3. Novo módulo: `js/core/Demo.js`

Toda a camada comercial num arquivo só — inclusive a config. É o **único
arquivo que o empacote Capacitor precisa considerar**, o que elimina o risco de
publicar o app com meia-trava ligada.

```js
/**
 * Demo — regras da versão de demonstração (web).
 *
 * A web é a demo (aquisição); o app empacotado roda o jogo completo. Este
 * módulo concentra QUAL conteúdo é grátis e responde às perguntas que a UI faz
 * ("posso entrar nesta fase?", "a loja está liberada?"). É puro: só depende de
 * indiceFase/getFase (js/data/fases.js) — o resto da UI só consulta.
 *
 * A trava é de ENTRADA, nunca de persistência: o progresso continua sendo
 * gravado normalmente, para que o backup exportado na demo restaure no app.
 */
const Demo = (() => {
  const CFG = {
    ativo: true,           // ← única linha que o build do app altera (false)
    fasesPorMundo: 2,      // fases grátis no começo de cada mundo
    bloqueios: ["bossrush", "desafio", "loja"],
    lojas: {
      android: null,       // URL da Play Store quando o app estiver no ar
      ios: null,           // idem App Store
    },
  };

  /** Rodando dentro do app empacotado? (Capacitor injeta window.Capacitor) */
  function noApp() {
    return typeof window !== "undefined" && !!window.Capacitor;
  }

  /** A demo está valendo agora? (cinto e suspensório: flag + detecção) */
  function ativo() {
    return CFG.ativo && !noApp();
  }

  /** Esta fase pode ser jogada? (fora da demo, sempre) */
  function faseLiberada(faseId) {
    if (!ativo()) return true;
    return indiceFase(faseId) <= CFG.fasesPorMundo;
  }

  /** Recurso liberado? chave: "bossrush" | "desafio" | "loja" */
  function recursoLiberado(chave) {
    if (!ativo()) return true;
    return !CFG.bloqueios.includes(chave);
  }

  /** Nº de fases grátis por mundo (rótulo "2 fases grátis" na seleção). */
  function fasesGratis() {
    return CFG.fasesPorMundo;
  }

  /** Links de loja já publicados ({} enquanto o app não está no ar). */
  function lojas() {
    return CFG.lojas;
  }

  return { ativo, faseLiberada, recursoLiberado, fasesGratis, lojas };
})();
```

**Ordem de carga** (`index.html`, bloco Core): depende de `indiceFase`
(`js/data/fases.js`) e de mais nada. Entra depois de `Regras.js` e antes de
`Storage.js`:

```html
  <script defer src="js/core/Regras.js"></script>
  <script defer src="js/core/Demo.js"></script>   <!-- novo -->
  <script defer src="js/core/Storage.js"></script>
```

---

## 4. Onde cada trava entra (mapa do código)

Seis pontos de entrada. Os quatro primeiros são os que a criança encontra; os
dois últimos são defesa em profundidade (progresso importado de um backup do
app cairia neles).

### 4.1 Grade de fases — `screens.js:526` (`montarGrade`)

O tile bloqueado por progresso (🔒) continua como está. O tile **liberado por
progresso mas fora da demo** vira um botão 💎 clicável, mostrando o foco da
fase como teaser:

```js
      const num = i + 1;
      const desbloqueada = num <= faseMax;
      if (!desbloqueada) {
        return `<div class="fase-tile bloq">…</div>`;   // como hoje
      }
      if (!Demo.faseLiberada(f.id)) {
        return `
          <button class="fase-tile premium" type="button" data-premium="fase"
                  style="--cor:${corHex(f.corTema)}">
            <span class="ft-num">${num}</span>
            <span class="ft-lock">💎</span>
            <span class="ft-foco">${rotuloFoco(f)}</span>
          </button>`;
      }
```

A ordem importa: quem venceu a fase 2 vê a **3 com 💎** (a próxima, concreta) e
as demais com 🔒. É a leitura mais honesta do que falta.

### 4.2 Clique em fase — `screens.js:959` (listener delegado)

```js
        if (alvo.dataset.premium) return api.abrir("premium");
        if (alvo.dataset.fase) {
          if (!Demo.faseLiberada(alvo.dataset.fase)) return api.abrir("premium");
          return iniciarJogo("GameScene", { faseId: alvo.dataset.fase, heroId: Storage.getHeroiId() });
        }
```

### 4.3 Tela de resultado — `screens.js:752` (`montarResultado`)

Ao vencer a fase 2, o botão **"▶ Próxima Fase"** iniciaria a 3 direto, pulando
a grade. Troca condicional:

```js
      ${venceu && d.temProxima
        ? (Demo.faseLiberada(proximaFase(d.faseId).id)
            ? '<button class="ui-btn res-prox" type="button" data-acao="result-proxima">▶  Próxima Fase</button>'
            : '<button class="ui-btn res-prox premium" type="button" data-acao="premium">💎  Próxima fase no app completo</button>')
        : `<button class="ui-btn res-replay" …>`}
```

Este é o momento de maior conversão da demo — a criança acabou de vencer e quer
a próxima. Vale caprichar no texto da tela premium que abre daqui.

### 4.4 Menu e roteador — `screens.js:817` (`rotear`)

```js
      case "loja":
        if (!Demo.recursoLiberado("loja")) return api.abrir("premium");
        lojaHeroiSel = Storage.getHeroiId(); lojaSel = null; return api.abrir("loja");

      case "desafio":
        if (!Demo.recursoLiberado("desafio")) return api.abrir("premium");
        return iniciarJogo("GameScene", { diario: true, heroId: Storage.getHeroiId() });

      case "bossrush":
        if (!Demo.recursoLiberado("bossrush")) return api.abrir("premium");
        return iniciarJogo("GameScene", { bossRush: true, heroId: Storage.getHeroiId() });

      case "premium": return api.abrir("premium");   // novo
```

Em `montarMenu` (`screens.js:466-468`), acrescentar 💎 ao rótulo dos botões
travados — a criança vê antes de tocar, não depois:

```js
      const gemDesafio = Demo.recursoLiberado("desafio") ? "" : " 💎";
      const gemLoja = Demo.recursoLiberado("loja") ? "" : " 💎";
```

### 4.5 "Continuar" — `screens.js:849`

Retoma `faseMax` do último mundo, que pode ser a fase 3 (já desbloqueada no
save). Na demo, limitar à última fase grátis:

```js
      case "continuar": {
        const mundo = (getMundo(Storage.ultimoMundo()) || getMundo("tabuada")).id;
        const lista = fasesDoMundo(mundo);
        let idx = Storage.faseMax(mundo);
        if (Demo.ativo()) idx = Math.min(idx, Demo.fasesGratis());
        const fase = lista[idx - 1] || lista[0];
        return iniciarJogo("GameScene", { faseId: fase.id, heroId: Storage.getHeroiId() });
      }
```

O rótulo do botão no menu (`screens.js:459`) usa o mesmo `faseMax` — aplicar o
mesmo `Math.min` para não anunciar "Fase 3" e abrir a 2.

### 4.6 Seleção de mundos — `screens.js:494` (`montarMundos`)

Sinalizar a regra logo na entrada, antes de qualquer investimento de tempo:

```js
      const gratis = Demo.ativo()
        ? `<small class="mundo-demo">🎁 ${Demo.fasesGratis()} fases grátis</small>` : "";
```

---

## 5. Nova tela: `screen-premium`

### 5.1 `index.html` (junto das outras `.ui-screen`)

```html
    <section class="ui-screen" id="screen-premium" hidden>
      <div class="ui-card">
        <h1 class="ui-title" style="color:#ffd23e">💎 VERSÃO COMPLETA</h1>
        <p class="ui-sub" id="premium-sub"></p>
        <div id="premium-corpo"></div>
        <button class="ui-btn ui-voltar" type="button" data-acao="voltar">↩  Menu</button>
      </div>
    </section>
```

### 5.2 Builder `montarPremium()` (registrar em `BUILDERS`, `screens.js:801`)

Conteúdo, na ordem:

1. **O que tem lá:** "36 fases nos 3 mundos · Desafio do Dia · Boss Rush · Loja
   de roupas" — montado a partir de `FASES.length` e `MUNDOS.length`, não
   hardcoded.
2. **A promessa que já vale hoje:** "Sem anúncios · Sem compras dentro do jogo ·
   Funciona sem internet · Nada sai do aparelho".
3. **Moedas guardadas:** `🪙 Você já tem N moedas guardadas para a loja`
   (`Storage.getMoedas()`), quando N > 0.
4. **Botões de loja** a partir de `Demo.lojas()`. Enquanto as URLs forem `null`
   (pré-lançamento): `🚧 Em breve na Google Play` — texto, não botão morto.
5. **Backup:** "Já joguei bastante — como levo meu progresso?" → atalho para
   `data-acao="exportar"`, que já existe (`screens.js:832`). Reduz o medo de
   perder o que a criança fez.

### 5.3 CSS (`css/ui.css`, ao lado de `.fase-tile.bloq:667`)

`.fase-tile.premium` — mesma base do `.bloq`, com borda dourada (`#ffd23e`) em
vez de cinza, `cursor:pointer` e `:active { transform: scale(.95) }` para
parecer o que é: clicável. `.mundo-demo` e `.premium-*` acompanham o padrão de
`.mundo-breve:635`.

---

## 6. Como o app desliga a demo

Duas camadas independentes — se uma falhar, a outra segura:

1. **Detecção em runtime:** `window.Capacitor` existe dentro do app empacotado
   → `Demo.ativo()` retorna `false` sem ninguém editar nada.
2. **Flag explícita:** no passo de empacotamento, `CFG.ativo = false`. Vira uma
   linha no checklist da Fase 2 (é a mesma checagem do `DEMO: false` já previsto
   em `ESTRATEGIA-MONETIZACAO.md` §5).

Como a demo só existe na web, **não há link externo dentro do app** — o que
mantém a conformidade com a regra de *parental gate* da categoria Kids da App
Store (`ESTRATEGIA-MONETIZACAO.md` §7).

---

## 7. Testes

### `tests/demo.test.mjs` (novo, padrão `_loader.mjs`)

```js
import { carregar, criarOk } from "./_loader.mjs";

const { Demo, FASES, MUNDOS, fasesDoMundo } = carregar(
  ["js/data/fases.js", "js/core/Demo.js"],
  ["Demo", "FASES", "MUNDOS", "fasesDoMundo"]
);
```

Casos que precisam existir:

- as 2 primeiras fases de **cada** mundo passam em `faseLiberada` (varrer
  `MUNDOS`, não listar ids na mão — mundo novo entra no teste sozinho);
- a 3ª fase de cada mundo é barrada;
- `faseLiberada` aceita id **number** (`1`) e **string** (`"s1"`, `"d1"`) — é
  onde um `===` desatento quebraria (ver `getFase`, `fases.js:328`);
- `recursoLiberado("loja"|"desafio"|"bossrush")` → `false`;
  `recursoLiberado("treino")` → `true`;
- exatamente `MUNDOS.length * 2` fases liberadas no total.

> Em Node não existe `window`, então `noApp()` é `false` e a demo fica ativa —
> o teste exercita justamente o caminho da web.

### `tests/sw.test.mjs` (já existente, vai falhar de propósito)

Adicionar `"js/core/Demo.js"` ao `ASSETS` de `sw.js` e subir o `CACHE`
(`sw.js:5`, hoje `idolmath-v29` → `v30`). Sem isso a suíte quebra — é o
guarda-corpo do PWA funcionando.

---

## 8. Verificação ponta a ponta

```bash
cd /workspace/idol-math
npm test                     # inclui demo.test.mjs e sw.test.mjs
python3 -m http.server 8000  # http://localhost:8000
```

Roteiro manual (perfil novo, `localStorage` limpo):

1. Menu → **JOGAR** → os 3 mundos mostram "🎁 2 fases grátis".
2. Tabuada → fases 1 e 2 jogáveis; 3+ com 🔒.
3. Vencer a fase 1 → grade mostra a 2 liberada.
4. Vencer a fase 2 → resultado traz **"💎 Próxima fase no app completo"**
   (não "Próxima Fase"); a grade mostra a 3 com 💎 e a 4 com 🔒.
5. Tocar na fase 3 → abre a tela premium; **↩ Menu** volta sem travar.
6. Repetir 2–5 no mundo Soma (`s1`,`s2`) e Divisão (`d1`,`d2`).
7. Menu → **🗓️ Desafio 💎** e **🛍️ Loja 💎** abrem a tela premium.
8. **📚 Treino**, **📊 Progresso** e **🐾 Pets** abrem normalmente.
9. Ajustes → **Exportar** gera o JSON com o progresso das 6 fases.
10. No console: `Demo.ativo()` → `true`. Simular o app com
    `window.Capacitor = {}` e recarregar → todas as travas somem (é o
    comportamento do build empacotado).

---

## 9. Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `js/core/Demo.js` | **novo** — config + regras da demo |
| `js/ui/screens.js` | 6 gates + `montarPremium` + rota `premium` |
| `index.html` | `<section id="screen-premium">` + `<script>` do Demo.js |
| `css/ui.css` | `.fase-tile.premium`, `.mundo-demo`, `.premium-*` |
| `sw.js` | `ASSETS` + `CACHE` v29 → v30 |
| `tests/demo.test.mjs` | **novo** |
| `package.json` | incluir o novo teste no script `test` |

Nada em `js/core/Storage.js`, `js/scenes/*` ou `js/data/fases.js` — a trava é
de UI, o save fica intacto.

---

## 10. Decisões que ainda dependem de você

1. **Loja travada com moedas acumulando.** É o ponto mais delicado da demo.
   Alternativa, se preferir: manter comprável só a faixa de preço 0 (as roupas
   grátis já existem em `js/data/roupas.js`), o que dá uma recompensa real na
   demo. Custa pouco: um filtro por `preco === 0` em `montarLoja`.
2. **Desafio do Dia travado.** Ele é o hábito diário — travar aumenta a pressão
   de compra, mas também derruba o retorno à demo (que é o canal de aquisição).
   Liberar só com as tabuadas das 2 fases grátis é um meio-termo viável.
3. **URLs das lojas.** Ficam `null` até o app estar no ar; a tela premium mostra
   "Em breve". Preencher em `Demo.js` no dia da publicação.

---

**Estado:** especificado, não implementado.
**Depende de:** nada — pode ser implementado antes mesmo das contas de
desenvolvedor saírem (Fase 0 §Contas), já que as URLs entram depois.
