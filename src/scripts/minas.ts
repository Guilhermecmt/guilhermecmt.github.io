// Campo Minado: três níveis, primeiro clique sempre seguro, bandeira no botão direito, no toque
// longo ou no "modo bandeira" (para o celular). Clicar num número com as bandeiras certas em
// volta abre os vizinhos de uma vez.

type Nivel = 'iniciante' | 'intermediario' | 'especialista';

const NIVEIS: Record<Nivel, { linhas: number; colunas: number; minas: number }> = {
  iniciante: { linhas: 9, colunas: 9, minas: 10 },
  intermediario: { linhas: 16, colunas: 16, minas: 40 },
  especialista: { linhas: 16, colunas: 30, minas: 99 },
};

interface Celula {
  l: number;
  c: number;
  mina: boolean;
  aberta: boolean;
  marca: 0 | 1 | 2; // nada, bandeira, interrogação
  vizinhas: number;
  el: HTMLButtonElement;
}

export interface OpcoesMinas {
  raiz: HTMLElement;
  aoMudarTamanho: () => void;
  aoVencer: (segundos: number, recorde: boolean) => void;
  aoPerder: () => void;
}

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

export function iniciarMinas(o: OpcoesMinas) {
  const raiz = o.raiz;
  const q = <T extends Element = HTMLElement>(s: string) => raiz.querySelector<T>(s)!;
  const grade = q('[data-minas-grade]');
  const ledMinas = q('[data-minas-contador]');
  const ledTempo = q('[data-minas-relogio]');
  const carinha = q<HTMLButtonElement>('[data-minas-carinha]');
  const botaoBandeira = q<HTMLButtonElement>('[data-minas-bandeira]');
  const recordeEl = q('[data-minas-recorde]');

  const salvo = guardado.ler('minas.nivel');
  let nivel: Nivel = salvo && salvo in NIVEIS ? (salvo as Nivel) : 'iniciante';
  let cel: Celula[][] = [];
  let estado: 'pronto' | 'jogando' | 'fim' = 'pronto';
  let abertas = 0;
  let bandeiras = 0;
  let inicio = 0;
  let relogio = 0;
  let comBandeira = false;
  let foco = { l: 0, c: 0 };
  let toqueLongo = 0;
  let marcouNoToque = 0;

  const led = (n: number) => (n < 0 ? `-${String(Math.min(99, -n)).padStart(2, '0')}` : String(Math.min(999, n)).padStart(3, '0'));

  const vizinhos = (x: Celula) => {
    const r: Celula[] = [];
    for (let dl = -1; dl <= 1; dl++)
      for (let dc = -1; dc <= 1; dc++) {
        const v = (dl || dc) && cel[x.l + dl]?.[x.c + dc];
        if (v) r.push(v);
      }
    return r;
  };

  function descrever(x: Celula) {
    const como = x.aberta
      ? x.mina
        ? 'mina'
        : x.vizinhas
          ? `${x.vizinhas} ${x.vizinhas === 1 ? 'mina' : 'minas'} em volta`
          : 'vazia'
      : ['fechada', 'bandeira', 'talvez'][x.marca];
    return `Linha ${x.l + 1}, coluna ${x.c + 1}: ${como}`;
  }

  function desenhar(x: Celula) {
    const el = x.el;
    el.className = 'mc';
    if (x.aberta) {
      el.classList.add('aberta');
      if (x.mina) el.classList.add('mina');
      else if (x.vizinhas) el.classList.add(`n${x.vizinhas}`);
      el.textContent = !x.mina && x.vizinhas ? String(x.vizinhas) : '';
    } else {
      el.textContent = x.marca === 2 ? '?' : '';
      if (x.marca === 1) el.classList.add('bandeira');
    }
    el.setAttribute('aria-label', descrever(x));
  }

  function mostrarRecorde() {
    const r = guardado.ler(`minas.recorde.${nivel}`);
    recordeEl.textContent = r ? `Recorde: ${r} s` : 'Sem recorde neste nível';
  }

  function novoJogo(n: Nivel = nivel) {
    nivel = n;
    guardado.gravar('minas.nivel', n);
    const { linhas, colunas, minas } = NIVEIS[n];
    window.clearInterval(relogio);
    estado = 'pronto';
    abertas = 0;
    bandeiras = 0;
    ledMinas.textContent = led(minas);
    ledTempo.textContent = '000';
    carinha.dataset.estado = 'feliz';
    grade.style.setProperty('--colunas', String(colunas));
    grade.dataset.nivel = n;
    grade.replaceChildren();
    cel = [];
    for (let l = 0; l < linhas; l++) {
      const linha: Celula[] = [];
      for (let c = 0; c < colunas; c++) {
        const el = document.createElement('button');
        el.type = 'button';
        el.tabIndex = l === 0 && c === 0 ? 0 : -1;
        el.dataset.l = String(l);
        el.dataset.c = String(c);
        const x: Celula = { l, c, mina: false, aberta: false, marca: 0, vizinhas: 0, el };
        desenhar(x);
        linha.push(x);
        grade.append(el);
      }
      cel.push(linha);
    }
    foco = { l: 0, c: 0 };
    for (const b of raiz.querySelectorAll<HTMLElement>('[data-minas-nivel]')) b.setAttribute('aria-pressed', String(b.dataset.minasNivel === n));
    mostrarRecorde();
    o.aoMudarTamanho();
  }

  // As minas só entram depois do primeiro clique, longe dele.
  function plantar(livre: Celula) {
    const { minas } = NIVEIS[nivel];
    const proibidas = new Set([livre, ...vizinhos(livre)]);
    const lugares = cel.flat().filter((x) => !proibidas.has(x));
    for (let i = 0; i < minas; i++) {
      const j = i + Math.floor(Math.random() * (lugares.length - i));
      [lugares[i], lugares[j]] = [lugares[j], lugares[i]];
      lugares[i].mina = true;
    }
    for (const x of cel.flat()) x.vizinhas = vizinhos(x).filter((v) => v.mina).length;
    estado = 'jogando';
    inicio = Date.now();
    ledTempo.textContent = '001';
    relogio = window.setInterval(() => (ledTempo.textContent = led(Math.floor((Date.now() - inicio) / 1000) + 1)), 1000);
  }

  function abrir(x: Celula) {
    if (estado === 'fim' || x.aberta || x.marca === 1) return;
    if (estado === 'pronto') plantar(x);
    if (x.mina) {
      perder(x);
      return;
    }
    const fila = [x];
    while (fila.length) {
      const y = fila.pop()!;
      if (y.aberta || y.marca === 1) continue;
      y.aberta = true;
      y.marca = 0;
      abertas += 1;
      desenhar(y);
      if (y.vizinhas === 0) for (const v of vizinhos(y)) if (!v.aberta && !v.mina) fila.push(v);
    }
    verificarVitoria();
  }

  function acorde(x: Celula) {
    if (!x.aberta || !x.vizinhas || estado !== 'jogando') return;
    const viz = vizinhos(x);
    if (viz.filter((v) => v.marca === 1).length !== x.vizinhas) return;
    for (const v of viz) {
      if (!v.aberta && v.marca !== 1) abrir(v);
      if (estado === 'fim') return;
    }
  }

  function marcar(x: Celula) {
    if (estado === 'fim' || x.aberta) return;
    x.marca = ((x.marca + 1) % 3) as 0 | 1 | 2;
    bandeiras += x.marca === 1 ? 1 : x.marca === 2 ? -1 : 0;
    ledMinas.textContent = led(NIVEIS[nivel].minas - bandeiras);
    desenhar(x);
  }

  function perder(explodiu: Celula) {
    estado = 'fim';
    window.clearInterval(relogio);
    carinha.dataset.estado = 'morto';
    for (const x of cel.flat()) {
      if (x.mina && x.marca !== 1) {
        x.aberta = true;
        desenhar(x);
      } else if (!x.mina && x.marca === 1) x.el.classList.add('errada');
    }
    explodiu.el.classList.add('explodiu');
    o.aoPerder();
  }

  function verificarVitoria() {
    const { linhas, colunas, minas } = NIVEIS[nivel];
    if (abertas !== linhas * colunas - minas) return;
    estado = 'fim';
    window.clearInterval(relogio);
    carinha.dataset.estado = 'agente';
    for (const x of cel.flat())
      if (x.mina && x.marca !== 1) {
        x.marca = 1;
        desenhar(x);
      }
    bandeiras = minas;
    ledMinas.textContent = led(0);
    const segundos = Math.max(1, Math.round((Date.now() - inicio) / 1000));
    const anterior = Number(guardado.ler(`minas.recorde.${nivel}`)) || Infinity;
    const recorde = segundos < anterior;
    if (recorde) guardado.gravar(`minas.recorde.${nivel}`, String(segundos));
    mostrarRecorde();
    o.aoVencer(segundos, recorde);
  }

  function focar(x: Celula) {
    const antes = cel[foco.l]?.[foco.c];
    if (antes) antes.el.tabIndex = -1;
    x.el.tabIndex = 0;
    foco = { l: x.l, c: x.c };
  }

  const celulaDe = (alvo: EventTarget | null) => {
    const el = (alvo as Element | null)?.closest<HTMLElement>('.mc');
    return el ? cel[Number(el.dataset.l)]?.[Number(el.dataset.c)] ?? null : null;
  };

  grade.addEventListener('pointerdown', (ev) => {
    const x = celulaDe(ev.target);
    if (!x || estado === 'fim') return;
    if (ev.button === 0 && !x.aberta && x.marca !== 1 && !comBandeira) carinha.dataset.estado = 'oh';
    if (ev.pointerType !== 'mouse') {
      window.clearTimeout(toqueLongo);
      toqueLongo = window.setTimeout(() => {
        marcar(x);
        marcouNoToque = Date.now();
        navigator.vibrate?.(25);
        if (estado !== 'fim') carinha.dataset.estado = 'feliz';
      }, 430);
    }
  });

  const soltar = () => {
    window.clearTimeout(toqueLongo);
    if (carinha.dataset.estado === 'oh') carinha.dataset.estado = 'feliz';
  };
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) grade.addEventListener(ev, soltar);

  grade.addEventListener('click', (ev) => {
    const x = celulaDe(ev.target);
    if (!x) return;
    if (Date.now() - marcouNoToque < 700) return; // o toque longo já pôs a bandeira
    focar(x);
    if (x.aberta) acorde(x);
    else if (comBandeira) marcar(x);
    else abrir(x);
  });

  grade.addEventListener('contextmenu', (ev) => {
    const x = celulaDe(ev.target);
    if (!x) return;
    ev.preventDefault();
    if (Date.now() - marcouNoToque < 700) return;
    marcar(x);
  });

  grade.addEventListener('keydown', (ev) => {
    const x = celulaDe(ev.target);
    if (!x) return;
    const passos: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const p = passos[ev.key];
    if (p) {
      ev.preventDefault();
      ev.stopPropagation();
      const y = cel[x.l + p[0]]?.[x.c + p[1]];
      if (y) {
        focar(y);
        y.el.focus();
      }
    } else if (ev.key.toLowerCase() === 'f') {
      ev.preventDefault();
      marcar(x);
    }
  });

  carinha.addEventListener('click', () => novoJogo());
  raiz.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-minas-nivel]');
    if (b) novoJogo(b.dataset.minasNivel as Nivel);
  });
  botaoBandeira.addEventListener('click', () => {
    comBandeira = !comBandeira;
    botaoBandeira.setAttribute('aria-pressed', String(comBandeira));
  });

  novoJogo();
  return { novoJogo };
}
