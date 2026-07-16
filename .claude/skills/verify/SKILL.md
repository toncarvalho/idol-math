---
name: verify
description: Como rodar e dirigir o Idol Math de verdade (navegador) para verificar mudanças end-to-end.
---

# Verificar o Idol Math rodando

O jogo é um site estático buildless; a superfície é o navegador (mobile-first).

## Servir

`python3 -m http.server 8000` na raiz funciona, mas neste ambiente Windows o
launcher `py`/`python` pode não existir no Git Bash — um servidor estático
mínimo em Node (script de ~25 linhas com `node:http` servindo a raiz do repo)
resolve. Não abrir via `file://` (localStorage + fetch de manifest quebram).

## Dirigir (Playwright)

- Instalar `playwright` FORA do repo (o jogo não tem dependências npm — não
  sujar o package.json). Usar `channel: "msedge"` para não baixar navegador.
- Viewport mobile: `{ width: 412, height: 915 }`.
- Primeira visita cai em `#screen-perfis` (criação): preencher `#nome-input`,
  clicar `[data-acao="criar-perfil"]`.
- Telas HTML: `#screen-<nome>` com `hidden`; esperar
  `#screen-X:not([hidden])`. Ações via `[data-acao=...]`, mundos
  `[data-mundo=...]`, fases `[data-fase=...]`.
- **Jogar uma fase automaticamente**: a resposta certa está em
  `window.game.scene.getScene("GameScene").q.resposta`; clicar
  `.resp-btn[data-val="<resposta>"]` (botões HTML sobre o canvas). Loop com
  ~450ms entre jogadas; fim da fase = `#screen-resultado` visível.
- Save no localStorage: índice `idolmath.perfis.v1` (campo `atual`), save em
  `idolmath.save.<id>`.
- Capturar `pageerror` e `console.error` — o jogo normalmente roda limpo;
  qualquer erro é achado.
