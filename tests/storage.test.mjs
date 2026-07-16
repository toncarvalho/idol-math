/**
 * Testes do Storage (rode com: node tests/storage.test.mjs).
 * Storage.js é um IIFE global que usa `localStorage`. Para testar no Node,
 * injetamos um mock de localStorage e carregamos o módulo via new Function.
 * Como o Storage lê o localStorage na inicialização, cada cenário cria uma
 * instância nova com seu próprio mock (permite testar migração).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(__dirname, "../js/core/Storage.js"), "utf8");
// globais usados pelo Storage: dados (roupas/conquistas/herois/JOGO) + MathEngine
const codeRoupas = readFileSync(join(__dirname, "../js/data/roupas.js"), "utf8");
const codeEfeitos = readFileSync(join(__dirname, "../js/data/efeitos.js"), "utf8");
const codePets = readFileSync(join(__dirname, "../js/data/pets.js"), "utf8");
const codeConq = readFileSync(join(__dirname, "../js/data/conquistas.js"), "utf8");
const codeHerois = readFileSync(join(__dirname, "../js/data/herois.js"), "utf8");
const codeFases = readFileSync(join(__dirname, "../js/data/fases.js"), "utf8");
const codeMath = readFileSync(join(__dirname, "../js/core/MathEngine.js"), "utf8");

function makeLS(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
    has: (k) => m.has(k),
  };
}
function loadStorage(ls) {
  // dados + MathEngine definem globais usados pelo Storage
  const bundle =
    codeHerois + "\n" + codeRoupas + "\n" + codeEfeitos + "\n" + codePets + "\n" +
    codeConq + "\n" + codeFases + "\n" + codeMath + "\n" + code + "\nreturn Storage;";
  return new Function("localStorage", bundle)(ls);
}

let falhas = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("  ✗", msg);
    falhas++;
  }
}

// 1) Estado inicial: sem perfis
{
  const ls = makeLS();
  const S = loadStorage(ls);
  ok(S.temPerfilAtual() === false, "fresh: sem perfil atual");
  ok(S.listarPerfis().length === 0, "fresh: lista de perfis vazia");
}

// 2) Criar perfil
{
  const ls = makeLS();
  const S = loadStorage(ls);
  const meta = S.criarPerfil("Ana", 3);
  ok(!!meta && meta.nome === "Ana", "criarPerfil retorna meta com nome");
  // id de perfil é string — a UI (data-perfil) depende disso; não pode ser
  // coagido com + (viraria NaN e a troca de jogador falha).
  ok(typeof meta.id === "string", "id de perfil é string");
  ok(S.perfilAtual().nome === "Ana", "perfil atual é Ana");
  ok(S.getHeroiId() === 3, "heroiId do perfil = 3");
  ok(ls.has(`idolmath.save.${meta.id}`), "save do perfil foi criado");
  ok(ls.has("idolmath.perfis.v1"), "índice de perfis foi gravado");
}

// 3) registrarResposta + estatísticas
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Bia", 1);
  S.registrarResposta(2, 3, true);
  S.registrarResposta(2, 4, true);
  S.registrarResposta(2, 5, true);
  S.registrarResposta(7, 8, false); // erro
  const e = S.estatisticas();
  ok(e.acertos === 3 && e.erros === 1, "estat conta 3 acertos / 1 erro");
  ok(e.precisao === 75, "precisão = 75%");
  ok(e.fraquezaTabuadas[7] > 0 && e.fraquezaTabuadas[8] > 0, "7 e 8 com fraqueza");
  ok(e.fraquezaTabuadas[2] === 0, "tabuada 2 sem fraqueza (só acertos)");
  ok(e.fatosFracos.includes("7×8"), "fatosFracos inclui 7×8");
  ok(e.maxFraqueza > 0, "maxFraqueza > 0");
}

// 4) adicionarTempo
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Cris", 1);
  S.adicionarTempo(5000);
  S.adicionarTempo(3000);
  ok(S.estatisticas().tempoMs === 8000, "tempo acumula (8000ms)");
  S.adicionarTempo(-50);
  ok(S.estatisticas().tempoMs === 8000, "tempo ignora valores negativos");
}

// 5) Isolamento entre perfis + troca
{
  const ls = makeLS();
  const S = loadStorage(ls);
  const ana = S.criarPerfil("Ana", 1);
  S.setEstrelas(1, 3);
  S.registrarResposta(9, 9, false);
  const bia = S.criarPerfil("Bia", 2); // novo perfil vira atual
  ok(S.totalEstrelas() === 0, "Bia começa sem estrelas (isolado)");
  ok(S.estatisticas().total === 0, "Bia começa sem estatísticas");
  S.selecionarPerfil(ana.id);
  ok(S.totalEstrelas() === 3, "Ana mantém 3 estrelas após voltar");
  ok(S.getHeroiId() === 1, "Ana mantém herói 1");
}

// 6) Remover perfil apaga o save
{
  const ls = makeLS();
  const S = loadStorage(ls);
  const ana = S.criarPerfil("Ana", 1);
  const key = `idolmath.save.${ana.id}`;
  ok(ls.has(key), "save existe antes de remover");
  S.removerPerfil(ana.id);
  ok(!ls.has(key), "save removido após removerPerfil");
  ok(S.listarPerfis().length === 0, "lista vazia após remover único perfil");
}

// 7) Config é global (persiste entre instâncias / perfis)
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  S.setConfig("voz", true);
  S.setConfig("musica", false);
  // nova instância lendo o MESMO localStorage
  const S2 = loadStorage(ls);
  ok(S2.getConfig().voz === true, "config voz persiste (global)");
  ok(S2.getConfig().musica === false, "config musica persiste (global)");
}

// 8) Migração do save antigo (v2, jogador único)
{
  const ls = makeLS({
    "idolmath.save.v2": JSON.stringify({
      melhorPontuacao: 1234,
      faseDesbloqueada: 6,
      heroiId: 4,
      estrelas: { 1: 3, 2: 2 },
      fatos: { "7x8": 4 },
      config: { musica: false, efeitos: true, timer: true, voz: true },
      bossRush: true,
    }),
  });
  const S = loadStorage(ls);
  ok(S.temPerfilAtual() === true, "migração: existe perfil atual");
  ok(S.listarPerfis().length === 1, "migração: 1 perfil criado");
  ok(S.getHeroiId() === 4, "migração: herói herdado (4)");
  ok(S.faseMax() === 6, "migração: fase herdada (6)");
  ok(S.totalEstrelas() === 5, "migração: estrelas herdadas (5)");
  ok(S.get().melhorPontuacao === 1234, "migração: recorde herdado");
  ok(S.bossRushDesbloqueado() === true, "migração: bossRush herdado");
  ok(S.getConfig().musica === false && S.getConfig().voz === true, "migração: config p/ global");
  ok(!ls.has("idolmath.save.v2"), "migração: save antigo removido");
}

// 8b) Progresso por MUNDO: a Tabuada segue no campo legado (saves antigos ok);
//     mundos futuros usam `mundos[mundoId]`; um não interfere no outro
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  ok(S.faseMax() === 1, "tabuada começa na fase 1");
  ok(S.faseMax("tabuada") === 1, "faseMax('tabuada') = faseMax()");
  ok(S.faseMax("soma") === 1, "mundo futuro começa na fase 1");
  S.desbloquearFase(5); // fase 5 da Tabuada (id numérico legado)
  ok(S.faseMax() === 5, "desbloquearFase avança a tabuada");
  ok(S.faseMax("soma") === 1, "tabuada não avança outros mundos");
  S.desbloquearFase(3);
  ok(S.faseMax() === 5, "desbloquear fase menor não regride");
  // save antigo (só faseDesbloqueada numérica) continua válido
  const raw = JSON.parse(ls.getItem(`idolmath.save.${S.perfilAtual().id}`));
  ok(raw.faseDesbloqueada === 5, "progresso da tabuada gravado no campo legado");
  // mundo da Divisão: progresso próprio (ids string), sem tocar na tabuada
  S.desbloquearFase("d2");
  ok(S.faseMax("divisao") === 2, "desbloquearFase('d2') avança a Divisão");
  ok(S.faseMax() === 5, "Divisão não mexe no progresso da tabuada");
  S.setEstrelas("d1", 3);
  ok(S.getEstrelas("d1") === 3, "estrelas por fase aceitam id string");
  const raw2 = JSON.parse(ls.getItem(`idolmath.save.${S.perfilAtual().id}`));
  ok(raw2.mundos && raw2.mundos.divisao === 2, "progresso da Divisão em mundos.divisao");
  ok(raw2.faseDesbloqueada === 5, "campo legado intacto após progresso na Divisão");
}

// 9) Moedas
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  ok(S.getMoedas() === 0, "moedas começam em 0");
  S.addMoedas(50);
  ok(S.getMoedas() === 50, "addMoedas soma");
  ok(S.gastarMoedas(30) === true && S.getMoedas() === 20, "gastarMoedas debita");
  ok(S.gastarMoedas(999) === false, "gastarMoedas falha sem saldo");
  ok(S.getMoedas() === 20, "saldo intacto após falha");
}

// 10) Roupas: equipar base, comprar e equipar
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Bia", 1); // herói 1 (Rubi)
  ok(S.roupaEquipada(1) === "heroi1", "roupa padrão = base do herói");
  ok(S.possuiRoupa("heroi1") === true, "base sempre possuída");
  ok(S.possuiRoupa("rubi-festa") === false, "roupa paga não possuída no início");
  ok(S.comprarRoupa(1, "rubi-festa", 60) === false, "compra falha sem moedas");
  S.addMoedas(100);
  ok(S.comprarRoupa(1, "rubi-festa", 60) === true, "compra ok com saldo");
  ok(S.getMoedas() === 40, "moedas debitadas na compra");
  ok(S.possuiRoupa("rubi-festa") === true, "passa a possuir a roupa");
  ok(S.roupaEquipada(1) === "rubi-festa", "compra já equipa");
  S.equiparRoupa(1, "heroi1");
  ok(S.roupaEquipada(1) === "heroi1", "pode reequipar a base");
  // comprar de novo (já possui) só equipa, sem cobrar
  ok(S.comprarRoupa(1, "rubi-festa", 60) === true && S.getMoedas() === 40, "reequipar não cobra");
}

// 10b) Efeitos de ataque: comprar, equipar, persistir
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  ok(S.efeitoEquipado() === "fx-raio", "efeito padrão = raio");
  ok(S.possuiEfeito("fx-raio") === true, "raio sempre possuído");
  ok(S.possuiEfeito("fx-coracao") === false, "efeito pago não possuído no início");
  ok(S.comprarEfeito("fx-coracao", 150) === false, "compra de efeito falha sem moedas");
  S.addMoedas(200);
  ok(S.comprarEfeito("fx-coracao", 150) === true, "compra de efeito ok com saldo");
  ok(S.getMoedas() === 50, "moedas debitadas na compra do efeito");
  ok(S.efeitoEquipado() === "fx-coracao", "compra já equipa o efeito");
  S.equiparEfeito("fx-raio");
  ok(S.efeitoEquipado() === "fx-raio", "pode reequipar o padrão");
  ok(S.comprarEfeito("fx-coracao", 150) === true && S.getMoedas() === 50, "reequipar efeito não cobra");
  // persiste entre instâncias (mesmo localStorage)
  const S2 = loadStorage(ls);
  ok(S2.efeitoEquipado() === "fx-coracao", "efeito equipado persiste");
  ok(S2.possuiEfeito("fx-coracao") === true, "efeito possuído persiste");
}

// 10c) Roupa-troféu: requisito bloqueia a compra mesmo com saldo
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Bia", 1);
  S.addMoedas(1000);
  ok(S.requisitoRoupaOk("rubi-festa") === true, "roupa sem requisito sempre ok");
  ok(S.requisitoRoupaOk("rubi-dourada") === false, "troféu bloqueado no início");
  ok(S.comprarRoupa(1, "rubi-dourada", 300) === false, "compra bloqueada pelo requisito");
  ok(S.getMoedas() === 1000, "saldo intacto na compra bloqueada");
  for (let f = 1; f <= 12; f++) S.setEstrelas(f, 3); // 36 estrelas
  ok(S.requisitosSnapshot().totalEstrelas === 36, "snapshot reflete as estrelas");
  ok(S.requisitoRoupaOk("rubi-dourada") === true, "requisito cumprido (36 ⭐)");
  ok(S.comprarRoupa(1, "rubi-dourada", 300) === true, "compra ok após cumprir o requisito");
  ok(S.getMoedas() === 700, "debita o preço do troféu");
}

// 10d) requisitoAtendido (pura, todos os tipos de requisito)
{
  const { getRoupa: gr, requisitoAtendido: ra } = new Function(
    codeRoupas + "\nreturn { getRoupa, requisitoAtendido };"
  )();
  ok(ra(gr("rubi-festa"), {}) === true, "sem requisito passa");
  ok(ra(gr("rubi-dourada"), { totalEstrelas: 36 }) === true, "estrelas: cumpre");
  ok(ra(gr("rubi-dourada"), { totalEstrelas: 35 }) === false, "estrelas: não cumpre");
  ok(ra(gr("lorena-dourada"), { bossRush: true }) === true, "bossRush: cumpre");
  ok(ra(gr("lorena-dourada"), {}) === false, "bossRush: não cumpre");
  ok(ra(gr("mel-dourada"), { melhorOfensiva: 7 }) === true, "ofensiva: cumpre");
  ok(ra(gr("mel-dourada"), { melhorOfensiva: 6 }) === false, "ofensiva: não cumpre");
  ok(ra(gr("leo-dourada"), { maxCombo: 15 }) === true, "combo: cumpre");
  ok(ra(gr("priya-dourada"), { acertos: 300 }) === true, "acertos: cumpre");
  ok(ra(gr("priya-dourada"), { acertos: 299 }) === false, "acertos: não cumpre");
}

// 10e) Pets: desbloqueio via conquista, equipar/desequipar, persistência
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  ok(S.petEquipado() === null, "sem pet equipado no início");
  ok(S.petDesbloqueado("mimi") === false, "pet bloqueado sem a conquista");
  ok(S.equiparPet("mimi") === false, "não equipa pet bloqueado");
  ok(S.petEquipado() === null, "segue sem pet após tentativa inválida");
  // desbloqueia a conquista "estreia" (vencer a 1ª fase) → adota a Mimi
  S.desbloquearFase(2);
  S.avaliarConquistas({ venceu: true });
  ok(S.petDesbloqueado("mimi") === true, "conquista desbloqueia o pet");
  ok(S.equiparPet("mimi") === true, "equipa pet desbloqueado");
  ok(S.petEquipado() === "mimi", "pet equipado registrado");
  // persiste entre instâncias
  const S2 = loadStorage(ls);
  ok(S2.petEquipado() === "mimi", "pet equipado persiste");
  // desequipar (jogar sem pet) é válido
  ok(S2.equiparPet(null) === true, "desequipar retorna true");
  ok(S2.petEquipado() === null, "desequipado");
  ok(S2.equiparPet("inexistente") === false, "pet inexistente não equipa");
}

// 10f) Dados dos PETS: 1 pet por conquista, poderes conhecidos
{
  const { PETS: P, CONQUISTAS: C } = new Function(
    codePets + "\n" + codeConq + "\nreturn { PETS, CONQUISTAS };"
  )();
  const tipos = [
    "moedasVitoria", "congelaTempo", "guardaCombo", "tempoExtra", "escudoInicial",
    "dica5050", "moedasAcerto", "danoChefao", "vidaExtra", "reviver",
  ];
  ok(P.length === C.length, "há exatamente 1 pet por conquista");
  const conquistaIds = new Set(C.map((c) => c.id));
  const vistos = new Set();
  P.forEach((p) => {
    ok(conquistaIds.has(p.conquistaId), `pet ${p.id}: conquista "${p.conquistaId}" existe`);
    ok(!vistos.has(p.conquistaId), `pet ${p.id}: conquista sem pet duplicado`);
    vistos.add(p.conquistaId);
    ok(tipos.includes(p.poder.tipo), `pet ${p.id}: poder "${p.poder.tipo}" conhecido`);
    ok(!!p.nome && !!p.emoji && !!p.poderDesc, `pet ${p.id}: dados completos`);
  });
}

// 11) Conquistas: avaliar desbloqueia + credita uma vez
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Cris", 1);
  // condições: faseMax>=2 (estreia,+20) e maxCombo>=10 (combo10,+30)
  S.desbloquearFase(2);
  S.registrarFimDePartida({ maxCombo: 12, semErro: true, venceu: true });
  const novas = S.avaliarConquistas({ venceu: true });
  const ids = novas.map((c) => c.id);
  ok(ids.includes("estreia"), "desbloqueia 'estreia'");
  ok(ids.includes("combo10"), "desbloqueia 'combo10'");
  ok(ids.includes("perfeito"), "desbloqueia 'perfeito' (vitória sem erro)");
  ok(S.getMoedas() >= 20 + 30 + 40, "recompensas creditadas");
  const moedasAntes = S.getMoedas();
  const novas2 = S.avaliarConquistas({ venceu: true });
  ok(novas2.length === 0, "não desbloqueia de novo");
  ok(S.getMoedas() === moedasAntes, "não credita de novo");
  ok(!!S.conquistasDesbloqueadas().estreia, "fica registrada como desbloqueada");
}

// 12) Desafio diário + ofensiva (datas injetadas)
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  ok(S.ofensivaAtual("2026-01-10") === 0, "ofensiva inicial = 0");

  const r1 = S.registrarDesafioDiario("2026-01-10");
  ok(r1.ja === false && r1.ofensiva === 1, "1º dia: ofensiva 1");
  ok(r1.recompensa === 35, "1º dia: recompensa 30+5");
  ok(S.getMoedas() === 35, "moedas creditadas no 1º dia");
  ok(S.desafioFeitoHoje("2026-01-10") === true, "feito hoje");

  const r1b = S.registrarDesafioDiario("2026-01-10");
  ok(r1b.ja === true && r1b.recompensa === 0, "mesmo dia: não recompensa");
  ok(S.getMoedas() === 35, "saldo intacto ao repetir no mesmo dia");

  const r2 = S.registrarDesafioDiario("2026-01-11");
  ok(r2.ofensiva === 2, "dia seguinte: ofensiva 2");
  ok(r2.recompensa === 40, "dia 2: recompensa 30+10");

  // pula um dia (13, sem o 12) → reseta para 1
  const r3 = S.registrarDesafioDiario("2026-01-13");
  ok(r3.ofensiva === 1, "pular dia reinicia a ofensiva");
  ok(S.melhorOfensiva() === 2, "melhor ofensiva preservada (2)");

  // ofensiva 'viva' ontem ainda conta hoje; quebrada se mais antiga
  ok(S.ofensivaAtual("2026-01-14") === 1, "ofensiva viva no dia seguinte");
  ok(S.ofensivaAtual("2026-01-20") === 0, "ofensiva quebrada após dias parados");
}

// 13) Backup: exportar/importar (restauração completa em outro "aparelho")
{
  const ls = makeLS();
  const S = loadStorage(ls);
  const ana = S.criarPerfil("Ana", 2);
  S.setEstrelas(1, 3);
  S.addMoedas(77);
  S.criarPerfil("Bia", 1); // Bia vira o perfil atual
  S.setConfig("voz", true);

  const backup = S.exportarTudo();
  ok(backup.formato === "idolmath-backup", "backup tem o formato esperado");
  ok(backup.versao === 1, "backup tem versão");
  ok(Object.keys(backup.saves).length === 2, "backup contém os 2 saves");

  // restaura num localStorage limpo (outro aparelho)
  const ls2 = makeLS();
  const S2 = loadStorage(ls2);
  const r = S2.importarTudo(backup);
  ok(r.ok === true && r.perfis === 2, "importa os 2 perfis");
  ok(S2.listarPerfis().length === 2, "perfis restaurados");
  ok(S2.perfilAtual().nome === "Bia", "perfil atual preservado (Bia)");
  S2.selecionarPerfil(ana.id);
  ok(S2.totalEstrelas() === 3, "estrelas da Ana restauradas");
  ok(S2.getMoedas() === 77, "moedas da Ana restauradas");
  ok(S2.getConfig().voz === true, "config restaurada");

  // importar substitui os perfis existentes (e apaga os saves antigos)
  const ls3 = makeLS();
  const S3 = loadStorage(ls3);
  const velho = S3.criarPerfil("Velho", 1);
  const r3 = S3.importarTudo(backup);
  ok(r3.ok === true && S3.listarPerfis().length === 2, "substitui os perfis atuais");
  ok(!ls3.has(`idolmath.save.${velho.id}`), "save antigo removido na importação");

  // validação de formato
  ok(S2.importarTudo(null).ok === false, "rejeita null");
  ok(S2.importarTudo({}).ok === false, "rejeita objeto sem formato");
  ok(
    S2.importarTudo({ formato: "idolmath-backup", perfis: { perfis: [] } }).ok === false,
    "rejeita backup sem perfis"
  );
  ok(S2.listarPerfis().length === 2, "dados intactos após importações inválidas");
}

// 14) onFalhaGravacao: avisa quando o setItem falha
{
  const ls = makeLS();
  const S = loadStorage(ls);
  S.criarPerfil("Ana", 1);
  let avisos = 0;
  S.onFalhaGravacao(() => avisos++);
  ls.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  S.addMoedas(10);
  ok(avisos === 1, "callback de falha de gravação é chamado");
}

if (falhas === 0) console.log("✅ Storage: todos os testes passaram.");
else {
  console.error(`❌ Storage: ${falhas} falha(s).`);
  process.exit(1);
}
