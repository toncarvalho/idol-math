# Checklist de Conformidade Legal — Idol Math

**Atualização:** 8 de agosto de 2026  
**Autor:** Toncarvalho

---

## Fase 0: Antes do Lançamento

### 📋 Documentação Legal

- [x] **Política de Privacidade**
  - Arquivo: `docs/POLITICA-PRIVACIDADE.md`
  - Status: ✅ Rascunho completo
  - Próximo: Publicar em URL acessível (indie.toncarvalho.com/privacidade ou GitHub Pages)
  - Deve ser em **português e inglês** para Play Store/App Store

- [ ] **Termos de Serviço** (opcional, mas recomendado)
  - Necessário se houver compras internas (não é o caso)
  - Recomendado para cobertura geral
  - Pode ser simples: "Este app é fornecido 'como está'"

- [ ] **Política de Reembolso**
  - Google Play: padrão é 2 horas após compra
  - App Store: depende da política Apple
  - Documentar na ficha da loja

### 🏢 Configuração da Conta de Desenvolvedor

#### Google Play Developer

- [ ] **Criar conta** (US$ 25, única vez)
  - Link: https://play.google.com/console
  - Requer: Conta Google ativa
  - Prazo: ~5 min para aprovação

- [ ] **Setup de pagamentos (Merchant Account)**
  - Link: https://play.google.com/console → Configurações → Informações de pagamento
  - Requer: CPF/CNPJ, dados bancários
  - Prazo: ~1–5 dias para aprovação
  - Nota: Fundos são depositados mensalmente (após Play Store reter taxa de 30%)

- [ ] **Preencher perfil de desenvolvedor**
  - Nome do desenvolvedor: Toncarvalho
  - Email: toncarvalho@gmail.com
  - Website: (opcional, pode ser GitHub Pages)
  - Telefone: (obrigatório)
  - Endereço: (obrigatório)

#### App Store Developer (condicional: só após validar Android)

- [ ] **Criar conta** (US$ 99/ano)
  - Link: https://developer.apple.com
  - Requer: Apple ID, informações bancárias (pode pedir depois)
  - Prazo: ~24h para aprovação

- [ ] **Acordo de Desenvolvedor**
  - Aceitar Paid Applications Agreement
  - Aceitar Apple Developer Agreement

### 📝 Conformidade com Leis de Proteção de Dados

#### LGPD (Brasil)

- [x] **Análise de impacto:** Nenhum dado é coletado
  - Resultado: ✅ Em conformidade (sem dados = sem LGPD)
  - Evidência: Política de Privacidade

- [x] **Consentimento parental:** Não necessário
  - Motivo: Sem coleta de dados

- [ ] **Aviso de LGPD na loja:**
  - Adicionar frase na descrição: *"Privacidade garantida: zero coleta de dados, 100% offline"*

#### COPPA (EUA, crianças < 13 anos)

- [x] **Verificação:** Sem coleta, sem ads, sem redes sociais
  - Resultado: ✅ Em conformidade com COPPA
  - Evidência: Política de Privacidade

#### GDPR / GDPR-K (Europa, crianças < 16 anos)

- [x] **Verificação:** Sem coleta, sem processamento
  - Resultado: ✅ Em conformidade
  - Nota: Aplicável se distribuir na EU (opcional para fase de lançamento BR)

### 📊 Formulários de Classificação Indicativa

#### IARC (via Google Play Console)

- [ ] **Preencher questionário IARC**
  - Acessar: Google Play Console → Seu app → Classificação de conteúdo
  - Perguntas esperadas:
    - Violência? Não
    - Conteúdo sexual? Não
    - Linguagem? Não
    - Drogas/álcool? Não
    - Apostas? Não
    - Microtransações? Sim (cosméticas opcionais)
  - Esperado: Classificação **Livre** (ClassInd) / **Everyone** (ESRB)
  - Resultado: Certificado instantâneo

#### Famílias (Google Play)

- [ ] **Inscrever no programa Designed for Families**
  - Link: Google Play Console → Configurações → Informações do programa
  - Checklist de segurança:
    - ✅ Sem analytics de terceiros (nós não usamos)
    - ✅ Sem SDKs de publicidade (nós não usamos)
    - ✅ Sem links para YouTube/social media (nosso app não tem)
    - ✅ Privacidade: descrição clara
    - ✅ Sem compra em um clique de conteúdo adulto
    - ✅ Sem ofuscação de segurança ou localização
  - Benefício: Destaque em seção "Apps para Famílias"

#### App Store (condicional: iOS)

- [ ] **Categoria Kids**
  - Setting: App Store Connect → Seu app → Informações de app → Categoria principal: "Kids"
  - Requer: Declaração de conformidade COPPA via IARC (mesmo certificado Google)
  - Restrições: Sem analytics (ok, não temos), sem ads (ok), sem links externos (ok)

### 🎨 Fichas de Loja

#### Google Play (PT-BR)

- [ ] **Informações da loja:**
  - Título curto: "Idol Math — Tabuada & Lógica" (máx. 50 chars)
  - Descrição completa: (máx. 4000 chars)
    - Copiar de `ESTRATEGIA-MONETIZACAO.md` §2 e adaptar para os 3 mundos
    - Ênfase: "3 operações (soma, subtração, multiplicação, divisão)", "6–10 anos", "100% offline", "sem anúncios"
  - Descrição breve: "Aprenda matemática derrotando chefões em 3 mundos." (máx. 80 chars)

- [ ] **Capturas de tela** (mínimo 2, máx. 8; recomendado 5 em retrato)
  - 1. Menu de mundos (Soma, Tabuada, Divisão)
  - 2. Gameplay (uma pergunta sendo respondida)
  - 3. Painel de progresso / stats
  - 4. Loja de roupas (cosmético)
  - 5. Boss com efeito visual
  - Requisitos: Retrato (9:16), PNG/JPEG, mín. 320×569, máx. 3840×7680, sem elementos fora do frame

- [ ] **Ícone da loja** (512×512, PNG quadrado)
  - Arquivo: Converter `assets/icon.svg` para PNG
  - Requestion: Sem espaço em branco (full bleed)

- [ ] **Gráfico promocional** (1024×500, opcional)
  - Banner horizontal para destaque
  - Pode ser screenshot + texto overlay

- [ ] **Vídeo de demonstração** (30–3 min, opcional)
  - Gameplay curto (30–60s) mostrando: menu → seleção de mundo → gameplay → vitória

- [ ] **Texto de anúncio:**
  - "Aprenda tabuada, soma, subtração e divisão virando uma idol de palco!"
  - "3 mundos de desafios para crianças de 6–10 anos"
  - "100% offline, sem anúncios, sem coleta de dados"

#### App Store (PT-BR, condicional)

- [ ] **Informações da loja** (estrutura similar, mas campos diferentes)
  - Localizar: App Store Connect → Seu app → Localização: Portuguese (Brazil)
  - Descrição: até 4000 chars (mesma do Play, adaptada)
  - Keywords: "tabuada, matemática, educação, jogo infantil, multiplicação, soma" (máx. 5 termos, separados por vírgula)
  - Nota de suporte: "Suporte: toncarvalho@gmail.com"
  - Política de privacidade: URL para `docs/POLITICA-PRIVACIDADE.md`

- [ ] **Capturas de tela** (5–10, obrigatório)
  - Mesmas 5 do Play Store
  - Formato: Retrato, máx. 6.5" (ex.: 1080×1920 para iPhone)

---

## Fase 1: Implementação Web (Flag DEMO + Gating)

> Executar após Fase 0 completa.

- [ ] Flag `DEMO` em `js/data/fases.js`
- [ ] Gating em `screens.js` (modal "Continue no app")
- [ ] URLs de loja: Play Store + App Store
- [ ] Testes: npm test, manual play

---

## Fase 2: Empacotamento Capacitor

> Executar após Fase 1.

- [ ] Setup Capacitor
- [ ] Build Android
- [ ] Build iOS (condicional)
- [ ] Testes de app

---

## Fase 3: Lançamento Play Store

> Executar quando tudo acima estiver pronto.

- [ ] Upload APK/AAB
- [ ] Ativar promo: R$ 9,90 → R$ 14,90 (2 semanas)
- [ ] Publicar em Beta → Production

---

## Referências Rápidas

| Recurso | Link |
|---------|------|
| Google Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |
| LGPD (Lei Geral de Proteção de Dados) | https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd |
| COPPA (Children's Online Privacy Protection Act) | https://www.ftc.gov/coppa |
| GDPR Kids | https://gdpr-info.eu/art-8-gdpr/ |
| IARC (app-rating-coalition.org) | https://play.google.com/console |

---

**Status Geral:** ⏳ Fase 0 — 30% (Política de Privacidade completa, faltam contas e formulários)

**Próximo**: Criar conta Google Play Developer
