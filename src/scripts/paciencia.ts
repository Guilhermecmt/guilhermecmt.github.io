// Paciência (Klondike). Arrastar move cartas; tocar numa carta manda ela para o melhor lugar
// (fundação primeiro). Desfazer, virar 1 ou 3, término automático quando tudo está aberto e,
// ao ganhar, a velha chuva de cartas quicando.

type Naipe = 'copas' | 'ouros' | 'espadas' | 'paus';
type Lugar = { tipo: 'monte' } | { tipo: 'descarte' } | { tipo: 'fundacao'; i: number } | { tipo: 'mesa'; i: number };

interface Carta {
  id: number;
  naipe: Naipe;
  valor: number;
  aberta: boolean;
  el: HTMLElement;
}

export interface OpcoesPaciencia {
  raiz: HTMLElement;
  aoVencer: (segundos: number, jogadas: number) => void;
}

const NAIPES: Naipe[] = ['copas', 'ouros', 'espadas', 'paus'];
const SIMBOLO: Record<Naipe, string> = { copas: '♥', ouros: '♦', espadas: '♠', paus: '♣' };
const NOME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const NOME_POR_EXTENSO = ['', 'Ás', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez', 'Valete', 'Dama', 'Rei'];
const vermelha = (c: Carta) => c.naipe === 'copas' || c.naipe === 'ouros';

const guardado = {
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

const semMovimento = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimento === 'reduzido';

export function iniciarPaciencia(o: OpcoesPaciencia) {
  const raiz = o.raiz;
  const mesaEl = raiz.querySelector<HTMLElement>('[data-pac-mesa]')!;
  const tempoEl = raiz.querySelector<HTMLElement>('[data-pac-tempo]')!;
  const jogadasEl = raiz.querySelector<HTMLElement>('[data-pac-jogadas]')!;
  const statusEl = raiz.querySelector<HTMLElement>('[data-pac-status]')!;
  const desfazerBtn = raiz.querySelector<HTMLButtonElement>('[data-pac="desfazer"]')!;

  // As 52 cartas são criadas uma vez; o jogo só muda onde cada uma está.
  const cartas: Carta[] = [];
  for (const naipe of NAIPES)
    for (let valor = 1; valor <= 13; valor++) {
      const el = document.createElement('div');
      const nome = NOME[valor];
      const s = SIMBOLO[naipe];
      el.className = `carta${naipe === 'copas' || naipe === 'ouros' ? ' vermelha' : ''}`;
      el.dataset.id = String(cartas.length);
      el.innerHTML =
        `<div class="pc-frente"><span class="pc-canto">${nome}<br>${s}</span>` +
        `<span class="pc-centro">${valor > 10 ? `<b>${nome}</b>` : ''}<i>${s}</i></span>` +
        `<span class="pc-canto baixo">${nome}<br>${s}</span></div>` +
        '<div class="pc-verso"><svg class="ic"><use href="#i-logo"></use></svg></div>';
      cartas.push({ id: cartas.length, naipe, valor, aberta: false, el });
    }

  const vaga = (classe: string) => {
    const d = document.createElement('div');
    d.className = `vaga ${classe}`;
    mesaEl.append(d);
    return d;
  };
  const vagaMonte = vaga('vaga-monte');
  const vagasFundacao = [0, 1, 2, 3].map(() => vaga('vaga-fundacao'));
  const vagasMesa = [0, 1, 2, 3, 4, 5, 6].map(() => vaga('vaga-mesa'));
  for (const c of cartas) mesaEl.append(c.el);

  let monte: Carta[] = [];
  let descarte: Carta[] = [];
  let fundacoes: Carta[][] = [[], [], [], []];
  let mesa: Carta[][] = [[], [], [], [], [], [], []];
  let virar = guardado.ler('pac.virar') === '3' ? 3 : 1;
  let historico: string[] = [];
  let jogadas = 0;
  let inicio = 0;
  let relogio = 0;
  let acabou = false;
  let completando = 0;
  let geo = { cw: 71, ch: 99, g: 8, topoMesa: 120, w: 0, h: 0 };

  const pilha = (l: Lugar): Carta[] =>
    l.tipo === 'monte' ? monte : l.tipo === 'descarte' ? descarte : l.tipo === 'fundacao' ? fundacoes[l.i] : mesa[l.i];

  function ondeEsta(c: Carta): Lugar {
    if (monte.includes(c)) return { tipo: 'monte' };
    if (descarte.includes(c)) return { tipo: 'descarte' };
    const f = fundacoes.findIndex((p) => p.includes(c));
    if (f >= 0) return { tipo: 'fundacao', i: f };
    return { tipo: 'mesa', i: mesa.findIndex((p) => p.includes(c)) };
  }

  /* Desfazer: uma foto do jogo antes de cada jogada. */

  function foto() {
    const ids = (p: Carta[]) => p.map((c) => c.id);
    return JSON.stringify({
      m: ids(monte),
      d: ids(descarte),
      f: fundacoes.map(ids),
      t: mesa.map(ids),
      a: cartas.filter((c) => c.aberta).map((c) => c.id),
      j: jogadas,
    });
  }

  function salvar() {
    historico.push(foto());
    if (historico.length > 300) historico.shift();
    desfazerBtn.disabled = false;
  }

  function desfazer() {
    const s = historico.pop();
    if (!s || acabou) return;
    const f = JSON.parse(s);
    const por = (ids: number[]) => ids.map((i) => cartas[i]);
    monte = por(f.m);
    descarte = por(f.d);
    fundacoes = f.f.map(por);
    mesa = f.t.map(por);
    const abertas = new Set(f.a);
    for (const c of cartas) c.aberta = abertas.has(c.id);
    jogadas = f.j;
    desfazerBtn.disabled = historico.length === 0;
    atualizarPlacar();
    layout();
  }

  /* Posições: tudo é calculado a partir da largura da mesa. */

  function medir() {
    const w = mesaEl.clientWidth;
    const h = mesaEl.clientHeight;
    const g = Math.max(4, Math.round(w * 0.014));
    const cw = Math.max(34, Math.min(88, Math.floor((w - g * 8) / 7)));
    const ch = Math.round(cw * 1.4);
    geo = { cw, ch, g, topoMesa: g * 2 + ch, w, h };
    mesaEl.style.setProperty('--cw', `${cw}px`);
    mesaEl.style.setProperty('--ch', `${ch}px`);
  }

  const xCol = (i: number) => geo.g + i * (geo.cw + geo.g);

  function pos(el: HTMLElement, x: number, y: number) {
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
  }

  function colocar(c: Carta, x: number, y: number, z: number) {
    pos(c.el, x, y);
    c.el.style.zIndex = String(z);
    c.el.classList.toggle('aberta', c.aberta);
    c.el.setAttribute('aria-label', c.aberta ? `${NOME_POR_EXTENSO[c.valor]} de ${c.naipe}` : 'Carta virada');
  }

  function layout() {
    medir();
    pos(vagaMonte, xCol(0), geo.g);
    vagaMonte.classList.toggle('vazio-final', monte.length === 0 && descarte.length === 0);
    vagasFundacao.forEach((v, i) => pos(v, xCol(3 + i), geo.g));
    vagasMesa.forEach((v, i) => pos(v, xCol(i), geo.topoMesa));

    monte.forEach((c, i) => colocar(c, xCol(0), geo.g, 10 + i));
    const visiveis = virar === 3 ? 3 : 1;
    const primeiro = Math.max(0, descarte.length - visiveis);
    descarte.forEach((c, i) => colocar(c, xCol(1) + Math.max(0, i - primeiro) * Math.round(geo.cw * 0.24), geo.g, 100 + i));
    fundacoes.forEach((p, f) => p.forEach((c, i) => colocar(c, xCol(3 + f), geo.g, 200 + i)));

    const fechada = Math.round(geo.ch * 0.1);
    const aberta = Math.round(geo.ch * 0.27);
    const cabe = geo.h - geo.topoMesa - geo.ch - geo.g;
    mesa.forEach((p, col) => {
      const total = p.slice(0, -1).reduce((s, c) => s + (c.aberta ? aberta : fechada), 0);
      const k = total > cabe && total > 0 ? Math.max(0.25, cabe / total) : 1;
      let y = geo.topoMesa;
      p.forEach((c, i) => {
        colocar(c, xCol(col), y, 300 + col * 20 + i);
        y += (c.aberta ? aberta : fechada) * k;
      });
    });
  }

  /* Regras */

  function cabeNaFundacao(c: Carta, f: Carta[]) {
    const topo = f[f.length - 1];
    return f.length === 0 ? c.valor === 1 : topo.naipe === c.naipe && c.valor === topo.valor + 1;
  }

  function cabeNaMesa(c: Carta, p: Carta[]) {
    const topo = p[p.length - 1];
    return p.length === 0 ? c.valor === 13 : topo.aberta && vermelha(topo) !== vermelha(c) && c.valor === topo.valor - 1;
  }

  const mesmoLugar = (a: Lugar, b: Lugar) => a.tipo === b.tipo && ('i' in a ? a.i : -1) === ('i' in b ? b.i : -1);

  function mover(grupo: Carta[], origem: Lugar, alvo: Lugar): boolean {
    if (acabou || mesmoLugar(origem, alvo)) return false;
    const c = grupo[0];
    if (alvo.tipo === 'fundacao') {
      if (grupo.length !== 1 || !cabeNaFundacao(c, fundacoes[alvo.i])) return false;
    } else if (alvo.tipo === 'mesa') {
      if (!cabeNaMesa(c, mesa[alvo.i])) return false;
    } else return false;
    salvar();
    const de = pilha(origem);
    de.splice(de.length - grupo.length, grupo.length);
    pilha(alvo).push(...grupo);
    if (origem.tipo === 'mesa') {
      const topo = de[de.length - 1];
      if (topo && !topo.aberta) topo.aberta = true;
    }
    jogada();
    layout();
    verificar();
    return true;
  }

  function virarMonte() {
    if (acabou || (!monte.length && !descarte.length)) return;
    salvar();
    if (monte.length) {
      for (let i = 0; i < virar && monte.length; i++) {
        const c = monte.pop()!;
        c.aberta = true;
        descarte.push(c);
      }
    } else {
      monte = descarte.reverse();
      for (const c of monte) c.aberta = false;
      descarte = [];
    }
    jogada();
    layout();
  }

  // Tocar numa carta: fundação primeiro; senão, a primeira coluna que aceitar.
  function moverParaMelhorLugar(c: Carta) {
    const origem = ondeEsta(c);
    const de = pilha(origem);
    const grupo = origem.tipo === 'mesa' ? de.slice(de.indexOf(c)) : [c];
    if (origem.tipo !== 'mesa' && de[de.length - 1] !== c) return;
    if (grupo.length === 1) for (let f = 0; f < 4; f++) if (mover(grupo, origem, { tipo: 'fundacao', i: f })) return;
    for (let t = 0; t < 7; t++) {
      // Não adianta mudar um rei que já está sozinho numa coluna para outra vazia.
      if (mesa[t].length === 0 && origem.tipo === 'mesa' && de.indexOf(c) === 0) continue;
      if (mover(grupo, origem, { tipo: 'mesa', i: t })) return;
    }
    if (!semMovimento())
      c.el.animate([{ translate: '0' }, { translate: '-4px' }, { translate: '4px' }, { translate: '0' }], { duration: 220 });
  }

  /* Placar e fim de jogo */

  function atualizarPlacar() {
    jogadasEl.textContent = String(jogadas);
    const s = inicio ? Math.floor((Date.now() - inicio) / 1000) : 0;
    tempoEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function jogada() {
    jogadas += 1;
    if (!inicio) {
      inicio = Date.now();
      relogio = window.setInterval(atualizarPlacar, 1000);
    }
    atualizarPlacar();
  }

  function verificar() {
    if (fundacoes.every((p) => p.length === 13)) {
      vencer();
      return;
    }
    if (!completando && !monte.length && !descarte.length && mesa.every((p) => p.every((c) => c.aberta))) completar();
  }

  // Com tudo aberto, as cartas vão sozinhas para as fundações.
  function completar() {
    statusEl.textContent = 'Tudo aberto: terminando sozinho...';
    completando = window.setInterval(
      () => {
        const candidatas = mesa
          .map((p, i) => ({ c: p[p.length - 1], i }))
          .filter((x) => x.c)
          .sort((a, b) => a.c.valor - b.c.valor);
        for (const { c, i } of candidatas)
          for (let f = 0; f < 4; f++)
            if (cabeNaFundacao(c, fundacoes[f])) {
              mover([c], { tipo: 'mesa', i }, { tipo: 'fundacao', i: f });
              return;
            }
        window.clearInterval(completando);
        completando = 0;
      },
      semMovimento() ? 20 : 110,
    );
  }

  function vencer() {
    acabou = true;
    window.clearInterval(relogio);
    window.clearInterval(completando);
    completando = 0;
    const segundos = inicio ? Math.round((Date.now() - inicio) / 1000) : 0;
    const vitorias = (Number(guardado.ler('pac.vitorias')) || 0) + 1;
    guardado.gravar('pac.vitorias', String(vitorias));
    statusEl.textContent = `Vitórias: ${vitorias}`;
    chuvaDeCartas(() => {
      const aviso = document.createElement('div');
      aviso.className = 'pac-vitoria';
      aviso.innerHTML = `<b>Você venceu!</b><p>${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')} e ${jogadas} jogadas.</p>`;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'xp-btn primario';
      b.textContent = 'Jogar de novo';
      b.addEventListener('click', () => novoJogo());
      aviso.append(b);
      mesaEl.append(aviso);
      b.focus({ preventScroll: true });
    });
    o.aoVencer(segundos, jogadas);
  }

  function desenharCarta(ctx: CanvasRenderingContext2D, c: Carta, x: number, y: number) {
    const { cw, ch } = geo;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, cw * 0.08);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = vermelha(c) ? '#d01f2a' : '#111';
    ctx.font = `bold ${Math.round(cw * 0.2)}px Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.fillText(NOME[c.valor], x + cw * 0.08, y + cw * 0.24);
    ctx.fillText(SIMBOLO[c.naipe], x + cw * 0.08, y + cw * 0.46);
    ctx.font = `${Math.round(cw * 0.5)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(SIMBOLO[c.naipe], x + cw / 2, y + ch / 2 + cw * 0.17);
  }

  // A chuva de cartas: cada carta sai da fundação, quica no chão e deixa rastro.
  let pararChuva: (() => void) | null = null;

  function chuvaDeCartas(fim: () => void) {
    if (semMovimento()) {
      fim();
      return;
    }
    const cv = document.createElement('canvas');
    cv.className = 'pac-chuva';
    mesaEl.append(cv);
    const { w, h, cw, ch } = geo;
    const dpr = devicePixelRatio || 1;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const fila: { c: Carta; f: number }[] = [];
    for (let v = 13; v >= 1; v--) for (let f = 0; f < 4; f++) fila.push({ c: fundacoes[f][v - 1], f });
    let atual: { c: Carta; x: number; y: number; vx: number; vy: number } | null = null;
    let quadro = 0;
    const escala = cw / 71;
    const passo = () => {
      if (!atual) {
        const prox = fila.shift();
        if (!prox) {
          terminar();
          return;
        }
        prox.c.el.style.visibility = 'hidden';
        atual = {
          c: prox.c,
          x: xCol(3 + prox.f),
          y: geo.g,
          vx: (Math.random() < 0.75 ? -1 : 1) * (2.5 + Math.random() * 4.5) * escala,
          vy: -Math.random() * 7 * escala,
        };
      }
      atual.vy += 0.5 * escala;
      atual.x += atual.vx;
      atual.y += atual.vy;
      if (atual.y + ch > h) {
        atual.y = h - ch;
        atual.vy = -atual.vy * 0.78;
      }
      desenharCarta(ctx, atual.c, atual.x, atual.y);
      if (atual.x + cw < 0 || atual.x > w) atual = null;
      quadro = requestAnimationFrame(passo);
    };
    const terminar = () => {
      cancelAnimationFrame(quadro);
      cv.remove();
      for (const c of cartas) c.el.style.visibility = '';
      pararChuva = null;
      fim();
    };
    pararChuva = terminar;
    cv.addEventListener('pointerdown', terminar);
    quadro = requestAnimationFrame(passo);
  }

  /* Novo jogo: embaralha e distribui, com as cartas saindo do monte. */

  function novoJogo() {
    pararChuva?.();
    mesaEl.querySelector('.pac-vitoria')?.remove();
    window.clearInterval(relogio);
    window.clearInterval(completando);
    completando = 0;
    acabou = false;
    const baralho = [...cartas];
    for (let i = baralho.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }
    for (const c of baralho) c.aberta = false;
    mesa = [[], [], [], [], [], [], []];
    for (let linha = 0; linha < 7; linha++) for (let col = linha; col < 7; col++) mesa[col].push(baralho.pop()!);
    for (const p of mesa) p[p.length - 1].aberta = true;
    monte = baralho;
    descarte = [];
    fundacoes = [[], [], [], []];
    historico = [];
    desfazerBtn.disabled = true;
    jogadas = 0;
    inicio = 0;
    atualizarPlacar();
    const vitorias = Number(guardado.ler('pac.vitorias')) || 0;
    statusEl.textContent = vitorias ? `Vitórias: ${vitorias}` : 'Arraste as cartas, ou toque numa delas para mandá-la ao melhor lugar.';

    // Todas começam no monte e voam para os lugares.
    medir();
    for (const c of cartas) {
      c.el.classList.add('sem-transicao');
      colocar(c, xCol(0), geo.g, 10);
    }
    void mesaEl.offsetWidth;
    mesa.flat().forEach((c, i) => (c.el.style.transitionDelay = semMovimento() ? '' : `${i * 18}ms`));
    for (const c of cartas) c.el.classList.remove('sem-transicao');
    layout();
    window.setTimeout(() => {
      for (const c of cartas) c.el.style.transitionDelay = '';
    }, 1200);
  }

  /* Arrastar e tocar */

  let arraste: { cartas: Carta[]; origem: Lugar; sx: number; sy: number; moveu: boolean } | null = null;

  mesaEl.addEventListener('pointerdown', (ev) => {
    if (acabou || ev.button !== 0) return;
    const el = (ev.target as Element).closest<HTMLElement>('.carta');
    if (!el) {
      if ((ev.target as Element).closest('.vaga-monte')) virarMonte();
      return;
    }
    const c = cartas[Number(el.dataset.id)];
    const origem = ondeEsta(c);
    if (origem.tipo === 'monte') {
      virarMonte();
      return;
    }
    if (!c.aberta) return;
    const de = pilha(origem);
    let grupo: Carta[];
    if (origem.tipo === 'mesa') grupo = de.slice(de.indexOf(c));
    else if (de[de.length - 1] === c) grupo = [c];
    else return;
    arraste = { cartas: grupo, origem, sx: ev.clientX, sy: ev.clientY, moveu: false };
    mesaEl.setPointerCapture(ev.pointerId);
  });

  mesaEl.addEventListener('pointermove', (ev) => {
    if (!arraste) return;
    const dx = ev.clientX - arraste.sx;
    const dy = ev.clientY - arraste.sy;
    if (!arraste.moveu && Math.hypot(dx, dy) < 5) return;
    if (!arraste.moveu) {
      arraste.moveu = true;
      arraste.cartas.forEach((c, i) => {
        c.el.classList.add('arrastando');
        c.el.style.zIndex = String(2000 + i);
      });
    }
    for (const c of arraste.cartas) c.el.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  function alvoEm(x: number, y: number): Lugar | null {
    const folga = geo.g / 2;
    for (let f = 0; f < 4; f++) {
      const fx = xCol(3 + f);
      if (x >= fx - folga && x <= fx + geo.cw + folga && y <= geo.g + geo.ch + geo.g) return { tipo: 'fundacao', i: f };
    }
    for (let col = 0; col < 7; col++) {
      const cx = xCol(col);
      if (x >= cx - folga && x <= cx + geo.cw + folga && y >= geo.topoMesa - geo.g) return { tipo: 'mesa', i: col };
    }
    return null;
  }

  function soltar(ev: PointerEvent, cancelado = false) {
    const a = arraste;
    arraste = null;
    if (!a) return;
    if (!a.moveu) {
      if (!cancelado) moverParaMelhorLugar(a.cartas[0]);
      return;
    }
    const dx = ev.clientX - a.sx;
    const dy = ev.clientY - a.sy;
    // Troca o deslocamento por posição de verdade, para a carta não "pular" antes de deslizar.
    for (const c of a.cartas) {
      c.el.classList.add('sem-transicao');
      pos(c.el, parseFloat(c.el.style.left) + dx, parseFloat(c.el.style.top) + dy);
      c.el.style.transform = '';
    }
    void mesaEl.offsetWidth;
    for (const c of a.cartas) c.el.classList.remove('sem-transicao', 'arrastando');
    const r = mesaEl.getBoundingClientRect();
    const alvo = cancelado ? null : alvoEm(ev.clientX - r.left, ev.clientY - r.top);
    if (!alvo || !mover(a.cartas, a.origem, alvo)) layout();
  }

  mesaEl.addEventListener('pointerup', (ev) => soltar(ev));
  mesaEl.addEventListener('pointercancel', (ev) => soltar(ev, true));

  raiz.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-pac], [data-pac-virar]');
    if (!b) return;
    if (b.dataset.pac === 'novo') novoJogo();
    else if (b.dataset.pac === 'desfazer') desfazer();
    else if (b.dataset.pacVirar) {
      virar = Number(b.dataset.pacVirar) === 3 ? 3 : 1;
      guardado.gravar('pac.virar', String(virar));
      marcarVirar();
      layout();
    }
  });

  function marcarVirar() {
    for (const b of raiz.querySelectorAll<HTMLElement>('[data-pac-virar]')) b.setAttribute('aria-pressed', String(Number(b.dataset.pacVirar) === virar));
  }

  new ResizeObserver(() => {
    if (!arraste) layout();
  }).observe(mesaEl);

  marcarVirar();
  novoJogo();
  return { novoJogo };
}
