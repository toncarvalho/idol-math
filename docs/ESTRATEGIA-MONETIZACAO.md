# Estratégia de Monetização — Premium Pago 💎

> **Decisão (jul/2026):** o Idol Math será comercializado como **app pago de compra
> única** (premium), **sem anúncios e sem compras internas**. Este documento registra
> o racional, o plano técnico e o roadmap de lançamento.

## 1. Racional da decisão

Entre os modelos avaliados (premium, freemium, anúncios, licenciamento escolar),
o premium pago é o que melhor se encaixa no produto:

- **Público infantil**: anúncios em apps para crianças são juridicamente delicados
  (LGPD no Brasil, COPPA/GDPR-K fora) e degradam a experiência pedagógica.
- **Arquitetura atual**: o jogo é 100% offline, sem servidor e sem login. Compra
  única não exige backend, contas de usuário nem infraestrutura de pagamento própria —
  a loja do sistema (Google/Apple) cuida de tudo.
- **Argumento de venda forte para os pais**: *"pague uma vez, sem anúncios, sem
  compras dentro do jogo, sem coleta de dados, funciona offline"*. Isso é raro na
  categoria e é exatamente o que pais de crianças pequenas procuram.
- **Produto completo**: 12 fases, chefões, modo treino, Boss Rush, desafio diário,
  conquistas, loja cosmética (com moedas ganhas jogando) e painel de progresso
  para pais/professores justificam um preço de entrada.

## 2. Proposta de valor (pitch da loja)

**Título de loja:** Idol Math — Tabuada Kpop
**Uma linha:** Aprenda a tabuada virando uma idol de palco: derrote chefões com
contas de multiplicação!

Pontos a destacar na ficha da loja:

1. Sem anúncios, sem compras internas, sem cadastro.
2. Nenhum dado sai do aparelho (progresso 100% local) — privacidade total.
3. Funciona offline (avião, viagem, sem Wi-Fi).
4. Vários jogadores no mesmo aparelho (irmãs, colegas), cada um com seu progresso.
5. Painel para pais e professores: mapa de calor das tabuadas e fatos a treinar.
6. Pedagogia real: repetição inteligente dos erros + visualização em grade de pontos.

## 3. Praças de venda e ordem de ataque

| Fase | Praça | Modelo | Observações |
|------|-------|--------|-------------|
| 1 | **Google Play** | App pago (compra única) | Maior público Android no Brasil; taxa única de US$ 25 para conta de desenvolvedor |
| 2 | **App Store (iOS)** | App pago | US$ 99/ano; categoria Kids tem regras próprias (ver §6) |
| 3 | **itch.io / venda direta** | Pague o que quiser ou preço fixo | Baixa fricção, bom para validar preço e colher feedback |

A **versão web** continua existindo como **demo e marketing** (ver §5).

## 4. Empacotamento técnico

O jogo é HTML+JS puro (Phaser vendorizado, sem build). Duas rotas para virar app:

### Recomendada: Capacitor

- Embute todos os assets **dentro do app** → offline de verdade, sem depender de
  hospedagem; funciona igual em **Android e iOS** (uma configuração serve às duas lojas).
- O projeto atual entra como `webDir` sem alterações; `sw.js` torna-se redundante
  dentro do app (inofensivo — pode ser mantido para a versão web).
- Passos: `npm init` mínimo apenas para o empacote (o jogo em si segue sem build),
  `npx cap add android` / `npx cap add ios`, ícones/splash a partir de
  `assets/icon.svg`, assinatura e upload.

### Alternativa: TWA / Bubblewrap (só Android)

- Menor esforço, porém depende do site publicado (GitHub Pages) e não cobre iOS.
- Válida como atalho para a Fase 1 se quisermos ir ao ar mais rápido; migrar para
  Capacitor na Fase 2 de qualquer forma.

**Decisão técnica:** Capacitor, para não fazer o trabalho duas vezes.

## 5. Versão web = demo

Se a web continuar com o jogo completo e grátis, não há motivo para comprar o app.
A web passa a ser a **demo jogável** (e principal canal de aquisição):

- **Demo inclui:** fases 1 a 4, modo treino da tabuada da fase, perfis locais.
- **Demo exclui:** fases 5–12, Boss Rush, Desafio do Dia, loja de roupas.
- Ao tocar em conteúdo bloqueado, tela simpática "Continue no app completo" com
  link para as lojas (sem dark patterns — é um jogo para crianças).
- Implementação: flag `DEMO` em `js/data/fases.js` (config `JOGO`), avaliada nas
  telas de fases/menu em `js/ui/screens.js`. O empacote Capacitor usa `DEMO: false`.

## 6. Preço

- **Brasil (Google Play):** lançar a **R$ 14,90**. Faixa de referência da categoria
  educacional infantil: R$ 9,90–29,90. Promoção de lançamento a R$ 9,90 nas duas
  primeiras semanas para gerar volume e avaliações iniciais.
- **iOS:** tier equivalente (~US$ 2,99), público iOS aceita preço um pouco maior.
- Revisar preço após ~90 dias com dados reais de conversão da ficha da loja.

## 7. Conformidade (o dever de casa jurídico)

A grande vantagem: **o jogo não coleta dado nenhum** — tudo é `localStorage`.

- [ ] **Política de privacidade** publicada em URL própria (obrigatória nas duas
      lojas, mesmo sem coleta). Conteúdo: "nenhum dado pessoal é coletado ou
      transmitido; todo progresso fica no aparelho".
- [ ] **Google Play – Famílias**: aderir ao programa *Designed for Families*
      (público-alvo: crianças). Preencher o formulário de segurança de dados
      declarando zero coleta. Sem SDKs de terceiros = aprovação simples.
- [ ] **App Store – categoria Kids**: proibido analytics/ads de terceiros (ok, não
      temos), links externos precisam de *parental gate*. O link "app completo" da
      demo web não existe dentro do app — dentro do app não há link externo algum.
- [ ] **LGPD**: sem coleta, sem tratamento de dados → risco mínimo; a política de
      privacidade documenta isso.
- [ ] **Classificação indicativa**: Livre (ClassInd) / Everyone (ESRB) via
      questionário IARC no console da Play.

## 8. Roadmap

**Fase 0 — Preparação (1–2 semanas)**
- [x] Corrigir o deploy do GitHub Pages — funcionando (deploys de jul/2026 publicados com sucesso).
- [ ] Criar conta Google Play Developer (US$ 25) + perfil de pagamentos (merchant).
- [ ] Escrever e publicar a política de privacidade.
- [x] Ícones PNG finais e capturas de tela de loja (retrato, com legendas) —
      kit pronto em `store/` (ícone 512, feature graphic 1024×500 e 6 capturas
      1080×1920 com legenda; ver `store/README.md`).

**Fase 1 — Valor de produção + Lançamento Android (2–4 semanas)**
- [x] Arte dos inimigos e chefões (24 figuras SVG flat, estilo coeso com os heróis)
      no lugar dos emojis — inclui os tiles da grade de fases.
- [x] Heroína visível no palco, com animação de ataque (raio) e de golpe recebido.
- [ ] Música real (2–3 loops licenciados), mantendo o synth como fallback.
- [x] Mecânica especial por chefão + power-ups de combo (ver §11).
- [x] Estrutura de Mundos no ar: seleção de habilidade antes da grade,
      Tabuada dentro, prévias "Em breve" de Soma e Divisão (ver §12).
- [ ] Mundo da Divisão (§12 — próximo passo; valida a estrutura).
- [ ] Mundo Soma & Subtração (§12 — vira a demo web; pode ir para a Fase 2
      se atrasar o lançamento Android).
- [ ] Implementar flag `DEMO` e gating de conteúdo na web (com mundos: demo =
      Soma & Subtração completo; ver §12).
- [ ] Empacotar com Capacitor (Android), assinar, testes internos.
- [ ] Ficha da loja (PT-BR), questionário IARC, formulário Famílias.
- [ ] Publicar a R$ 9,90 (promo de lançamento) → R$ 14,90.

**Fase 2 — iOS (4–6 semanas após Android)**
- [ ] Conta Apple Developer (US$ 99/ano) — só abrir se o Android validar demanda.
- [ ] Build Capacitor iOS, categoria Kids, revisão da Apple.

**Fase 3 — Tração**
- [ ] itch.io como canal secundário.
- [ ] Divulgação: grupos de pais/professores, TikTok/Reels (estética kpop ajuda),
      professores de matemática como multiplicadores.
- [ ] Avaliar pacote/licença para escolas como evolução futura (exigiria backend).

## 9. Metas e critérios de sucesso

| Métrica | Meta inicial (90 dias) |
|---------|------------------------|
| Instalações pagas (Android) | 300 |
| Nota média na loja | ≥ 4,5 |
| Conversão demo web → loja | ≥ 3% dos jogadores que batem no gate |
| Reembolsos | < 5% |

Se a conversão da demo for baixa, testar: mais fases grátis (1–6) ou preço menor —
**nunca** anúncios ou compras internas, que quebrariam a promessa do produto.

## 10. O que fica explicitamente fora

- ❌ Anúncios (qualquer formato, mesmo "rewarded").
- ❌ Compra de moedas ou qualquer IAP consumível.
- ❌ Assinatura.
- ❌ Coleta de dados / analytics de terceiros dentro do app.

Essas exclusões **são parte do produto** — aparecem na ficha da loja como diferencial.

## 11. Prontidão do produto (diagnóstico de jogabilidade — jul/2026)

Avaliação honesta feita sobre o código: **o design já é vendável; a produção
audiovisual é o que separa o jogo de um produto de loja.** Não há retrabalho de
fundação a fazer.

**Já em nível de produto pago (não mexer):**
- Pedagogia real: repetição inteligente ponderada pelos erros, distratores da
  "linha vizinha" (7×8 → 56, 63, 48, 49), visualização em grade de pontos no erro.
- Meta-game completo: 12 fases, chefões, Boss Rush, Desafio do Dia com ofensiva,
  conquistas, moedas, loja de roupas.
- Diferenciais para os pais: painel com mapa de calor, perfis múltiplos, backup,
  acessibilidade, 100% offline.
- Qualidade técnica: testes, CI, PWA.

**Lacunas que impediam a venda (em ordem de impacto):**
1. ~~Inimigos e chefões eram emojis~~ → **resolvido**: 24 figuras SVG flat
   (assets/inimigos/), com fallback para emoji se um arquivo faltar.
2. ~~A fantasia "idol de palco" não aparecia na tela~~ → **resolvido**: a heroína
   agora está no palco, ataca com um raio a cada acerto e reage ao ser atingida.
3. ~~Monotonia nas fases 5–12: a mecânica é constante; um chefão é igual ao inimigo
   comum com mais HP.~~ → **resolvido**: 4 mecânicas especiais de chefão
   (⏱️ Apressado, 🌀 Trapaceiro, 🛡️ Blindado, 💖 Curandeiro) distribuídas nas fases
   3–12 via `boss.mecanica` (catálogo `MECANICAS_CHEFAO` em `js/data/fases.js`),
   mais 2 power-ups por combo: 🛡️ escudo (x4, bloqueia a perda de 1 vida) e
   ⚡ golpe duplo (x8, próximo acerto vale 2).
4. Áudio 100% sintetizado (Web Audio): funcional, mas o tema kpop pede música
   marcante. **Plano**: 2–3 loops licenciados; synth vira fallback.

Critério de "pronto para cobrar": itens 1–4 fechados + capturas de tela de loja
que se sustentem ao lado dos concorrentes pagos da categoria.

## 12. Mundos (expansão de conteúdo — EM EXECUÇÃO)

> Decisão de produto (jul/2026): o jogo é organizado em **mundos**, cada um
> cobrindo uma habilidade matemática. A **estrutura foi implementada e
> publicada em 16/07/2026** (commit `39a1b58`, verificada end-to-end no
> navegador e no ar no GitHub Pages): tela de seleção de mundos antes da
> grade, grade de fases por mundo, progresso por mundo no save (100%
> compatível com saves antigos), Soma & Subtração e Divisão como prévia
> "🚧 Em breve".

### Os três mundos

| # | Mundo | Conteúdo | Estado |
|---|-------|----------|--------|
| 1 | 🌟 **Soma & Subtração** | Contas de +/− por faixa numérica (1º–2º ano) | a construir (o maior) |
| 2 | 🎤 **Tabuada** | O jogo atual, fases 1–12 intactas | ✅ no ar, dentro da estrutura de mundos |
| 3 | ⚡ **Divisão** | Tabuada ao contrário: 56 ÷ 7 (4º ano) | 🎯 PRÓXIMO PASSO (barato) |

A ordem 1→2→3 é a progressão pedagógica da criança — Soma & Subtração vem
ANTES da tabuada na escola. Efeito comercial: amplia a faixa etária de ~8–10
para **~6–10 anos** (irmãos mais novos jogam), dobrando o público-alvo do
app pago.

### Notas de implementação (para quando começar)

- **Divisão é quase de graça**: o MathEngine já tem a tabela de fatos; a
  pergunta vira `(a×b) ÷ a`, os distratores de "linha vizinha" seguem a mesma
  lógica e a repetição inteligente pode COMPARTILHAR os fatos com a tabuada
  (errar 56÷7 e errar 7×8 é o mesmo buraco de conhecimento — tratar junto).
- **Soma & Subtração é o maior trabalho**: mecânica idêntica, mas a progressão
  é por faixa/dificuldade (somas até 10 → até 20 → subtração sem "emprestar" →
  com "emprestar" → até 100) e os distratores certos são outros (±1, ±2, erro
  de dezena no vai-um). Exige `gerarPerguntaSoma` novo no MathEngine e fases
  declarando faixa em vez de tabuada. Desenhar as fases exatas com cuidado.
- ~~**Estrutura**: array `MUNDOS` em `js/data/fases.js`~~ → **feito
  (16/07/2026)**: `MUNDOS` + helpers (`fasesDoMundo`, `indiceFase`,
  `proximaFase`), tela `screen-mundos`, grade por mundo, Boss Rush restrito à
  Tabuada, pausa→Fases abre a grade do mundo da fase. Falta o tema visual/cor
  de fundo por mundo no gameplay (o `gerarFundo` da BootScene já aceita cores).
- **Sequência de construção**: (a) ✅ estrutura de mundos com a Tabuada
  dentro; (b) 🎯 Divisão, validando a estrutura com conteúdo barato; (c) Soma
  & Subtração por último.

### Regras de segurança do save (INVIOLÁVEIS)

- As fases atuais mantêm os ids `1–12` para sempre — nunca renumerar, ou o
  progresso salvo dos jogadores (estrelas por `faseId`) é invalidado.
- Mundos novos usam ids próprios (ex.: `s1..s10` para soma, `d1..d10` para
  divisão).
- Pesos de repetição inteligente ganham chave por operação (`7x8`, `7+8`,
  `15-6`); os já salvos (`AxB`) continuam válidos como estão.
- Decidir na retomada: o Desafio do Dia mistura mundos ou só os desbloqueados.

### Inspiração Kumon (decisão de jul/2026)

Pesquisamos a metodologia Kumon (pequenos passos, maestria antes de avançar,
ponto de partida individualizado, rotina diária curta, autoinstrução) para
avaliar incorporá-la. Conclusão: **o jogo já pratica a maior parte** — repetição
inteligente ponderada pelos erros, Desafio do Dia com ofensiva, autonomia total —
e num ponto é melhor que o método: a grade de pontos no erro ensina o *conceito*
(crítica clássica ao Kumon é mecanizar sem compreender). Incorporar como
**tempero, não reforma**:

- [ ] **Teste de nivelamento** ao criar o perfil (10–12 contas rápidas
      misturadas) → recomenda o mundo/fase inicial ("Comece pelo Mundo da
      Soma!"). É o pilar Kumon que falta e vira argumento de loja
      ("o jogo se adapta ao nível do seu filho"). Implementar junto com os
      Mundos.
- [ ] **Fases da Soma & Subtração desenhadas em degraus mínimos** (small
      steps): cada fase adiciona UMA dificuldade nova, nunca duas.
- [ ] **Métrica de fluência no painel dos pais**: além do mapa de calor de
      erros, mostrar fatos que a criança acerta porém devagar (maestria =
      acerto + velocidade, como no Kumon).

O que fica **fora**: bloquear avanço até "maestria" comprovada (frustração em
jogo) e usar o nome "Kumon" em qualquer material — marca registrada; dizer
"inspirado em métodos de maestria e pequenos passos".

### Impacto no modelo premium

O corte demo/pago fica mais forte com mundos:

- **Demo web grátis**: Mundo da Soma & Subtração completo (em vez de "fases
  1–4 da tabuada").
- **App pago**: os 3 mundos + Boss Rush + Desafio do Dia + loja.
- Reposicionamento da ficha de loja: de "jogo de tabuada" para **"matemática
  do fundamental (6–10 anos): soma, subtração, multiplicação e divisão"** —
  sustenta melhor o preço de R$ 14,90 e diferencia dos apps de tabuada.
