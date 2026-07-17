# Trilhas de música — origem e licenças

As três trilhas em `assets/musica/` vêm do OpenGameArt.org sob **licença CC0
(domínio público)**: uso comercial permitido, perpétuo, sem exigência de
atribuição — os créditos abaixo ficam registrados por cortesia e para a
diligência de publicação (Google Play).

| Arquivo | Toca em | Obra original | Autor | Fonte (baixada em 17/07/2026) |
| --- | --- | --- | --- | --- |
| `menu.mp3` | Menus/telas | "Menu Music" (`awesomeness.wav`) | mrpoly | <https://opengameart.org/content/menu-music> |
| `jogo.mp3` | Fases e treino | "Fast fight / battle music (looped)" (`fight_looped.wav`) | XCVG | <https://opengameart.org/content/fast-fight-battle-music-looped> |
| `chefao.mp3` | Chefão e Boss Rush | "Boss Battle #2 [Symphonic Metal]" (`boss_battle_#2_metal_loop.wav`) | nene | <https://opengameart.org/content/boss-battle-2-symphonic-metal> |

## Como os MP3 foram gerados

Os originais são WAV (PCM 16-bit estéreo 44,1 kHz). Conversão para MP3
160 kbps com [lamejs], normalizando o volume entre as trilhas (RMS alvo de
−16 dBFS, limitado pelo pico para não clipar) — sem isso a trilha de fase
soava muito mais alta que as outras. Do pacote do chefão foi usada a versão
`loop` (sem a introdução), própria para tocar em círculo.

Para trocar uma trilha: salvar o novo MP3 com o mesmo nome em
`assets/musica/`, registrar origem/licença aqui e subir a versão do `CACHE`
no `sw.js`. Preferir loops de 25–50 s, licença perpétua para uso comercial
(CC0/domínio público; evitar licença por assinatura) e MP3 (o Safari não
decodifica OGG no Web Audio).

## Como o jogo toca (js/core/Audio.js)

`AudioFX` baixa e decodifica cada trilha uma vez (`fetch` +
`decodeAudioData`), toca em loop contínuo aparando o silêncio que o encoder
MP3 adiciona nas pontas (senão o loop "engasga"), e troca de trilha por
contexto: `menu` nas telas, `jogo` nas fases/treino, `chefao` quando o chefão
entra (e no Boss Rush). Se o arquivo não carregar ou não decodificar, o
sequenciador synth original assume como fallback — a música nunca "some" por
falha de rede.

[lamejs]: https://www.npmjs.com/package/lamejs
