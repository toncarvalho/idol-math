/**
 * Service Worker — cache do app shell para o jogo funcionar 100% offline
 * e carregar rápido. Estratégia cache-first com fallback de rede.
 */
const CACHE = "idolmath-v28";
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "css/ui.css",
  "vendor/phaser.min.js",
  "js/main.js",
  "js/ui/screens.js",
  "js/ui/gameui.js",
  "js/core/Storage.js",
  "js/core/MathEngine.js",
  "js/core/Regras.js",
  "js/core/Audio.js",
  "js/core/UI.js",
  "js/core/Util.js",
  "js/data/fases.js",
  "js/data/herois.js",
  "js/data/roupas.js",
  "js/data/efeitos.js",
  "js/data/conquistas.js",
  "js/data/pets.js",
  "js/scenes/BootScene.js",
  "js/scenes/GameScene.js",
  "js/scenes/TrainScene.js",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/apple-touch-icon.png",
  "assets/herois/rubi.svg",
  "assets/herois/rubi-festa.svg",
  "assets/herois/rubi-inverno.svg",
  "assets/herois/rubi-neon.svg",
  "assets/herois/rubi-dourada.svg",
  "assets/herois/lorena.svg",
  "assets/herois/lorena-rock.svg",
  "assets/herois/lorena-esporte.svg",
  "assets/herois/lorena-galaxia.svg",
  "assets/herois/lorena-dourada.svg",
  "assets/herois/mel.svg",
  "assets/herois/mel-diva.svg",
  "assets/herois/mel-verao.svg",
  "assets/herois/mel-pop.svg",
  "assets/herois/mel-dourada.svg",
  "assets/herois/leo.svg",
  "assets/herois/leo-aventura.svg",
  "assets/herois/leo-gamer.svg",
  "assets/herois/leo-astro.svg",
  "assets/herois/leo-dourada.svg",
  "assets/herois/priya.svg",
  "assets/herois/priya-festival.svg",
  "assets/herois/priya-esporte.svg",
  "assets/herois/priya-show.svg",
  "assets/herois/priya-dourada.svg",
  "assets/pets/pet-mimi.svg",
  "assets/pets/pet-tato.svg",
  "assets/pets/pet-pipoca.svg",
  "assets/pets/pet-sofia.svg",
  "assets/pets/pet-rex.svg",
  "assets/pets/pet-bis.svg",
  "assets/pets/pet-zum.svg",
  "assets/pets/pet-faisca.svg",
  "assets/pets/pet-majestade.svg",
  "assets/pets/pet-luna.svg",
  "assets/inimigos/inimigo-1.svg",
  "assets/inimigos/boss-1.svg",
  "assets/inimigos/inimigo-2.svg",
  "assets/inimigos/boss-2.svg",
  "assets/inimigos/inimigo-3.svg",
  "assets/inimigos/boss-3.svg",
  "assets/inimigos/inimigo-4.svg",
  "assets/inimigos/boss-4.svg",
  "assets/inimigos/inimigo-5.svg",
  "assets/inimigos/boss-5.svg",
  "assets/inimigos/inimigo-6.svg",
  "assets/inimigos/boss-6.svg",
  "assets/inimigos/inimigo-7.svg",
  "assets/inimigos/boss-7.svg",
  "assets/inimigos/inimigo-8.svg",
  "assets/inimigos/boss-8.svg",
  "assets/inimigos/inimigo-9.svg",
  "assets/inimigos/boss-9.svg",
  "assets/inimigos/inimigo-10.svg",
  "assets/inimigos/boss-10.svg",
  "assets/inimigos/inimigo-11.svg",
  "assets/inimigos/boss-11.svg",
  "assets/inimigos/inimigo-12.svg",
  "assets/inimigos/boss-12.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // resiliente: não falha tudo se um arquivo faltar
      Promise.allSettled(ASSETS.map((u) => cache.add(u)))
    )
  );
  // Sem skipWaiting() automático: a versão nova fica em "waiting" e a página
  // mostra um banner "Atualizar". Ativar só quando o jogador tocar evita
  // recarregar a página no meio de uma partida.
});

// A página pede a ativação (banner "Atualizar" tocado)
self.addEventListener("message", (e) => {
  if (e.data && e.data.tipo === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// "App shell" (código): rede-primeiro p/ pegar atualização; cache como fallback
// offline. Estáticos pesados (phaser, svg, imagens): cache-primeiro (rápido).
function ehCodigo(req) {
  if (req.mode === "navigate") return true;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return false;
  return /\.(?:html|js|css|json)$/.test(url.pathname) || url.pathname === "/";
}

function guardar(req, resp) {
  if (resp && resp.ok && req.url.startsWith(self.location.origin)) {
    const copy = resp.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return resp;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const req = e.request;

  if (ehCodigo(req)) {
    // network-first
    e.respondWith(
      fetch(req)
        .then((resp) => guardar(req, resp))
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("index.html"))
        )
    );
    return;
  }

  // cache-first (estáticos)
  e.respondWith(
    caches.match(req).then(
      (hit) => hit || fetch(req).then((resp) => guardar(req, resp)).catch(() => hit)
    )
  );
});
