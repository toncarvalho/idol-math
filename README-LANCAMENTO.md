# Roadmap de Lançamento — Idol Math

**Status: Fase 0 — 40% (Conformidade Legal)**  
**Última atualização:** 8 de agosto de 2026  
**Autor:** Toncarvalho  

---

## 🎯 Visão Geral

**O Idol Math está pronto pedagogicamente, mas precisa de conformidade legal e empacotamento antes de lançar.**

| Pilar | Status | Progresso |
|-------|--------|-----------|
| 🎮 **Produto** (3 mundos, mecânicas) | ✅ Completo | 100% |
| 📋 **Conformidade Legal** | 🟡 Em andamento | 40% |
| 🛍️ **Fichas de Loja** | 🟡 Rascunho | 100% (pronto, falta publicar) |
| 📱 **Empacotamento (Capacitor)** | ❌ Não iniciado | 0% |
| 🎵 **Música Real** | ❌ Não iniciado | 0% |
| 🚀 **Play Store** | ❌ Não iniciado | 0% |

---

## Fase 0: Conformidade Legal (40% — 1–2 semanas)

### ✅ Completo (Esta semana)

1. **Documentação de Privacidade**
   - Arquivo: `docs/POLITICA-PRIVACIDADE.md`
   - Status: ✅ Rascunho completo e revisado
   - Próximo: Publicar em URL permanente (GitHub Pages ou site próprio)

2. **Fichas de Loja Prontas**
   - Arquivo: `docs/FICHAS-LOJA.md`
   - Status: ✅ Textos, keywords, requerimentos de imagem
   - Próximo: Tirar screenshots quando chegar a Fase 1

3. **Checklist de Conformidade**
   - Arquivo: `docs/CHECKLIST-CONFORMIDADE.md`
   - Status: ✅ Completo com referencias e links
   - Próximo: Usar como guia para próximas semanas

### 🟡 Próximo (Semana 2)

- [ ] **Criar conta Google Play Developer** (US$ 25)
  - Link: https://play.google.com/console
  - Tempo: ~30 min
  - Requer: Conta Google, CPF/CNPJ, dados bancários

- [ ] **Setup de pagamentos (Merchant Account)**
  - Via Google Play Console → Configurações → Pagamentos
  - Tempo: ~1h (dados bancários)
  - Prazo de aprovação: 1–5 dias

- [ ] **Preencher formulário IARC**
  - Via Google Play Console → seu app → Classificação de conteúdo
  - Tempo: ~10 min
  - Resultado: Certificado instantâneo (classificação "Livre")

- [ ] **Inscrever em "Designed for Families"** (Google Play)
  - Via Console → Configurações
  - Requer: Confirmação de segurança de dados
  - Tempo: ~20 min

- [ ] **Tirar 5 screenshots em alta qualidade** (1080×1920)
  - Do jogo em execução (ideal: emulador)
  - Adicionar legendas em português
  - Arquivos: `docs/screenshots/` (criar pasta)

---

## Fase 1: Implementação Web + Flag DEMO (2–3 semanas)

> Executar após Fase 0 completa.

### O que fazer

> 📄 **Especificação completa: [`docs/PLANO-DEMO-WEB.md`](docs/PLANO-DEMO-WEB.md)**
> — traz os 6 pontos de trava com arquivo e linha, o código do módulo novo, os
> casos de teste e o roteiro de verificação manual.

1. **Novo módulo `js/core/Demo.js`**
   - Config e regras da demo num arquivo só (não em `JOGO`), para o empacote
     Capacitor ter um único ponto a desligar
   - 2 fases grátis por mundo; Boss Rush, Desafio do Dia e Loja travados
   - Trava de **entrada**, nunca de save: o progresso continua sendo gravado

2. **Gating em `js/ui/screens.js`** (6 pontos)
   - Grade de fases, clique em fase, tela de resultado, roteador
     (loja/desafio/boss rush), botão Continuar, seleção de mundos
   - Nova tela `screen-premium` com o que vem na versão completa
   - Sem dark patterns: sempre há caminho de volta, e a tela diz que as moedas
     ficam guardadas

3. **Testar na web**
   - `npm test` (novo `tests/demo.test.mjs`; `sw.test.mjs` exige `Demo.js` no
     `ASSETS` do `sw.js` + bump do `CACHE`)
   - `python3 -m http.server 8000` → roteiro de 10 passos no plano

### Resultado esperado
- Web demo funcional com as 2 primeiras fases grátis de cada mundo
- Rest do conteúdo bloqueado com CTA para loja
- Tudo pronto para enviar URLs de Play Store/App Store

---

## Fase 2: Empacotamento Capacitor (2–3 semanas)

> Executar após Fase 1.

### O que fazer

1. **Instalar Capacitor**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init idol-math --web-dir .
   npx cap add android
   npx cap add ios
   ```

2. **Configurar `capacitor.config.json`**
   ```json
   {
     "appId": "com.toncarvalho.idolmath",
     "appName": "Idol Math",
     "orientation": "portrait",
     "plugins": {
       "Vibration": {}
     }
   }
   ```

3. **Gerar ícones/splash**
   ```bash
   npx @capacitor/assets generate --ios --android
   ```

4. **Build e teste**
   - Android: abrir em Android Studio, rodar em emulador/device
   - Testar: todos os mundos, offline, localStorage funciona
   - Flag `DEMO: false` no build

5. **Preparar APK/AAB** para upload

### Resultado esperado
- App funcional em Android/iOS
- Sem flag DEMO (conteúdo completo)
- Pronto para upload nas lojas

---

## Fase 3: Lançamento Play Store (1–2 semanas)

> Executar quando Fase 2 completa.

### O que fazer

1. **Upload na Play Store**
   - Via Console: Crie novo app
   - Preencha todas as fichas (use `docs/FICHAS-LOJA.md`)
   - Upload de APK/AAB
   - Submeta para review

2. **Configurar promo de lançamento**
   - Preço base: R$ 14,90
   - Promo (2 semanas): R$ 9,90
   - Objetivo: gerar volume e avaliações iniciais

3. **Publicar**
   - Internal Testing → Beta → Production (ramp-up gradual)

4. **Monitorar**
   - Crash rates
   - Avaliações/comentários
   - Métricas: 300 instalações em 90 dias é meta

### Resultado esperado
- App ao vivo na Play Store
- Sendo distribuído para Android Brasil
- Coleta feedback real de usuários

---

## Fase 4: iOS (4–6 semanas, condicional)

> Só se Android validar demanda (metas de 90 dias).

- Conta Apple Developer (US$ 99/ano)
- Build iOS com Capacitor
- Submissão App Store (categoria Kids)
- Mesma promo de lançamento

---

## 📊 Timeline Estimada

```
Hoje (ago 8)          Semana 1        Semana 2        Semana 4       Semana 6       Semana 8
│                        │               │               │              │              │
├─ Fase 0 (40%)         ├─ Fase 0 (100%)                                              
│  ✅ Docs              │                                              
│  ❌ Contas Dev        │  Fase 1 → Flag DEMO                                         
│                       │  & testes web                                              
│                                       ├─ Fase 1 (100%)                             
│                                       │                                            
│                                       ├─ Fase 2 → Capacitor                       
│                                       │            & Android build                 
│                                                     ├─ Fase 2 (100%)               
│                                                     │                              
│                                                     ├─ Fase 3 → Upload & go live 
│                                                                  ├─ Play Store ✅   
│                                                                  │  (30% ramp-up)  
│                                                                          │         
│                                                                          ├─ Fase 3 (100%)
│                                                                          │ Aguardar review
│                                                                          │ 90+ dias de métricas
│                                                                          │
│                                                                          ├─ Decisão iOS?
│                                                                                  ├─ Fase 4 (iOS)
```

**Crítico:** Cada fase depende da anterior. Não pular etapas.

---

## 🚨 Bloqueadores Conhecidos

| Item | Impacto | Solução |
|------|---------|---------|
| Música real não implementada | Médio | Fallback para synth funciona; adicionar depois |
| Contas dev (Play/Apple) | Alto | Requer dinheiro; fazer ASAP |
| Screenshots/ícone para loja | Médio | Simples; fazer quando tiver app rodando |
| Build Capacitor (primeira vez) | Médio | Documentado; 2–3h incluindo troubleshooting |

---

## 📝 Próxima Ação

**🟡 Semana que vem: Criar conta Google Play Developer**

1. Ir para https://play.google.com/console
2. Pagar US$ 25
3. Preencher perfil de desenvolvedor (nome, email, telefone, endereço)
4. Setup de pagamentos (dados bancários)
5. Confirmar certificado de merchant (1–5 dias)

**Tempo estimado:** 30 min agora + 1–5 dias para aprovação

---

## 📚 Referências Rápidas

| Documento | Propósito |
|-----------|----------|
| `CLAUDE.md` | Guia de desenvolvimento (atualizar com mundos) |
| `ESTRATEGIA-MONETIZACAO.md` | Modelo de negócio e decisões |
| `POLITICA-PRIVACIDADE.md` | Conformidade legal (LGPD/COPPA) |
| `PLANO-DEMO-WEB.md` | Especificação da Fase 1 (demo web + travas) |
| `CHECKLIST-CONFORMIDADE.md` | Checklist detalhado (todas as etapas) |
| `FICHAS-LOJA.md` | Textos prontos para copiar/colar |
| `README-LANCAMENTO.md` | Este arquivo (status e timeline) |

---

## ✅ Conclusão

**O produto está pronto.** O trabalho agora é administrativo e técnico:

1. ✅ Pedagogia: 3 mundos, mecânicas, balanceamento → **PRONTO**
2. 🟡 Conformidade: Política de privacidade escrita, faltam contas dev
3. 🟡 Web: Flag DEMO pronta para implementar
4. ❌ Empacotamento: Capacitor (standard, documentado)
5. ❌ Play Store: Upload (quando tudo acima pronto)

**Nenhum bloqueador técnico.** É executável em 6–8 semanas.

---

**Desenvolvido com carinho.** 💜🎮  
Idol Math © 2026 Toncarvalho
