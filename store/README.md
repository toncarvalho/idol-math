# Kit de loja (Google Play) 🛍️

Assets prontos para o console do Google Play (Fase 0/1 do plano —
`docs/ESTRATEGIA-MONETIZACAO.md`). Gerados a partir do jogo real via
Chrome headless com um perfil de demonstração; para regenerar, veja
"Como regenerar" abaixo.

| Arquivo | Uso no console | Especificação |
|---|---|---|
| `icon-play-512.png` | Ícone do app (hi-res) | 512×512 PNG |
| `feature-graphic-1024x500.png` | Gráfico de destaque | 1024×500 PNG |
| `screenshots/01-menu.png` … `06-progresso.png` | Capturas de telefone (retrato) | 1080×1920 PNG (9:16) |

Ordem sugerida das capturas na ficha (funil de venda):

1. **01-menu** — "Vire uma idol da matemática!" (proposta)
2. **02-batalha** — "Acertou a conta? Solta o golpe!" (o core)
3. **03-chefao** — "Enfrente 12 chefões" (progressão)
4. **04-pets** — "Conquistas viram pets!" (meta-game)
5. **05-loja** — "Ganhe moedas jogando" (recompensas, zero IAP)
6. **06-progresso** — "Painel para pais e professores" (decisor de compra)

Os ícones da PWA (`assets/icon*.png`) seguem separados e intocados.

## Como regenerar

As páginas de composição (moldura com legenda, ícone e feature graphic)
vivem no scratchpad da sessão de trabalho — se precisar refazer do zero:
capture as telas do jogo servido localmente com um perfil semeado
(Chrome headless, `--window-size=540,1170 --force-device-scale-factor=2
--virtual-time-budget=...`) e componha 1080×1920 com legenda em cima.
O processo completo está documentado no histórico da sessão de jul/2026;
os SVGs de origem (heróis/pets) estão em `assets/`.
