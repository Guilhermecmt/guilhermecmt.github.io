// GuiOs 26x.04p: gerenciador de janelas e o resto do comportamento da área de trabalho.
// Mistura três sistemas: a pele do Windows XP; o jeito de usar do Mac (Dock com lupa, busca,
// espiar, visão de todas as janelas, minimizar para o Dock); e o Linux (terminal bash, áreas de
// trabalho, Alt+arrastar, mensagens do systemd e o pinguim). No celular, vira uma tela de iPhone.

interface Projeto {
  slug: string;
  titulo: string;
  resumo: string;
  tipo: string;
  situacao: string;
  codigo: 'privado' | 'aberto' | 'empresa';
  stack: string[];
  demo: string | null;
  repo: string | null;
  capa: string | null;
  capaAlt: string;
}

interface Dados {
  nome: string;
  papel: string;
  email: string;
  github: string;
  linkedin: string;
  projetos: Projeto[];
}

type Geo = { x: number; y: number; w: number; h: number };

interface Janela {
  id: string;
  el: HTMLElement;
  aberta: boolean;
  min: boolean;
  max: boolean;
  area: number;
  geo: Geo | null;
  antes: Geo | null;
}

const $ = <T extends Element = HTMLElement>(sel: string, raiz: ParentNode = document) => raiz.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(sel)];

const raiz = document.documentElement;
const os = $('#os')!;
const dados: Dados = JSON.parse($('#os-dados')!.textContent || '{}');
const porSlug = new Map(dados.projetos.map((p) => [p.slug, p]));

const movel = matchMedia('(max-width: 759px)');
const prefereEscuro = matchMedia('(prefers-color-scheme: dark)');
const prefereReduzir = matchMedia('(prefers-reduced-motion: reduce)');

const MENU_H = 28;
const DOCK_H = 86;

const local = {
  ler(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  gravar(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

const sessao = {
  ler(k: string) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  gravar(k: string, v: string | null) {
    try {
      if (v === null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, v);
    } catch {}
  },
};

const semMovimento = () => prefereReduzir.matches || raiz.dataset.movimento === 'reduzido';
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const limitarNum = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const icone = (id: string) => `<span class="ic-box" aria-hidden="true"><svg class="ic"><use href="#${id}"></use></svg></span>`;

let ultimoPonteiro = 'mouse';
document.addEventListener('pointerdown', (e) => (ultimoPonteiro = e.pointerType), true);

/* ============================================================
   Janelas
   ============================================================ */

const janelas = new Map<string, Janela>();
for (const el of $$('.janela')) {
  const id = el.dataset.janela!;
  janelas.set(id, { id, el, aberta: false, min: false, max: false, area: 1, geo: null, antes: null });
}

let zTopo = 20;
let ativa: string | null = null;
let areaAtual = 1;

function area(): Geo {
  const y = MENU_H + 6;
  return { x: 6, y, w: innerWidth - 12, h: innerHeight - y - DOCK_H };
}

const visiveis = () => [...janelas.values()].filter((j) => j.aberta && !j.min && j.area === areaAtual);
const porZ = (lista: Janela[]) => lista.sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex));

function enquadrar(g: Geo): Geo {
  const a = area();
  const w = Math.min(g.w, a.w);
  const h = g.h ? Math.min(g.h, a.h) : 0;
  return {
    w,
    h,
    x: limitarNum(g.x, a.x, a.x + a.w - w),
    y: limitarNum(g.y, a.y, a.y + a.h - (h || 220)),
  };
}

function geoPadrao(j: Janela): Geo {
  const a = area();
  const w = Math.min(Number(j.el.dataset.w) || 640, a.w);
  const h = j.el.dataset.h === 'auto' ? 0 : Math.min(Number(j.el.dataset.h) || 480, a.h);
  const desloc = (visiveis().length % 5) * 26;
  return enquadrar({
    w,
    h,
    x: Math.round(a.x + (a.w - w) / 2 + desloc + 20),
    y: Math.round(a.y + Math.max(0, (a.h - (h || 220)) / 2 - 24) + desloc * 0.7),
  });
}

function areaMax(): Geo {
  return area();
}

function aplicar(j: Janela) {
  const g = j.geo!;
  const s = j.el.style;
  s.left = `${g.x}px`;
  s.top = `${g.y}px`;
  s.width = `${g.w}px`;
  s.height = g.h ? `${g.h}px` : '';
}

function itemDock(id: string) {
  const item = $(`.dock-item[data-alvo="${id}"]`);
  return item && !item.hidden && item.getClientRects().length ? item : null;
}

function focar(id: string, op: { semUrl?: boolean } = {}) {
  const j = janelas.get(id);
  if (!j || !j.aberta) return;
  if (ativa !== id || Number(j.el.style.zIndex) < zTopo) j.el.style.zIndex = String(++zTopo);
  for (const o of janelas.values()) o.el.classList.toggle('ativa', o === j);
  ativa = id;
  atualizarBarra();
  if (!op.semUrl) sincronizarUrl(false);
}

function focarTopo() {
  const topo = porZ(visiveis())[0];
  if (topo) {
    focar(topo.id);
    return;
  }
  ativa = null;
  for (const j of janelas.values()) j.el.classList.remove('ativa');
  atualizarBarra();
  sincronizarUrl(false);
}

function animarEntrada(el: HTMLElement, origem?: Element | null) {
  if (semMovimento()) return;
  const r = el.getBoundingClientRect();
  if (origem && origem.isConnected && origem.getClientRects().length) {
    const o = origem.getBoundingClientRect();
    const sx = Math.max(o.width / r.width, 0.04);
    const sy = Math.max(o.height / r.height, 0.04);
    const dx = o.left + o.width / 2 - (r.left + r.width / 2);
    const dy = o.top + o.height / 2 - (r.top + r.height / 2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.25 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1.04)' },
    );
  } else {
    el.animate([{ transform: 'scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
      duration: 220,
      easing: 'cubic-bezier(.2,.9,.3,1)',
    });
  }
}

// A "lâmpada mágica" do Mac: a janela afina e escorre para o ícone do Dock.
function animarGenio(el: HTMLElement, alvo: DOMRect, inverso = false) {
  const r = el.getBoundingClientRect();
  const s = Math.max(alvo.width / r.width, 0.04);
  const dx = alvo.left + alvo.width / 2 - (r.left + r.width / 2);
  const dy = alvo.top + alvo.height / 2 - (r.top + r.height / 2);
  const quadros: Keyframe[] = [
    { transform: 'none', opacity: 1, offset: 0 },
    { transform: `translate(${dx * 0.16}px, ${dy * 0.42}px) scale(.6, .82)`, opacity: 0.95, offset: 0.42 },
    { transform: `translate(${dx}px, ${dy}px) scale(${s}, ${s * 0.5})`, opacity: 0, offset: 1 },
  ];
  const sequencia = inverso ? quadros.map((q) => ({ ...q, offset: 1 - (q.offset as number) })).reverse() : quadros;
  return el.animate(sequencia, {
    duration: 460,
    easing: inverso ? 'cubic-bezier(.2,.8,.3,1)' : 'cubic-bezier(.6,0,.8,.3)',
  });
}

function alvoDock(id: string): DOMRect {
  const item = itemDock(id);
  if (item) return item.getBoundingClientRect();
  return new DOMRect(innerWidth / 2 - 22, innerHeight - 52, 44, 44);
}

function abrir(id: string, origem?: Element | null, op: { semUrl?: boolean; geo?: Geo } = {}) {
  const j = janelas.get(id);
  if (!j) return;
  fecharPopovers();
  if (mcAtivo) sairMc();
  if (j.aberta && j.area !== areaAtual) irParaArea(j.area);
  if (j.aberta && j.min) {
    restaurar(j);
    return;
  }
  if (j.aberta) {
    focar(id, op);
    return;
  }

  if (movel.matches) esconderBalao();
  j.area = areaAtual;
  j.el.classList.remove('outra-area');
  j.aberta = true;
  j.min = false;
  j.geo = j.max ? areaMax() : enquadrar(op.geo ?? j.geo ?? geoPadrao(j));
  aplicar(j);
  j.el.classList.add('aberta');
  j.el.classList.remove('minimizada');

  // Caixas de altura automática ficam centralizadas depois de medidas.
  if (!j.geo.h) {
    const a = area();
    j.geo.y = Math.round(a.y + Math.max(0, (a.h - j.el.offsetHeight) / 2 - 30));
    aplicar(j);
  }

  focar(id, { semUrl: true });
  atualizarDock();
  animarEntrada(j.el, origem);
  pular(id);
  if (!op.semUrl) sincronizarUrl(true);

  const campo = id === 'terminal' ? $<HTMLInputElement>('[data-entrada] input', j.el) : null;
  if (campo && !movel.matches) campo.focus({ preventScroll: true });
  else if (id === 'dialogo') $<HTMLButtonElement>('.dialogo-acoes .xp-btn', j.el)?.focus({ preventScroll: true });
  else j.el.focus({ preventScroll: true });
}

function restaurar(j: Janela) {
  j.min = false;
  j.el.classList.remove('minimizada');
  focar(j.id);
  atualizarDock();
  if (!semMovimento()) animarGenio(j.el, alvoDock(j.id), true);
}

function fechar(id?: string | null, op: { semUrl?: boolean; semAnim?: boolean } = {}) {
  const j = id ? janelas.get(id) : null;
  if (!j || !j.aberta) return;
  j.aberta = false;
  const fim = () => {
    if (j.aberta) return;
    j.el.classList.remove('aberta', 'ativa', 'minimizada', 'outra-area');
    j.min = false;
  };
  if (op.semAnim || semMovimento() || j.min) fim();
  else
    j.el
      .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.95)' }], {
        duration: 160,
        easing: 'ease-in',
      })
      .finished.then(fim, fim);
  atualizarDock();
  if (ativa === j.id) {
    ativa = null;
    const topo = porZ(visiveis())[0];
    if (topo) focar(topo.id, { semUrl: true });
    else atualizarBarra();
  }
  if (!op.semUrl) sincronizarUrl(false);
}

function fecharTodas(semAnim = false) {
  for (const j of janelas.values()) if (j.aberta) fechar(j.id, { semUrl: true, semAnim });
  sincronizarUrl(false);
}

function minimizar(id?: string | null) {
  const j = id ? janelas.get(id) : null;
  if (!j || !j.aberta || j.min || movel.matches) return;
  j.min = true;
  const fim = () => {
    if (j.min) j.el.classList.add('minimizada');
  };
  if (semMovimento()) fim();
  else animarGenio(j.el, alvoDock(j.id)).finished.then(fim, fim);
  if (ativa === j.id) {
    ativa = null;
    focarTopo();
  }
  atualizarDock();
}

function transicionar(j: Janela) {
  if (semMovimento()) {
    aplicar(j);
    return;
  }
  j.el.classList.add('transicao');
  aplicar(j);
  setTimeout(() => j.el.classList.remove('transicao'), 320);
}

function zoom(id?: string | null) {
  const j = id ? janelas.get(id) : null;
  if (!j || !j.aberta || movel.matches || j.el.dataset.h === 'auto') return;
  if (j.max) {
    j.geo = enquadrar(j.antes ?? geoPadrao(j));
    j.max = false;
  } else {
    j.antes = { ...j.geo! };
    j.geo = areaMax();
    j.max = true;
  }
  j.el.classList.toggle('maximizada', j.max);
  transicionar(j);
}

/* Áreas de trabalho (quatro, como num painel de Linux) */

function irParaArea(n: number) {
  if (n === areaAtual || n < 1 || n > 4 || movel.matches) return;
  const direcao = n > areaAtual ? 1 : -1;
  if (mcAtivo) sairMc();
  areaAtual = n;
  for (const j of janelas.values()) j.el.classList.toggle('outra-area', j.aberta && j.area !== n);
  for (const b of $$('[data-areas] button')) b.setAttribute('aria-pressed', String(b.dataset.cmd === `area:${n}`));
  ativa = null;
  focarTopo();
  atualizarDock();
  if (!semMovimento())
    $('.janelas')!.animate([{ transform: `translateX(${direcao * 70}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], {
      duration: 280,
      easing: 'cubic-bezier(.2,.9,.3,1)',
    });
}

function moverParaArea(id: string | null, n: number) {
  const j = id ? janelas.get(id) : null;
  if (!j || !j.aberta || n < 1 || n > 4) return;
  j.area = n;
  j.el.classList.toggle('outra-area', n !== areaAtual);
  if (ativa === j.id && n !== areaAtual) {
    ativa = null;
    focarTopo();
  }
  atualizarDock();
}

function atualizarAreas() {
  for (const b of $$('[data-areas] button')) {
    const n = Number(b.dataset.cmd!.split(':')[1]);
    b.classList.toggle('ocupada', [...janelas.values()].some((j) => j.aberta && j.area === n));
  }
}

/* Arrastar e redimensionar */

function arrastar(ev: PointerEvent, j: Janela, alca: HTMLElement, modo: 'mover' | 'redim') {
  ev.preventDefault();
  const sx = ev.clientX;
  const sy = ev.clientY;
  let g0: Geo = { ...j.geo!, h: j.geo!.h || j.el.offsetHeight };
  let moveu = false;
  alca.setPointerCapture(ev.pointerId);

  const mover = (m: PointerEvent) => {
    const dx = m.clientX - sx;
    const dy = m.clientY - sy;
    if (!moveu && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!moveu && j.max) {
      // Arrastar uma janela em zoom devolve o tamanho anterior, com o cursor no mesmo ponto da barra.
      const antes = j.antes ?? geoPadrao(j);
      const prop = (sx - j.geo!.x) / j.geo!.w;
      j.max = false;
      j.el.classList.remove('maximizada');
      g0 = { ...antes, x: sx - antes.w * prop, y: j.geo!.y };
    }
    moveu = true;
    if (modo === 'mover') {
      j.geo = {
        ...g0,
        h: j.el.dataset.h === 'auto' ? 0 : g0.h,
        x: limitarNum(g0.x + dx, 110 - g0.w, innerWidth - 110),
        y: limitarNum(g0.y + dy, MENU_H, innerHeight - 70),
      };
    } else {
      j.geo = { ...g0, w: Math.max(320, g0.w + dx), h: Math.max(200, g0.h + dy) };
    }
    aplicar(j);
  };
  const soltar = () => {
    alca.removeEventListener('pointermove', mover);
    alca.removeEventListener('pointerup', soltar);
    alca.removeEventListener('pointercancel', soltar);
  };
  alca.addEventListener('pointermove', mover);
  alca.addEventListener('pointerup', soltar);
  alca.addEventListener('pointercancel', soltar);
}

os.addEventListener('pointerdown', (ev) => {
  const alvo = ev.target as Element;
  const jEl = alvo.closest<HTMLElement>('.janela');
  if (!jEl || mcAtivo) return;
  const j = janelas.get(jEl.dataset.janela!)!;
  if (ativa !== j.id) focar(j.id);
  if (movel.matches || ev.button !== 0) return;
  if (ev.altKey && !alvo.closest('input, textarea')) {
    arrastar(ev, j, j.el, 'mover');
    return;
  }
  const barra = alvo.closest<HTMLElement>('.janela-barra');
  const alca = alvo.closest<HTMLElement>('.janela-alca');
  if (barra && !alvo.closest('button')) arrastar(ev, j, barra, 'mover');
  else if (alca && j.el.dataset.h !== 'auto') arrastar(ev, j, alca, 'redim');
});

os.addEventListener('dblclick', (ev) => {
  const alvo = ev.target as Element;
  const barra = alvo.closest('.janela-barra');
  if (barra && !alvo.closest('button')) zoom(barra.closest<HTMLElement>('.janela')!.dataset.janela);
});

let ajusteAgendado = false;
addEventListener('resize', () => {
  if (ajusteAgendado) return;
  ajusteAgendado = true;
  requestAnimationFrame(() => {
    ajusteAgendado = false;
    if (mcAtivo) sairMc();
    for (const j of janelas.values()) {
      if (!j.aberta || !j.geo) continue;
      j.geo = j.max ? areaMax() : enquadrar(j.geo);
      aplicar(j);
    }
  });
});

/* ============================================================
   Endereço: cada projeto tem URL própria (/projetos/<slug>/)
   ============================================================ */

function urlDe(id: string | null) {
  return (id && janelas.get(id)?.el.dataset.url) || '/';
}

function sincronizarUrl(novo: boolean) {
  const j = ativa ? janelas.get(ativa) : null;
  const url = urlDe(ativa);
  document.title = j?.el.dataset.url ? `${j.el.dataset.titulo} · ${dados.nome}` : `${dados.nome} · ${dados.papel}`;
  if (location.pathname === url) return;
  history[novo ? 'pushState' : 'replaceState'](null, '', url);
}

addEventListener('popstate', () => {
  const m = location.pathname.match(/^\/projetos\/([^/]+)\/?$/);
  const id = m ? `projeto-${m[1]}` : null;
  if (id && janelas.has(id)) {
    abrir(id, null, { semUrl: true });
    return;
  }
  for (const j of janelas.values()) if (j.aberta && j.el.dataset.url) fechar(j.id, { semUrl: true });
});

/* ============================================================
   Barra de menus, menus e popovers
   ============================================================ */

const nomeApp = $('[data-app-nome]')!;

function atualizarBarra() {
  const j = ativa ? janelas.get(ativa) : null;
  nomeApp.textContent = j?.el.dataset.app ?? 'Explorador';
}

function popoverDe(btn: Element) {
  const id = btn.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}

function fecharPopovers() {
  for (const b of $$('[data-pop][aria-expanded="true"]')) {
    b.setAttribute('aria-expanded', 'false');
    const p = popoverDe(b);
    if (p) p.hidden = true;
  }
}

function abrirPopover(btn: HTMLElement) {
  const p = popoverDe(btn);
  if (!p) return;
  btn.setAttribute('aria-expanded', 'true');
  p.hidden = false;
  if (p.classList.contains('menu-lista')) {
    const r = btn.getBoundingClientRect();
    p.style.left = `${Math.max(4, Math.min(r.left, innerWidth - p.offsetWidth - 6))}px`;
  }
  for (const b of $$<HTMLButtonElement>('[data-requer-janela]', p)) b.disabled = !ativa;
  if (p.id === 'menu-janela') preencherMenuJanela();
  if (p.id === 'central') sincronizarCentral();
}

function alternarPopover(btn: HTMLElement) {
  const aberto = btn.getAttribute('aria-expanded') === 'true';
  fecharPopovers();
  if (!aberto) abrirPopover(btn);
}

// Como no Mac: com um menu aberto, passar o mouse em outro título troca de menu.
for (const b of $$('.barra-menu [data-pop]')) {
  b.addEventListener('pointerenter', () => {
    const algum = $('.barra-menu [data-pop][aria-expanded="true"]');
    if (algum && algum !== b && popoverDe(algum)?.classList.contains('menu-lista') && popoverDe(b)?.classList.contains('menu-lista')) {
      fecharPopovers();
      abrirPopover(b);
    }
  });
}

function preencherMenuJanela() {
  const lista = $('[data-lista-janelas]')!;
  const abertas = [...janelas.values()].filter((j) => j.aberta);
  if (!abertas.length) {
    lista.innerHTML = '<button type="button" disabled>Nenhuma janela aberta</button>';
    return;
  }
  lista.innerHTML = abertas
    .map(
      (j) =>
        `<button type="button" role="menuitemradio" aria-checked="${j.id === ativa}" data-cmd="focar:${j.id}">${esc(
          j.el.dataset.titulo ?? j.id,
        )}${j.min ? ' <kbd>no Dock</kbd>' : ''}</button>`,
    )
    .join('');
}

const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function relogio() {
  const d = new Date();
  const dia = fmtDia.format(d).replace(/\./g, '').replace(/,/g, '');
  $('[data-relogio]')!.innerHTML = `<span class="dia">${esc(dia)}</span>${fmtHora.format(d)}`;
  $('[data-relogio-curto]')!.textContent = fmtHora.format(d);
  if ((local.ler('os.ceu') || 'dia') === 'dinamico') raiz.dataset.ceu = ceuDaHora();
}

/* ============================================================
   Aparência: esquemas do XP, céu dinâmico, movimento
   ============================================================ */

const coresTema: Record<string, string> = { azul: '#245ddb', oliva: '#93a96a', prata: '#c8c9d8', noir: '#111111' };

function ceuDaHora() {
  const h = new Date().getHours();
  return raiz.dataset.esquema === 'noir' || h < 6 || h >= 19 ? 'noite' : h >= 17 ? 'tarde' : 'dia';
}

function aplicarAparencia() {
  const pref = local.ler('os.esquema') || 'azul';
  raiz.dataset.esquema = pref === 'auto' ? (prefereEscuro.matches ? 'noir' : 'azul') : pref;
  const ceu = local.ler('os.ceu') || 'dia';
  raiz.dataset.ceu = ceu === 'dinamico' ? ceuDaHora() : ceu;
  if (local.ler('os.movimento') === 'reduzido') raiz.dataset.movimento = 'reduzido';
  else delete raiz.dataset.movimento;
  $('meta[name="theme-color"]')?.setAttribute('content', coresTema[raiz.dataset.esquema] ?? '#245ddb');
  sincronizarCentral();
}

function sincronizarCentral() {
  const esquema = local.ler('os.esquema') || 'azul';
  const ceu = local.ler('os.ceu') || 'dia';
  for (const b of $$('[data-cmd^="esquema:"]')) b.setAttribute('aria-pressed', String(b.dataset.cmd === `esquema:${esquema}`));
  for (const b of $$('[data-cmd^="ceu:"]')) b.setAttribute('aria-pressed', String(b.dataset.cmd === `ceu:${ceu}`));
  $<HTMLInputElement>('[data-movimento]')!.checked = raiz.dataset.movimento === 'reduzido';
}

prefereEscuro.addEventListener('change', aplicarAparencia);
$<HTMLInputElement>('[data-movimento]')!.addEventListener('change', (e) => {
  local.gravar('os.movimento', (e.target as HTMLInputElement).checked ? 'reduzido' : 'normal');
  aplicarAparencia();
});

/* ============================================================
   Dock
   ============================================================ */

const dock = $('.dock')!;

function atualizarDock() {
  for (const item of $$('.dock-item[data-alvo]')) {
    const j = janelas.get(item.dataset.alvo!);
    const rodando = !!j?.aberta;
    item.classList.toggle('rodando', rodando);
    if (item.closest('[data-dock-projetos]')) item.hidden = !rodando;
  }
  $('[data-dock-sep]')!.hidden = !$('[data-dock-projetos] .dock-item:not([hidden])');
  atualizarAreas();
  os.classList.toggle('tem-janela', visiveis().length > 0);
}

function pular(id: string) {
  const item = itemDock(id);
  if (!item || semMovimento()) return;
  item.classList.remove('pulando');
  void item.offsetWidth;
  item.classList.add('pulando');
  setTimeout(() => item.classList.remove('pulando'), 1150);
}

// A lupa do Dock: cada ícone cresce conforme a distância até o cursor.
dock.addEventListener('pointermove', (ev) => {
  if (ev.pointerType !== 'mouse' || semMovimento()) return;
  for (const item of $$('.dock-item:not([hidden])', dock)) {
    const r = item.getBoundingClientRect();
    const t = Math.max(0, 1 - Math.abs(ev.clientX - (r.left + r.width / 2)) / 150);
    item.style.setProperty('--z', (1 + 0.6 * t * t * (3 - 2 * t)).toFixed(3));
  }
});
dock.addEventListener('pointerleave', () => {
  for (const item of $$('.dock-item', dock)) item.style.setProperty('--z', '1');
});

/* ============================================================
   Explorador (pasta Projetos)
   ============================================================ */

const explorador = $('[data-explorador]')!;
const listaPr = $('.pr-lista', explorador)!;
let selecionado = dados.projetos[0]?.slug ?? '';

const textoCodigo = { aberto: 'código aberto', privado: 'código privado', empresa: 'feito no trabalho' };

const itemPr = (slug: string) => $<HTMLElement>(`.pr-item[data-slug="${slug}"]`, listaPr);
const itensVisiveis = () => $$('.pr-item', listaPr).filter((i) => !i.closest('li')!.hidden);

function selecionar(slug: string, rolar = true) {
  const p = porSlug.get(slug);
  if (!p) return;
  selecionado = slug;
  for (const it of $$('.pr-item', listaPr)) it.classList.toggle('sel', it.dataset.slug === slug);

  $('[data-detalhes]', explorador)!.innerHTML =
    `<b>${esc(p.titulo)}</b><p>${esc(p.tipo)}</p><p>${esc(p.situacao)} · ${textoCodigo[p.codigo]}</p>` +
    `<p>${esc(p.stack.slice(0, 4).join(', '))}</p>`;

  const demo = $<HTMLAnchorElement>('[data-tp="demo"]', explorador)!;
  demo.hidden = !p.demo;
  if (p.demo) demo.href = p.demo;
  const codigo = $<HTMLAnchorElement>('[data-tp="codigo"]', explorador)!;
  codigo.hidden = !p.repo;
  if (p.repo) codigo.href = p.repo;
  $('[data-tp="pedir"]', explorador)!.hidden = p.codigo !== 'privado';

  const img = $<HTMLImageElement>('[data-galeria-img]', explorador)!;
  if (p.capa) {
    img.src = p.capa;
    img.alt = p.capaAlt;
    img.hidden = false;
  } else img.hidden = true;
  $('[data-galeria-titulo]', explorador)!.textContent = p.titulo;
  $('[data-galeria-resumo]', explorador)!.textContent = p.resumo;

  atualizarStatus();
  if (rolar) itemPr(slug)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (espiado) preencherEspiar(slug);
}

function atualizarStatus() {
  const n = itensVisiveis().length;
  $('[data-status]', explorador)!.textContent = `${n} ${n === 1 ? 'objeto' : 'objetos'}${selecionado ? ' · 1 selecionado' : ''}`;
}

function moverSelecao(tecla: string) {
  const itens = itensVisiveis();
  if (!itens.length) return;
  let i = itens.findIndex((it) => it.dataset.slug === selecionado);
  if (i < 0) i = 0;
  const vista = explorador.dataset.vista;
  let colunas = 1;
  if (vista === 'icones') {
    const topo = itens[0].offsetTop;
    colunas = Math.max(1, itens.filter((it) => it.offsetTop === topo).length);
  }
  const horizontal = vista !== 'lista';
  const passo: Record<string, number> = {
    ArrowRight: horizontal ? 1 : 0,
    ArrowLeft: horizontal ? -1 : 0,
    ArrowDown: vista === 'galeria' ? 0 : colunas,
    ArrowUp: vista === 'galeria' ? 0 : -colunas,
  };
  const novo = itens[limitarNum(i + (passo[tecla] ?? 0), 0, itens.length - 1)];
  selecionar(novo.dataset.slug!);
  novo.focus({ preventScroll: true });
}

listaPr.addEventListener('click', (ev) => {
  const it = (ev.target as Element).closest<HTMLElement>('.pr-item');
  if (!it || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
  ev.preventDefault();
  selecionar(it.dataset.slug!, false);
  // Teclado (Enter), toque e celular abrem com um toque; o mouse pede duplo clique.
  if (ev.detail === 0 || ultimoPonteiro !== 'mouse' || movel.matches) abrir(`projeto-${it.dataset.slug}`, $('.ic-box', it));
});

listaPr.addEventListener('dblclick', (ev) => {
  const it = (ev.target as Element).closest<HTMLElement>('.pr-item');
  if (it && ultimoPonteiro === 'mouse') abrir(`projeto-${it.dataset.slug}`, $('.ic-box', it));
});

$<HTMLInputElement>('[data-filtro]', explorador)!.addEventListener('input', (ev) => {
  const q = normalizar((ev.target as HTMLInputElement).value.trim());
  for (const it of $$('.pr-item', listaPr)) it.closest('li')!.hidden = !!q && !normalizar(it.dataset.texto ?? '').includes(q);
  const visiveisAgora = itensVisiveis();
  if (visiveisAgora.length && !visiveisAgora.some((it) => it.dataset.slug === selecionado)) selecionar(visiveisAgora[0].dataset.slug!);
  atualizarStatus();
});

explorador.addEventListener('click', (ev) => {
  const cab = (ev.target as Element).closest('.tp-cab');
  if (cab) cab.setAttribute('aria-expanded', String(cab.getAttribute('aria-expanded') !== 'true'));
});

function definirVista(v: string) {
  if (!['icones', 'lista', 'galeria'].includes(v)) return;
  explorador.dataset.vista = v;
  for (const b of $$('[data-cmd^="vista:"]')) {
    const sim = b.dataset.cmd === `vista:${v}`;
    b.setAttribute(b.getAttribute('role') === 'menuitemradio' ? 'aria-checked' : 'aria-pressed', String(sim));
  }
  local.gravar('os.vista', v);
  if (v === 'galeria') selecionar(selecionado);
}

/* ============================================================
   Quick Look
   ============================================================ */

const espiarEl = $('[data-espiar]')!;
let espiado: string | null = null;

function preencherEspiar(slug: string) {
  const p = porSlug.get(slug);
  if (!p) return;
  espiado = slug;
  $('[data-espiar-titulo]', espiarEl)!.textContent = p.titulo;
  $('[data-espiar-nome]', espiarEl)!.textContent = p.titulo;
  $('[data-espiar-resumo]', espiarEl)!.textContent = `${p.resumo} ${p.tipo} · ${p.situacao}.`;
  $('[data-espiar-icone]', espiarEl)!.innerHTML = icone(`p-${slug}`);
  const img = $<HTMLImageElement>('[data-espiar-img]', espiarEl)!;
  img.hidden = !p.capa;
  if (p.capa) {
    img.src = p.capa;
    img.alt = p.capaAlt;
  }
}

function espiar(slug?: string) {
  if (!slug) return;
  if (espiado) {
    fecharEspiar();
    return;
  }
  fecharPopovers();
  preencherEspiar(slug);
  espiarEl.hidden = false;
  const painel = $('.espiar-painel', espiarEl)!;
  const origem = itemPr(slug);
  if (!semMovimento()) {
    if (origem && origem.getClientRects().length) animarEntrada(painel, $('.ic-box', origem));
    else animarEntrada(painel);
  }
}

function fecharEspiar() {
  espiarEl.hidden = true;
  espiado = null;
}

espiarEl.addEventListener('click', (ev) => {
  if (ev.target === espiarEl) fecharEspiar();
});

function vizinhoEspiado(passo: number) {
  const slugs = dados.projetos.map((p) => p.slug);
  const i = slugs.indexOf(espiado ?? '');
  const novo = slugs[(i + passo + slugs.length) % slugs.length];
  selecionar(novo);
  preencherEspiar(novo);
}

/* ============================================================
   Spotlight
   ============================================================ */

interface Resultado {
  grupo: string;
  titulo: string;
  sub: string;
  icone: string;
  cmd: string;
  desc: string;
  extra: string;
  projeto?: Projeto;
}

const indice: Resultado[] = [
  { grupo: 'Aplicativos', titulo: 'Projetos', sub: 'Explorador', icone: 'i-pasta', cmd: 'abrir:projetos', desc: 'A pasta com todos os projetos.', extra: 'pasta portfolio' },
  { grupo: 'Aplicativos', titulo: 'Sobre mim', sub: 'Sobre', icone: 'i-usuario', cmd: 'abrir:sobre', desc: 'Quem é o Guilherme e com o que ele trabalha.', extra: 'curriculo perfil guilherme' },
  { grupo: 'Aplicativos', titulo: 'Contato', sub: 'Correio', icone: 'i-correio', cmd: 'abrir:contato', desc: 'Mande um e-mail ou peça acesso a um repositório.', extra: 'email e-mail mensagem linkedin' },
  { grupo: 'Aplicativos', titulo: 'Terminal', sub: 'Prompt de comando', icone: 'i-terminal', cmd: 'abrir:terminal', desc: 'Para quem prefere digitar. Comece com "ajuda".', extra: 'cmd prompt console shell' },
  { grupo: 'Aplicativos', titulo: 'LEIA-ME.txt', sub: 'Bloco de notas', icone: 'i-bloco', cmd: 'abrir:leiame', desc: 'Como usar o GuiOs 26x.04p e os atalhos de teclado.', extra: 'ajuda atalhos leia me' },
  { grupo: 'Aplicativos', titulo: 'Lixeira', sub: 'Lixeira', icone: 'i-lixeira-cheia', cmd: 'abrir:lixeira', desc: 'Tem uma coisa ali dentro.', extra: 'blog' },
  ...dados.projetos.map((p) => ({
    grupo: 'Projetos',
    titulo: p.titulo,
    sub: p.tipo,
    icone: `p-${p.slug}`,
    cmd: `projeto:${p.slug}`,
    desc: p.resumo,
    extra: `${p.stack.join(' ')} ${p.resumo} ${p.slug}`,
    projeto: p,
  })),
  { grupo: 'Ações', titulo: 'Atividades', sub: 'F3', icone: 'i-mc', cmd: 'mc', desc: 'Todas as janelas lado a lado.', extra: 'janelas visao geral mission control expose' },
  { grupo: 'Ações', titulo: 'Neofetch', sub: 'Terminal', icone: 'i-terminal', cmd: 'neofetch', desc: 'As informações do sistema, direto no terminal.', extra: 'linux sistema info' },
  { grupo: 'Ações', titulo: 'Central de controle', sub: 'Aparência', icone: 'i-controle', cmd: 'central', desc: 'Esquema de cores, céu e movimento.', extra: 'tema cores ajustes preferencias' },
  { grupo: 'Ações', titulo: 'Modo escuro (Noir)', sub: 'Esquema', icone: 'i-controle', cmd: 'esquema:noir', desc: 'O esquema Noir, escuro.', extra: 'tema dark escuro noir' },
  { grupo: 'Ações', titulo: 'Esquema Azul', sub: 'Esquema', icone: 'i-controle', cmd: 'esquema:azul', desc: 'O esquema padrão, azul.', extra: 'tema claro' },
  { grupo: 'Ações', titulo: 'Esquema Oliva', sub: 'Esquema', icone: 'i-controle', cmd: 'esquema:oliva', desc: 'Verde-oliva.', extra: 'tema verde' },
  { grupo: 'Ações', titulo: 'Esquema Prateado', sub: 'Esquema', icone: 'i-controle', cmd: 'esquema:prata', desc: 'Prateado, mais neutro.', extra: 'tema prata cinza silver' },
  { grupo: 'Ações', titulo: 'Copiar e-mail', sub: dados.email, icone: 'i-copiar', cmd: 'copiar-email', desc: dados.email, extra: 'email contato' },
  { grupo: 'Ações', titulo: 'GitHub', sub: 'Abre numa aba nova', icone: 'i-github', cmd: `link:${dados.github}`, desc: dados.github, extra: 'codigo repositorio' },
  { grupo: 'Ações', titulo: 'LinkedIn', sub: 'Abre numa aba nova', icone: 'i-linkedin', cmd: `link:${dados.linkedin}`, desc: dados.linkedin, extra: 'perfil curriculo' },
  { grupo: 'Ações', titulo: 'Desligar', sub: 'Sistema', icone: 'i-desligar', cmd: 'desligar', desc: 'Desligar, reiniciar ou fazer logoff.', extra: 'sair logoff reiniciar' },
];

const buscaEl = $('[data-busca]')!;
const campoBusca = $<HTMLInputElement>('[data-busca-campo]', buscaEl)!;
const listaBusca = $('[data-busca-lista]', buscaEl)!;
const prevBusca = $('[data-busca-prev]', buscaEl)!;
const resBusca = $('[data-busca-res]', buscaEl)!;
const vaziaBusca = $('[data-busca-vazia]', buscaEl)!;
let resultados: (Resultado & { nota: string })[] = [];
let selBusca = 0;

function buscar(q: string) {
  const termos = normalizar(q).split(/\s+/).filter(Boolean);
  if (!termos.length) return [];
  const achados: { r: Resultado; pontos: number; nota: string }[] = [];
  for (const r of indice) {
    const titulo = normalizar(r.titulo);
    const tudo = `${titulo} ${normalizar(r.sub)} ${normalizar(r.extra)}`;
    if (!termos.every((t) => tudo.includes(t))) continue;
    const frase = termos.join(' ');
    let pontos = 10;
    if (titulo.startsWith(frase)) pontos = 100;
    else if (titulo.split(/\s+/).some((p) => p.startsWith(termos[0]))) pontos = 70;
    else if (titulo.includes(frase)) pontos = 50;
    // Quando a busca bate numa tecnologia, ela aparece ao lado do projeto.
    let nota = r.sub;
    const tec = r.projeto?.stack.find((s) => normalizar(s).includes(termos[0]));
    if (tec && pontos < 50) nota = tec;
    if (r.grupo === 'Projetos') pontos += 5;
    achados.push({ r, pontos, nota });
  }
  return achados.sort((a, b) => b.pontos - a.pontos).map((a) => ({ ...a.r, nota: a.nota }));
}

function renderBusca() {
  const q = campoBusca.value;
  resultados = buscar(q);
  selBusca = 0;
  vaziaBusca.hidden = !q.trim() || resultados.length > 0;
  resBusca.classList.toggle('vazio', !resultados.length);
  if (!resultados.length) {
    listaBusca.innerHTML = '';
    prevBusca.innerHTML = '';
    return;
  }
  // O melhor resultado vem primeiro; o resto, agrupado.
  const [melhor, ...resto] = resultados;
  const grupos = new Map<string, number[]>();
  resto.forEach((r, i) => grupos.set(r.grupo, [...(grupos.get(r.grupo) ?? []), i + 1]));
  const linha = (i: number) => {
    const r = resultados[i];
    return `<li><button type="button" role="option" data-i="${i}">${icone(r.icone)}<span>${esc(r.titulo)}</span><small>${esc(r.nota)}</small></button></li>`;
  };
  let html = `<li class="grupo">Melhor resultado</li>${linha(0)}`;
  void melhor;
  for (const [grupo, idx] of grupos) html += `<li class="grupo">${esc(grupo)}</li>${idx.map(linha).join('')}`;
  listaBusca.innerHTML = html;
  marcarBusca();
}

function marcarBusca() {
  for (const b of $$('button[data-i]', listaBusca)) {
    const sim = Number(b.dataset.i) === selBusca;
    b.classList.toggle('sel', sim);
    b.setAttribute('aria-selected', String(sim));
    if (sim) b.scrollIntoView({ block: 'nearest' });
  }
  const r = resultados[selBusca];
  if (!r) return;
  prevBusca.innerHTML = r.projeto?.capa
    ? `<img src="${esc(r.projeto.capa)}" alt="" /><h3>${esc(r.titulo)}</h3><p>${esc(r.desc)}</p><p><small>${esc(r.projeto.stack.join(' · '))}</small></p>`
    : `${icone(r.icone)}<h3>${esc(r.titulo)}</h3><p>${esc(r.desc)}</p>`;
}

function abrirBusca() {
  fecharPopovers();
  fecharEspiar();
  if (mcAtivo) sairMc();
  buscaEl.hidden = false;
  campoBusca.value = '';
  renderBusca();
  campoBusca.focus();
}

function fecharBusca() {
  buscaEl.hidden = true;
}

function executarBusca(i: number) {
  const r = resultados[i];
  if (!r) return;
  fecharBusca();
  executar(r.cmd, r.grupo === 'Projetos' ? itemPr(r.projeto!.slug) : null);
}

campoBusca.addEventListener('input', renderBusca);
listaBusca.addEventListener('click', (ev) => {
  const b = (ev.target as Element).closest<HTMLElement>('button[data-i]');
  if (b) executarBusca(Number(b.dataset.i));
});
listaBusca.addEventListener('pointermove', (ev) => {
  const b = (ev.target as Element).closest<HTMLElement>('button[data-i]');
  if (b && Number(b.dataset.i) !== selBusca) {
    selBusca = Number(b.dataset.i);
    marcarBusca();
  }
});
buscaEl.addEventListener('click', (ev) => {
  if (ev.target === buscaEl) fecharBusca();
});

/* ============================================================
   Mission Control
   ============================================================ */

let mcAtivo = false;

function entrarMc() {
  if (movel.matches) return;
  const lista = porZ(visiveis()).reverse();
  if (!lista.length) return;
  fecharPopovers();
  mcAtivo = true;
  os.classList.add('mc');
  const n = lista.length;
  const colunas = Math.ceil(Math.sqrt(n));
  const linhas = Math.ceil(n / colunas);
  const margem = 50;
  const topo = MENU_H + 30;
  const cw = (innerWidth - 2 * margem) / colunas;
  const ch = (innerHeight - topo - DOCK_H - 40) / linhas;
  lista.forEach((j, i) => {
    const c = i % colunas;
    const l = Math.floor(i / colunas);
    const naLinha = Math.min(colunas, n - l * colunas);
    const w = j.el.offsetWidth;
    const h = j.el.offsetHeight;
    const s = Math.min(1, (cw - 40) / w, (ch - 60) / h);
    const cx = margem + ((colunas - naLinha) * cw) / 2 + c * cw + cw / 2;
    const cy = topo + l * ch + ch / 2 - 10;
    j.el.style.setProperty('--mc-s', String(s));
    j.el.style.transform = `translate(${cx - (j.el.offsetLeft + w / 2)}px, ${cy - (j.el.offsetTop + h / 2)}px) scale(${s})`;
  });
}

function sairMc(foco?: string) {
  if (!mcAtivo) return;
  mcAtivo = false;
  os.classList.remove('mc');
  os.classList.add('saindo-mc');
  for (const j of janelas.values()) j.el.style.transform = '';
  setTimeout(() => os.classList.remove('saindo-mc'), 420);
  if (foco) focar(foco);
}

const alternarMc = () => (mcAtivo ? sairMc() : entrarMc());

/* ============================================================
   Balão, caixas de mensagem, lixeira
   ============================================================ */

const balao = $('[data-balao]')!;
const balaoTitulo = $('strong', balao)!;
const balaoTexto = $('[data-balao-texto]', balao)!;
const balaoPadrao = { titulo: balaoTitulo.innerHTML, texto: balaoTexto.innerHTML };
let balaoTimer = 0;
let balaoAcao: string | null = null;

function mostrarBalao(titulo?: string, texto?: string, acao: string | null = 'abrir:leiame') {
  balaoTitulo.innerHTML = titulo ? `${icone('i-info')} ${esc(titulo)}` : balaoPadrao.titulo;
  if (texto) balaoTexto.textContent = texto;
  else if (movel.matches) balaoTexto.textContent = 'Toque num app para abrir. Para voltar, toque na barrinha embaixo da tela.';
  else balaoTexto.innerHTML = balaoPadrao.texto;
  balaoAcao = acao;
  balao.hidden = false;
  balao.classList.remove('saindo');
  clearTimeout(balaoTimer);
  balaoTimer = window.setTimeout(esconderBalao, titulo ? 3500 : 9000);
}

function esconderBalao() {
  if (balao.hidden) return;
  balao.classList.add('saindo');
  setTimeout(() => {
    balao.hidden = true;
    balao.classList.remove('saindo');
  }, 300);
}

balao.addEventListener('click', (ev) => {
  const acao = balaoAcao;
  esconderBalao();
  if (!(ev.target as Element).closest('.balao-fechar') && acao) executar(acao);
});

interface BotaoDialogo {
  rotulo: string;
  cmd: string;
  primario?: boolean;
}

function dialogo(titulo: string, iconeId: string, html: string, botoes: BotaoDialogo[]) {
  const j = janelas.get('dialogo')!;
  if (j.aberta) fechar('dialogo', { semAnim: true, semUrl: true });
  $('.janela-titulo', j.el)!.textContent = titulo;
  j.el.dataset.titulo = titulo;
  $('.janela-icone use', j.el)!.setAttribute('href', `#${iconeId}`);
  $('[data-dlg-icone] use', j.el)!.setAttribute('href', `#${iconeId}`);
  $('[data-dlg-texto]', j.el)!.innerHTML = html;
  $('[data-dlg-acoes]', j.el)!.innerHTML = botoes
    .map((b) => `<button class="xp-btn${b.primario ? ' primario' : ''}" type="button" data-cmd="${esc(b.cmd)}">${esc(b.rotulo)}</button>`)
    .join('');
  j.geo = null;
  abrir('dialogo', null, { semUrl: true });
}

function esvaziarLixeira() {
  $('[data-lixeira] .pr-item')?.remove();
  $('.lixeira-vazia')!.hidden = false;
  $('[data-lixeira-status]')!.textContent = '0 objetos';
  $<HTMLButtonElement>('[data-esvaziar]')!.disabled = true;
  for (const u of $$('.ic-lixeira use')) u.setAttribute('href', '#i-lixeira');
  $('#janela-lixeira .janela-icone use')?.setAttribute('href', '#i-lixeira');
}

/* ============================================================
   Inicialização, logoff e desligamento
   ============================================================ */

const bootEl = $('[data-boot]')!;
const desligarEl = $('[data-desligar]')!;
const desligadaEl = $('[data-desligada]')!;

const OK = '[  <b class="log-ok">OK</b>  ]';
const espera = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));
const nomesEsquema: Record<string, string> = { azul: 'Azul', oliva: 'Oliva', prata: 'Prata', noir: 'Noir' };

function digitarLog(el: HTMLElement, linhas: string[], passo: number) {
  el.innerHTML = '';
  return new Promise<void>((pronto) => {
    let i = 0;
    const t = window.setInterval(() => {
      if (i >= linhas.length) {
        clearInterval(t);
        pronto();
        return;
      }
      el.insertAdjacentHTML('beforeend', `${linhas[i++]}\n`);
    }, passo);
  });
}

function linhasBoot() {
  return [
    '[    0.000000] Linux version 6.11.0-guios (guilherme@guios) #2026 SMP PREEMPT_DYNAMIC',
    '[    0.418273] Carregando o GuiOs 26x.04p...',
    `${OK} Iniciado o Registro do Sistema.`,
    `${OK} Montado /home/guilherme.`,
    `${OK} Montado /home/guilherme/projetos (${dados.projetos.length} itens).`,
    `${OK} Iniciado o Gerenciador de Janelas.`,
    `${OK} Carregado o esquema de cores ${nomesEsquema[raiz.dataset.esquema ?? 'azul'] ?? 'Azul'}.`,
    `${OK} Iniciado o Dock.`,
    `${OK} Iniciado o pinguim.`,
    `${OK} Alcançado o alvo Área de Trabalho.`,
  ];
}

function layoutInicial() {
  let ids: string[] = JSON.parse((movel.matches ? os.dataset.inicialMovel : os.dataset.inicial) || '[]');
  const a = area();
  if (!movel.matches && ids.includes('projetos') && ids.includes('sobre')) {
    if (a.w >= 1180 && a.h >= 520) {
      const ws = 370;
      const xs = a.x + a.w - ws - 24;
      const sobre = janelas.get('sobre')!;
      sobre.geo = { x: xs, y: a.y + 10, w: ws, h: Math.min(600, a.h - 10) };
      const xp = 112;
      const wp = Math.min(900, xs - xp - 28);
      const hp = Math.min(590, a.h - 20);
      janelas.get('projetos')!.geo = { x: xp, y: a.y + Math.max(10, (a.h - hp) / 2 - 10), w: wp, h: hp };
    } else ids = ['projetos'];
  }
  for (const id of ids) abrir(id, null, { semUrl: true });
  sincronizarUrl(false);
}

let pinguimAgendado = false;

function iniciarSessao(comBalao: boolean) {
  layoutInicial();
  if (comBalao) setTimeout(() => mostrarBalao(), 900);
  if (!pinguimAgendado) {
    pinguimAgendado = true;
    agendarPinguim(comBalao ? 14_000 : 8_000);
  }
}

function ligar(forcar = false) {
  desligadaEl.hidden = true;
  desligadaEl.classList.remove('com-log');
  const jaLigou = sessao.ler('os.ligado') === '1';
  // A tela de inicialização aparece na primeira visita à página inicial. Quem chega por um link de
  // projeto vai direto ao conteúdo.
  const naInicial = location.pathname === '/' && !('erro404' in os.dataset);
  if (!forcar && (jaLigou || !naInicial)) {
    sessao.gravar('os.ligado', '1');
    iniciarSessao(!jaLigou);
    return;
  }
  fecharTodas(true);
  bootEl.hidden = false;
  bootEl.classList.remove('saindo');
  let feito = false;
  const terminar = () => {
    if (feito) return;
    feito = true;
    sessao.gravar('os.ligado', '1');
    bootEl.classList.remove('com-log');
    bootEl.classList.add('saindo');
    iniciarSessao(!jaLigou);
    setTimeout(() => {
      bootEl.hidden = true;
      bootEl.classList.remove('saindo');
    }, 500);
  };
  // Primeiro as mensagens do systemd, depois a marca com a barrinha de blocos.
  const comLog = !semMovimento();
  bootEl.classList.toggle('com-log', comLog);
  const log = comLog ? digitarLog($('[data-boot-log]')!, linhasBoot(), 70).then(() => espera(250)) : Promise.resolve();
  log.then(() => {
    bootEl.classList.remove('com-log');
    setTimeout(terminar, semMovimento() ? 600 : 1300);
  });
  bootEl.addEventListener('click', terminar, { once: true });
}

function mostrarDesligar() {
  fecharPopovers();
  if (mcAtivo) sairMc();
  os.classList.add('cinza');
  desligarEl.hidden = false;
  $<HTMLButtonElement>('[data-cmd="cancelar-desligar"]', desligarEl)!.focus();
}

function esconderDesligar() {
  os.classList.remove('cinza');
  desligarEl.hidden = true;
}

async function desligarAgora() {
  const abertas = [...janelas.values()].filter((j) => j.aberta).length;
  esconderDesligar();
  fecharTodas(true);
  passeio?.cancel();
  sessao.gravar('os.ligado', null);
  desligadaEl.hidden = false;
  if (semMovimento()) return;
  desligadaEl.classList.add('com-log');
  await digitarLog(
    $('[data-desligar-log]')!,
    [
      `${OK} Parado o pinguim.`,
      `${OK} Parado o Dock.`,
      `${OK} ${abertas === 1 ? 'Fechada 1 janela' : `Fechadas ${abertas} janelas`}.`,
      `${OK} Desmontado /home/guilherme/projetos.`,
      `${OK} Parado o Gerenciador de Janelas.`,
      `${OK} Alcançado o alvo Desligar.`,
      '[   12.004211] reboot: Desligando',
    ],
    90,
  );
  await espera(450);
  desligadaEl.classList.remove('com-log');
}

/* ============================================================
   Celular: barra de início (tocar ou deslizar para cima volta à tela inicial)
   ============================================================ */

const barraHome = $('[data-barra-home]')!;
let inicioToque = 0;
barraHome.addEventListener('pointerdown', (e) => (inicioToque = e.clientY));
barraHome.addEventListener('pointerup', (e) => {
  if (inicioToque - e.clientY > -10) fecharTodas();
});
barraHome.addEventListener('click', (e) => e.preventDefault());

/* ============================================================
   Terminal: um bash com pastas de mentira (~/projetos, LEIA-ME.txt...)
   ============================================================ */

const terminal = $('[data-terminal]')!;
const saida = $('[data-saida]', terminal)!;
const formTerminal = $<HTMLFormElement>('[data-entrada]', terminal)!;
const entrada = $<HTMLInputElement>('input', formTerminal)!;
const cwdEl = $('[data-cwd]', terminal)!;
const historico: string[] = [];
let posHistorico = -1;
let cwd: string[] = [];
const inicioSessao = Date.now();

function escrever(texto: string, classe?: string) {
  const s = document.createElement('span');
  if (classe) s.className = classe;
  s.textContent = texto;
  saida.append(s);
}

function escreverHtml(html: string) {
  saida.insertAdjacentHTML('beforeend', html);
}

const caminhoTexto = (c: string[]) => (c.length ? `~/${c.join('/')}` : '~');
const promptHtml = () =>
  `<b class="t-verde">guilherme@guios</b>:<b class="t-azul">${esc(caminhoTexto(cwd))}</b>$ `;
const minutosLigado = () => Math.max(1, Math.round((Date.now() - inicioSessao) / 60_000));
const lixeiraCheia = () => !!$('[data-lixeira] .pr-item');

const ARQUIVOS_HOME = ['LEIA-ME.txt', 'sobre.txt', 'contato.txt'];

// Caminho como lista de pastas a partir de /home/guilherme. Devolve null se sair de casa.
function resolver(arg: string): string[] | null {
  if (!arg) return [...cwd];
  if (arg === '~') return [];
  let base: string[];
  let partes: string[];
  if (arg.startsWith('~/')) {
    base = [];
    partes = arg.slice(2).split('/');
  } else if (arg.startsWith('/')) {
    const abs = arg.split('/').filter(Boolean);
    if (abs[0] !== 'home' || abs[1] !== 'guilherme') return null;
    base = [];
    partes = abs.slice(2);
  } else {
    base = [...cwd];
    partes = arg.split('/');
  }
  for (const p of partes) {
    if (!p || p === '.') continue;
    if (p === '..') base.pop();
    else base.push(p);
  }
  return base;
}

function tipo(c: string[] | null): 'dir' | 'arq' | null {
  if (!c) return null;
  if (c.length === 0) return 'dir';
  if (c.length === 1) return c[0] === 'projetos' || c[0] === '.lixeira' ? 'dir' : ARQUIVOS_HOME.includes(c[0]) ? 'arq' : null;
  if (c[0] === 'projetos' && porSlug.has(c[1])) return c.length === 2 ? 'dir' : c.length === 3 && c[2] === 'README.md' ? 'arq' : null;
  if (c[0] === '.lixeira' && c.length === 2 && c[1] === 'portfolio-v1.html' && lixeiraCheia()) return 'arq';
  return null;
}

function listar(c: string[], ocultos: boolean): { nome: string; dir: boolean }[] {
  if (c.length === 0)
    return [
      ...(ocultos ? [{ nome: '.lixeira', dir: true }] : []),
      { nome: 'projetos', dir: true },
      ...ARQUIVOS_HOME.map((nome) => ({ nome, dir: false })),
    ];
  if (c[0] === 'projetos' && c.length === 1) return dados.projetos.map((p) => ({ nome: p.slug, dir: true }));
  if (c[0] === 'projetos' && c.length === 2) return [{ nome: 'README.md', dir: false }];
  if (c[0] === '.lixeira') return lixeiraCheia() ? [{ nome: 'portfolio-v1.html', dir: false }] : [];
  return [];
}

function lerArquivo(c: string[]) {
  const nome = c.join('/');
  if (nome === 'LEIA-ME.txt') return `${$('.bloco')?.textContent ?? ''}\n`;
  if (nome === 'sobre.txt') return `${dados.nome}\n${dados.papel}.\nFaz software inteiro, do banco ao servidor, em TypeScript e Python.\n`;
  if (nome === 'contato.txt') return `E-mail:   ${dados.email}\nLinkedIn: ${dados.linkedin}\nGitHub:   ${dados.github}\n`;
  if (c[0] === 'projetos') {
    const p = porSlug.get(c[1])!;
    return (
      `# ${p.titulo}\n\n${p.resumo}\n\n` +
      `Tipo:        ${p.tipo}\nSituação:    ${p.situacao}\n` +
      `Código:      ${{ aberto: 'aberto', privado: 'privado (acesso sob pedido)', empresa: 'da empresa (feito no trabalho)' }[p.codigo]}\n` +
      `Tecnologias: ${p.stack.join(', ')}\n\nPara ver tudo: abrir ${p.slug}\n`
    );
  }
  return '<!-- parecia um blog -->\n';
}

function alvoDeCaminho(c: string[]): { nome: string; cmd: string } | null {
  if (!c.length) return null;
  if (c[0] === 'projetos') {
    if (c.length === 1) return { nome: 'Projetos', cmd: 'abrir:projetos' };
    const p = porSlug.get(c[1]);
    return p ? { nome: p.titulo, cmd: `projeto:${p.slug}` } : null;
  }
  const mapa: Record<string, { nome: string; cmd: string }> = {
    'LEIA-ME.txt': { nome: 'LEIA-ME.txt', cmd: 'abrir:leiame' },
    'sobre.txt': { nome: 'Sobre mim', cmd: 'abrir:sobre' },
    'contato.txt': { nome: 'Contato', cmd: 'abrir:contato' },
    '.lixeira': { nome: 'Lixeira', cmd: 'abrir:lixeira' },
  };
  return mapa[c[0]] ?? null;
}

function definirCwd(c: string[]) {
  cwd = c;
  cwdEl.textContent = caminhoTexto(c);
  const titulo = `guilherme@guios: ${caminhoTexto(c)}`;
  const j = janelas.get('terminal')!;
  j.el.dataset.titulo = titulo;
  $('.janela-titulo', j.el)!.textContent = titulo;
}

const appsTerminal: Record<string, string> = {
  projetos: 'projetos',
  explorador: 'projetos',
  sobre: 'sobre',
  contato: 'contato',
  correio: 'contato',
  terminal: 'terminal',
  leiame: 'leiame',
  'leia-me': 'leiame',
  lixeira: 'lixeira',
};

function acharAlvo(arg: string): { nome: string; cmd: string } | null {
  const q = normalizar(arg.trim()).replace(/\/$/, '');
  if (!q) return null;
  const c = resolver(arg.trim());
  if (tipo(c)) return alvoDeCaminho(c!);
  if (appsTerminal[q]) return { nome: q, cmd: `abrir:${appsTerminal[q]}` };
  const p = dados.projetos.find((p) => p.slug.startsWith(q.replace(/\s+/g, '-')) || normalizar(p.titulo).includes(q));
  return p ? { nome: p.titulo, cmd: `projeto:${p.slug}` } : null;
}

function neofetch() {
  const cor = (c: string, t: string) => `<span class="${c}">${t}</span>`;
  const bloco = '███████';
  const arte = [
    `${cor('nf-1', '▄▄▄▄▄▄▄')} ${cor('nf-2', '▄▄▄▄▄▄▄')}`,
    `${cor('nf-1', bloco)} ${cor('nf-2', bloco)}`,
    `${cor('nf-1', bloco)} ${cor('nf-2', bloco)}`,
    `${cor('nf-1', '▀▀▀▀▀▀▀')} ${cor('nf-2', '▀▀▀▀▀▀▀')}`,
    `${cor('nf-3', '▄▄▄▄▄▄▄')} ${cor('nf-4', '▄▄▄▄▄▄▄')}`,
    `${cor('nf-3', bloco)} ${cor('nf-4', bloco)}`,
    `${cor('nf-3', bloco)} ${cor('nf-4', bloco)}`,
    `${cor('nf-3', '▀▀▀▀▀▀▀')} ${cor('nf-4', '▀▀▀▀▀▀▀')}`,
  ];
  const campo = (rotulo: string, valor: string) => `${cor('t-azul', rotulo)}: ${esc(valor)}`;
  const info = [
    `${cor('t-verde', 'guilherme')}@${cor('t-verde', 'guios')}`,
    '-----------------',
    campo('SO', 'GuiOs 26x.04p x86_64'),
    campo('Kernel', '6.11.0-guios'),
    campo('Ligado há', `${minutosLigado()} min`),
    campo('Pacotes', `${dados.projetos.length} (projetos)`),
    campo('Shell', 'bash 5.2'),
    campo('Tema', nomesEsquema[raiz.dataset.esquema ?? 'azul'] ?? 'Azul'),
    campo('CPU', 'TypeScript + Python'),
    campo('Local', 'Brasil'),
    '',
    ['nf-1', 'nf-2', 'nf-3', 'nf-4', 't-verde', 't-azul', 't-amarelo'].map((c) => cor(c, '███')).join(''),
  ];
  let html = '\n';
  for (let i = 0; i < Math.max(arte.length, info.length); i++) html += `  ${arte[i] ?? ' '.repeat(15)}   ${info[i] ?? ''}\n`;
  escreverHtml(`<span class="nf">${html}</span>\n`);
}

function top() {
  const n = dados.projetos.length;
  const ativo = (p: Projeto) => ['No ar', 'Em produção', 'Disponível'].includes(p.situacao);
  const rodando = dados.projetos.filter(ativo).length;
  escrever(
    `top - ${new Date().toLocaleTimeString('pt-BR')} ligado há ${minutosLigado()} min,  1 usuário,  carga média: 0,42 0,37 0,30\n` +
      `Tarefas: ${n} total, ${rodando} rodando, ${n - rodando} dormindo\n\n`,
  );
  escreverHtml('<span class="t-inverso">  PID USUÁRIO    %CPU %MEM S COMANDO              </span>\n');
  dados.projetos.forEach((p, i) => {
    const cpu = (((p.slug.length * 7.3 + i * 3.1) % 30) + (ativo(p) ? 9 : 0.4)).toFixed(1);
    const mem = (((p.stack.length * 1.7) % 9) + 1).toFixed(1);
    escrever(`${String(1000 + i * 137).padStart(5)} guilherme  ${cpu.padStart(5)} ${mem.padStart(4)} ${ativo(p) ? 'R' : 'S'} ${p.slug}\n`);
  });
  escrever('\n');
}

function apt(args: string[], root: boolean) {
  const [acao, pacote] = args;
  if (acao !== 'install' || !pacote) {
    escrever('Uso: apt install <pacote>\n\n');
    return;
  }
  if (!root) {
    escrever('E: Não foi possível abrir o arquivo de trava /var/lib/dpkg/lock - open (13: Permissão negada)\nE: Você é root?\n\n', 'erro');
    return;
  }
  escrever('Lendo listas de pacotes... Pronto\nConstruindo árvore de dependências... Pronto\n');
  const p = dados.projetos.find((p) => p.slug === normalizar(pacote) || p.slug.startsWith(normalizar(pacote)));
  if (p) escrever(`${p.slug} já é a versão mais nova (2026).\n0 pacotes atualizados, 0 pacotes novos instalados.\n\n`, 'ok');
  else escrever(`E: Impossível encontrar o pacote ${pacote}\n\n`, 'erro');
}

const AJUDA =
  'Comandos:\n' +
  '  ls, cd, pwd, cat      andar pelas pastas (comece com: cd projetos)\n' +
  '  abrir <nome>          abre um projeto, pasta ou arquivo (xdg-open também)\n' +
  '  neofetch              informações do sistema\n' +
  '  top                   os projetos como processos\n' +
  '  stack <tecnologia>    projetos que usam a tecnologia\n' +
  '  sobre, contato        quem é o Guilherme e como falar com ele\n' +
  '  tema <azul|oliva|prata|noir|auto>\n' +
  '  atividades            todas as janelas lado a lado\n' +
  '  history, clear, exit  o de sempre\n\n';

function rodar(linha: string) {
  const [cmd, ...args] = linha.split(/\s+/);
  const arg = args.join(' ');
  switch (normalizar(cmd)) {
    case 'ajuda':
    case 'help':
    case '?':
      escrever(AJUDA);
      break;
    case 'ls':
    case 'dir':
    case 'll': {
      const flags = args.filter((a) => a.startsWith('-')).join('');
      const alvo = args.find((a) => !a.startsWith('-')) ?? '';
      const c = resolver(alvo);
      const t = tipo(c);
      if (!t) escrever(`ls: não foi possível acessar '${alvo}': Arquivo ou diretório inexistente\n`, 'erro');
      else if (t === 'arq') escrever(`${alvo}\n`);
      else {
        const itens = listar(c!, flags.includes('a') || cmd === 'll');
        escreverHtml(`${itens.map((i) => (i.dir ? `<b class="t-azul">${esc(i.nome)}</b>` : esc(i.nome))).join('  ')}\n`);
      }
      break;
    }
    case 'projetos':
      for (const p of dados.projetos) escrever(`  ${p.slug.padEnd(22)}${p.tipo}\n`);
      escrever(`\n  ${dados.projetos.length} projetos. Use: abrir <nome>\n\n`, 'destaque');
      break;
    case 'cd': {
      const c = resolver(arg || '~');
      const t = tipo(c);
      if (t === 'dir') definirCwd(c!);
      else if (t === 'arq') escrever(`bash: cd: ${arg}: Não é um diretório\n`, 'erro');
      else escrever(`bash: cd: ${arg}: Arquivo ou diretório inexistente\n`, 'erro');
      break;
    }
    case 'pwd':
      escrever(`/home/guilherme${cwd.length ? `/${cwd.join('/')}` : ''}\n`);
      break;
    case 'cat':
    case 'less':
    case 'more': {
      if (!arg) {
        escrever(`${cmd}: falta um operando\n`, 'erro');
        break;
      }
      const c = resolver(arg);
      const t = tipo(c);
      if (t === 'arq') escrever(lerArquivo(c!));
      else if (t === 'dir') escrever(`${cmd}: ${arg}: É um diretório\n`, 'erro');
      else escrever(`${cmd}: ${arg}: Arquivo ou diretório inexistente\n`, 'erro');
      break;
    }
    case 'abrir':
    case 'open':
    case 'xdg-open':
    case 'start': {
      const alvo = acharAlvo(arg || '.');
      if (!alvo) escrever(`Não encontrei "${arg}". Digite ls ~/projetos para ver a lista.\n\n`, 'erro');
      else {
        escrever(`Abrindo ${alvo.nome}...\n\n`, 'ok');
        executar(alvo.cmd);
      }
      break;
    }
    case 'neofetch':
    case 'screenfetch':
    case 'fastfetch':
      neofetch();
      break;
    case 'top':
    case 'htop':
    case 'ps':
      top();
      break;
    case 'stack': {
      const q = normalizar(arg);
      if (!q) {
        escrever('Uso: stack <tecnologia>   (ex.: stack python)\n\n');
        break;
      }
      const achados = dados.projetos.filter((p) => p.stack.some((s) => normalizar(s).includes(q)));
      if (!achados.length) escrever(`Nenhum projeto usa "${arg}".\n\n`, 'erro');
      else {
        for (const p of achados) escrever(`  ${p.titulo.padEnd(22)}${p.stack.filter((s) => normalizar(s).includes(q)).join(', ')}\n`);
        escrever('\n');
      }
      break;
    }
    case 'whoami':
      escrever('guilherme\n');
      break;
    case 'sobre':
      escrever(`${lerArquivo(['sobre.txt'])}\n`);
      break;
    case 'contato':
      escrever(`${lerArquivo(['contato.txt'])}\n`);
      break;
    case 'tema': {
      const v = normalizar(arg);
      if (!['azul', 'oliva', 'prata', 'noir', 'auto'].includes(v)) escrever('Uso: tema <azul|oliva|prata|noir|auto>\n\n', 'erro');
      else {
        executar(`esquema:${v}`);
        escrever(`Esquema ${v} aplicado.\n\n`, 'ok');
      }
      break;
    }
    case 'atividades':
    case 'mc':
      entrarMc();
      break;
    case 'uname':
      escrever(args.includes('-a') ? 'Linux guios 6.11.0-guios #2026 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\n' : 'Linux\n');
      break;
    case 'data':
    case 'date':
      escrever(`${new Date().toLocaleString('pt-BR')}\n`);
      break;
    case 'echo':
      escrever(`${arg}\n`);
      break;
    case 'history':
      [...historico].reverse().forEach((h, i) => escrever(`${String(i + 1).padStart(5)}  ${h}\n`));
      break;
    case 'man':
      escrever(`Não há entrada de manual para ${arg || 'isso'}. Tente: ajuda\n`);
      break;
    case 'apt':
    case 'apt-get':
      apt(args, false);
      break;
    case 'sudo':
      if (args[0] === 'apt' || args[0] === 'apt-get') apt(args.slice(1), true);
      else escrever('guilherme não está no arquivo sudoers. Este incidente será reportado.\n', 'erro');
      break;
    case 'rm':
      escrever(arg.includes('-rf') ? 'rm: nada foi apagado. Aqui é um portfólio.\n' : `rm: não foi possível remover '${arg}': Permissão negada\n`, 'erro');
      break;
    case 'limpar':
    case 'cls':
    case 'clear':
      saida.textContent = '';
      break;
    case 'sair':
    case 'exit':
    case 'logout':
      definirCwd([]);
      fechar('terminal');
      break;
    default:
      escrever(`bash: ${cmd}: comando não encontrado\n`, 'erro');
  }
}

function rodarComEco(linha: string) {
  escreverHtml(`${promptHtml()}${esc(linha)}\n`);
  if (linha.trim()) {
    historico.unshift(linha);
    posHistorico = -1;
    rodar(linha.trim());
  }
  terminal.scrollTop = terminal.scrollHeight;
}

formTerminal.addEventListener('submit', (e) => {
  e.preventDefault();
  const linha = entrada.value;
  entrada.value = '';
  rodarComEco(linha);
});

const COMANDOS = [
  'ajuda', 'abrir', 'apt', 'atividades', 'cat', 'cd', 'clear', 'contato', 'date', 'echo', 'exit', 'history',
  'ls', 'man', 'neofetch', 'pwd', 'sobre', 'stack', 'sudo', 'tema', 'top', 'uname', 'whoami', 'xdg-open',
];

// Tab completa o comando ou o caminho, como no bash. Com várias opções, lista todas.
function completar() {
  const v = entrada.value;
  const partes = v.split(/\s+/);
  const ultimo = partes[partes.length - 1];
  let opcoes: string[];
  let prefixo: string;
  if (partes.length === 1) {
    prefixo = '';
    opcoes = COMANDOS.filter((c) => c.startsWith(ultimo)).map((c) => `${c} `);
  } else {
    const corte = ultimo.lastIndexOf('/');
    prefixo = ultimo.slice(0, corte + 1);
    const inicio = ultimo.slice(corte + 1);
    const base = resolver(prefixo || '.');
    opcoes = tipo(base) === 'dir' ? listar(base!, inicio.startsWith('.')).filter((i) => i.nome.startsWith(inicio)).map((i) => (i.dir ? `${i.nome}/` : `${i.nome} `)) : [];
    if (!opcoes.length && /^(abrir|open|xdg-open|start)$/.test(partes[0]))
      opcoes = dados.projetos.map((p) => `${p.slug} `).filter((s) => s.startsWith(ultimo));
  }
  if (opcoes.length === 1) {
    partes[partes.length - 1] = prefixo + opcoes[0];
    entrada.value = partes.join(' ');
  } else if (opcoes.length > 1) {
    escreverHtml(`${promptHtml()}${esc(v)}\n`);
    escrever(`${opcoes.map((o) => o.trim()).join('  ')}\n`);
    terminal.scrollTop = terminal.scrollHeight;
  }
}

entrada.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    posHistorico = limitarNum(posHistorico + (e.key === 'ArrowUp' ? 1 : -1), -1, historico.length - 1);
    entrada.value = posHistorico < 0 ? '' : historico[posHistorico];
  } else if (e.key === 'Tab') {
    e.preventDefault();
    completar();
  } else if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    saida.textContent = '';
  }
});

terminal.addEventListener('click', () => {
  if (!getSelection()?.toString()) entrada.focus({ preventScroll: true });
});

/* ============================================================
   O pinguim: de vez em quando sobe de trás do Dock, anda, acena e vai embora
   ============================================================ */

const pinguim = $<HTMLButtonElement>('[data-pinguim]')!;
const falaPinguim = $('[data-pinguim-fala]', pinguim)!;
let passeio: Animation | null = null;
let timersPinguim: number[] = [];
const FALAS = ['Oi!', 'Já viu o terminal?', 'sudo apt install café', `Tem ${dados.projetos.length} projetos na pasta!`, 'Clique em mim!', 'Experimente: neofetch'];

function agendarPinguim(ms = 75_000) {
  timersPinguim.push(window.setTimeout(passearPinguim, ms));
}

function passearPinguim() {
  const ocupado =
    movel.matches || semMovimento() || document.hidden || passeio || mcAtivo || !bootEl.hidden || !desligarEl.hidden || !desligadaEl.hidden;
  const r = dock.getBoundingClientRect();
  if (ocupado || r.width < 200) {
    agendarPinguim(20_000);
    return;
  }
  const largura = 34;
  const x0 = r.left + 16;
  const x1 = r.right - largura - 16;
  const meio = (x0 + x1) / 2;
  const andar = ((x1 - x0) / 2 / 40) * 1000; // 40 px/s em cada metade
  const subir = 650;
  const parar = 2600;
  const total = subir * 2 + andar * 2 + parar;
  const quadro = (x: number, y: number, t: number) => ({ transform: `translate(${x}px, ${y}px)`, offset: t / total });

  pinguim.style.top = `${r.top - 40 + 3}px`;
  pinguim.hidden = false;
  pinguim.classList.add('andando');
  passeio = pinguim.animate(
    [
      quadro(x0, 44, 0),
      quadro(x0, 0, subir),
      quadro(meio, 0, subir + andar),
      quadro(meio, 0, subir + andar + parar),
      quadro(x1, 0, subir + andar * 2 + parar),
      quadro(x1, 44, total),
    ],
    { duration: total, easing: 'linear', fill: 'forwards' },
  );
  timersPinguim.push(
    window.setTimeout(() => {
      pinguim.classList.replace('andando', 'acenando');
      falaPinguim.textContent = FALAS[Math.floor(Math.random() * FALAS.length)];
      falaPinguim.hidden = false;
    }, subir + andar),
    window.setTimeout(() => {
      pinguim.classList.replace('acenando', 'andando');
      falaPinguim.hidden = true;
    }, subir + andar + parar),
  );
  passeio.finished.then(fimPasseio, fimPasseio);
}

function fimPasseio() {
  if (!passeio) return;
  passeio = null;
  for (const t of timersPinguim) clearTimeout(t);
  timersPinguim = [];
  pinguim.hidden = true;
  pinguim.classList.remove('andando', 'acenando');
  falaPinguim.hidden = true;
  agendarPinguim();
}

pinguim.addEventListener('click', (ev) => {
  ev.stopPropagation();
  const p = passeio;
  fimPasseio();
  p?.cancel();
  abrir('terminal', pinguim);
  rodarComEco('neofetch');
});

/* ============================================================
   Correio
   ============================================================ */

const correio = $<HTMLFormElement>('[data-correio]')!;
correio.addEventListener('submit', (e) => {
  e.preventDefault();
  const assunto = (correio.elements.namedItem('subject') as HTMLInputElement).value;
  const corpo = (correio.elements.namedItem('body') as HTMLTextAreaElement).value;
  location.href = `mailto:${dados.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
});

async function copiarEmail() {
  try {
    await navigator.clipboard.writeText(dados.email);
    mostrarBalao('E-mail copiado', dados.email, null);
  } catch {
    mostrarBalao('Não deu para copiar', dados.email, null);
  }
}

/* ============================================================
   Comandos (data-cmd) e cliques
   ============================================================ */

function origemPara(origem?: Element | null, id?: string) {
  if (origem && !origem.closest('.menu-lista, .menu-iniciar, .central')) return $('.ic-box', origem) ?? origem;
  return id ? itemDock(id) : null;
}

function executar(cmd: string, origem?: Element | null) {
  const i = cmd.indexOf(':');
  const nome = i < 0 ? cmd : cmd.slice(0, i);
  const arg = i < 0 ? '' : cmd.slice(i + 1);
  const doDialogo = !!origem?.closest('[data-dlg-acoes]');

  switch (nome) {
    case 'abrir':
      abrir(arg, origemPara(origem, arg));
      break;
    case 'projeto':
      selecionar(arg, false);
      abrir(`projeto-${arg}`, origemPara(origem, `projeto-${arg}`));
      break;
    case 'trocar': {
      const atualEl = origem?.closest<HTMLElement>('.janela');
      const atual = atualEl ? janelas.get(atualEl.dataset.janela!) : null;
      const nova = janelas.get(`projeto-${arg}`);
      if (atual && nova && !nova.aberta) {
        const geo = atual.geo ? { ...atual.geo } : undefined;
        nova.max = atual.max;
        nova.el.classList.toggle('maximizada', nova.max);
        nova.antes = atual.antes;
        fechar(atual.id, { semAnim: true, semUrl: true });
        abrir(nova.id, null, { geo });
      } else abrir(`projeto-${arg}`);
      $('.rolagem', nova?.el ?? document)?.scrollTo(0, 0);
      break;
    }
    case 'focar': {
      const j = janelas.get(arg);
      if (j?.min) restaurar(j);
      else focar(arg);
      break;
    }
    case 'fechar':
      fechar(arg || ativa);
      break;
    case 'fechar-tudo':
      fecharTodas();
      break;
    case 'minimizar':
      minimizar(ativa);
      break;
    case 'zoom':
      zoom(ativa);
      break;
    case 'esconder-tudo':
      for (const j of visiveis()) minimizar(j.id);
      break;
    case 'mc':
      alternarMc();
      break;
    case 'area':
      irParaArea(Number(arg));
      break;
    case 'mover-area':
      moverParaArea(ativa, Number(arg));
      break;
    case 'neofetch':
      abrir('terminal', origemPara(origem, 'terminal'));
      rodarComEco('neofetch');
      break;
    case 'busca':
      abrirBusca();
      break;
    case 'central': {
      const btn = $('[data-pop][aria-controls="central"]');
      fecharPopovers();
      if (btn) abrirPopover(btn);
      return;
    }
    case 'esquema':
      local.gravar('os.esquema', arg);
      aplicarAparencia();
      return;
    case 'ceu':
      local.gravar('os.ceu', arg);
      aplicarAparencia();
      return;
    case 'vista':
      definirVista(arg);
      break;
    case 'espiar':
      espiar(arg || selecionado);
      break;
    case 'abrir-sel':
      abrir(`projeto-${selecionado}`, $('.ic-box', itemPr(selecionado) ?? document));
      break;
    case 'fechar-espiar':
      fecharEspiar();
      break;
    case 'abrir-espiado': {
      const s = espiado;
      fecharEspiar();
      if (s) abrir(`projeto-${s}`, $('.ic-box', itemPr(s) ?? document));
      break;
    }
    case 'link':
      window.open(arg, '_blank', 'noopener');
      break;
    case 'copiar-email':
      copiarEmail();
      break;
    case 'blog-antigo':
      dialogo(
        'portfolio-v1 (parecia um blog).html',
        'i-aviso',
        '<p>Este arquivo está na Lixeira porque parecia um blog.</p><p>Ele foi substituído pelo sistema que você está usando agora.</p>',
        [{ rotulo: 'OK', cmd: 'fechar:dialogo', primario: true }],
      );
      break;
    case 'esvaziar-lixeira':
      dialogo(
        'Confirmar exclusão de arquivo',
        'i-aviso',
        '<p>Tem certeza de que deseja excluir permanentemente <b>portfolio-v1 (parecia um blog).html</b>?</p>',
        [
          { rotulo: 'Sim', cmd: 'confirmar-esvaziar', primario: true },
          { rotulo: 'Não', cmd: 'fechar:dialogo' },
        ],
      );
      break;
    case 'confirmar-esvaziar':
      esvaziarLixeira();
      break;
    case 'logoff':
    case 'desligar-logoff':
    case 'reiniciar':
      esconderDesligar();
      fecharPopovers();
      ligar(true);
      break;
    case 'desligar':
      mostrarDesligar();
      break;
    case 'desligar-agora':
      desligarAgora();
      break;
    case 'cancelar-desligar':
      esconderDesligar();
      break;
    case 'ligar':
      ligar(true);
      break;
  }

  if (doDialogo && cmd !== 'fechar:dialogo') fechar('dialogo');
  fecharPopovers();
}

document.addEventListener('click', (ev) => {
  const alvo = ev.target as Element;

  if (mcAtivo) {
    const jEl = alvo.closest<HTMLElement>('.janela');
    if (jEl) {
      ev.preventDefault();
      sairMc(jEl.dataset.janela);
      return;
    }
    sairMc();
    if (!alvo.closest('.dock, .barra-menu')) return;
  }

  const acao = alvo.closest<HTMLElement>('[data-acao]');
  if (acao) {
    const id = acao.closest<HTMLElement>('.janela')!.dataset.janela!;
    if (acao.dataset.acao === 'fechar') fechar(id);
    else if (acao.dataset.acao === 'minimizar') minimizar(id);
    else zoom(id);
    return;
  }

  const pop = alvo.closest<HTMLElement>('[data-pop]');
  if (pop) {
    alternarPopover(pop);
    return;
  }

  const duplo = alvo.closest<HTMLElement>('[data-cmd-duplo]');
  if (duplo) {
    for (const o of $$('[data-cmd-duplo].sel')) o.classList.remove('sel');
    duplo.classList.add('sel');
    if (ev.detail === 0 || ultimoPonteiro !== 'mouse') executar(duplo.dataset.cmdDuplo!, duplo);
    fecharPopovers();
    return;
  }

  const cmdEl = alvo.closest<HTMLElement>('[data-cmd]');
  if (cmdEl && !ev.defaultPrevented) {
    if (cmdEl.tagName === 'A') ev.preventDefault();
    executar(cmdEl.dataset.cmd!, cmdEl);
    return;
  }

  // Links internos para um projeto abrem a janela dele, sem recarregar a página.
  const link = alvo.closest<HTMLAnchorElement>('a[href^="/projetos/"]');
  if (link && !ev.defaultPrevented && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && ev.button === 0) {
    const m = link.getAttribute('href')!.match(/^\/projetos\/([^/]+)\/?$/);
    if (m && janelas.has(`projeto-${m[1]}`)) {
      ev.preventDefault();
      executar(`projeto:${m[1]}`, link);
      return;
    }
  }

  if (!alvo.closest('.menu-lista, .menu-iniciar, .central')) fecharPopovers();
  if (!alvo.closest('.janela, .dock')) for (const o of $$('[data-cmd-duplo].sel')) o.classList.remove('sel');
});

document.addEventListener('dblclick', (ev) => {
  const duplo = (ev.target as Element).closest<HTMLElement>('[data-cmd-duplo]');
  if (duplo && ultimoPonteiro === 'mouse') executar(duplo.dataset.cmdDuplo!, duplo);
});

/* ============================================================
   Teclado
   ============================================================ */

document.addEventListener('keydown', (ev) => {
  const alvo = ev.target as Element;
  const emCampo = !!alvo.closest('input, textarea, select, [contenteditable="true"]');

  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
    ev.preventDefault();
    if (buscaEl.hidden) abrirBusca();
    else fecharBusca();
    return;
  }

  if (!buscaEl.hidden) {
    if (ev.key === 'Escape') fecharBusca();
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      selBusca = limitarNum(selBusca + (ev.key === 'ArrowDown' ? 1 : -1), 0, resultados.length - 1);
      marcarBusca();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      executarBusca(selBusca);
    }
    return;
  }

  if (espiado) {
    if (ev.key === 'Escape' || ev.key === ' ') {
      ev.preventDefault();
      fecharEspiar();
    } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      vizinhoEspiado(ev.key === 'ArrowRight' ? 1 : -1);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      executar('abrir-espiado');
    }
    return;
  }

  if (ev.ctrlKey && ev.altKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
    ev.preventDefault();
    irParaArea(areaAtual + (ev.key === 'ArrowRight' ? 1 : -1));
    return;
  }

  if (ev.key === 'Escape') {
    if (mcAtivo) sairMc();
    else if (!desligarEl.hidden) esconderDesligar();
    else fecharPopovers();
    return;
  }

  if (emCampo) return;

  if (ev.key === '/') {
    ev.preventDefault();
    abrirBusca();
  } else if (ev.key === 'F3') {
    ev.preventDefault();
    alternarMc();
  } else if (ativa === 'projetos' && !mcAtivo) {
    const emControle = alvo.closest('button, a, summary') && !alvo.closest('.pr-item');
    if (ev.key === ' ' && !emControle) {
      ev.preventDefault();
      espiar(selecionado);
    } else if (ev.key.startsWith('Arrow') && !emControle) {
      ev.preventDefault();
      moverSelecao(ev.key);
    } else if (ev.key === 'Enter' && !emControle) {
      ev.preventDefault();
      abrir(`projeto-${selecionado}`, $('.ic-box', itemPr(selecionado) ?? document));
    }
  }
});

/* ============================================================
   Começo
   ============================================================ */

if ('erro404' in os.dataset) {
  const caminho = $('[data-caminho]');
  if (caminho) caminho.textContent = decodeURIComponent(location.pathname);
}

aplicarAparencia();
definirVista(local.ler('os.vista') ?? (movel.matches ? 'lista' : 'icones'));
selecionar(selecionado, false);
atualizarBarra();
atualizarDock();
relogio();
setInterval(relogio, 15_000);
ligar();
