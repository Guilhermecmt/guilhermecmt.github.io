"""Gera o papel de parede do MacêdOS XP: uma colina verde sob nuvens, no espírito da "Bliss" do XP,
mas desenhada inteiramente por código (a foto original tem direitos autorais).

Uso:  python design/papel/gerar.py [largura]
Saída: public/papel/{dia,tarde,noite}.webp

Só depende de numpy e Pillow. As sementes são fixas, então o resultado é sempre o mesmo.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'public' / 'papel'


# ---------- utilidades ----------

def ampliar(a, w, h):
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), Image.BICUBIC))


def caixa(a, r, eixo):
    # Média móvel de largura 2r+1 por soma acumulada.
    if r < 1:
        return a
    pad = [(0, 0), (0, 0)]
    pad[eixo] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=eixo, dtype=np.float64)
    n = a.shape[eixo]
    fim = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    ini = np.take(c, np.arange(0, n), axis=eixo)
    return ((fim - ini) / (2 * r + 1)).astype(np.float32)


def desfocar(a, r):
    """Aproxima um desfoque gaussiano de raio r com três passadas de caixa."""
    r = int(round(r / 1.7))
    for _ in range(3):
        a = caixa(caixa(a, r, 0), r, 1)
    return a


def ruido(w, h, escala, oitavas, semente, esticar=1.0, persist=0.5):
    """Ruído fractal (fBm) entre 0 e 1. `esticar` > 1 alonga as manchas na horizontal."""
    rng = np.random.default_rng(semente)
    total = np.zeros((h, w), np.float32)
    amp, soma = 1.0, 0.0
    for o in range(oitavas):
        cx = max(2, int(w / escala * (2 ** o) / esticar))
        cy = max(2, int(h / escala * (2 ** o)))
        total += ampliar(rng.random((cy, cx)), w, h) * amp
        soma += amp
        amp *= persist
    total /= soma
    lo, hi = np.percentile(total, 1), np.percentile(total, 99)
    return np.clip((total - lo) / (hi - lo), 0, 1)


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def misturar(c1, c2, t):
    t = t[..., None]
    return np.asarray(c1, np.float32) * (1 - t) + np.asarray(c2, np.float32) * t


def gradiente(v, paradas):
    """paradas: lista de (posição, (r, g, b)) em 0..1."""
    out = np.zeros(v.shape + (3,), np.float32)
    pos = [p for p, _ in paradas]
    for i in range(3):
        out[..., i] = np.interp(v, pos, [c[i] for _, c in paradas])
    return out


# ---------- paletas ----------

PALETAS = {
    'dia': dict(
        ceu=[(0.0, (0.07, 0.30, 0.80)), (0.30, (0.15, 0.44, 0.90)), (0.52, (0.38, 0.65, 0.96)), (0.66, (0.70, 0.85, 0.99))],
        nuvem_luz=(1.0, 1.0, 1.0), nuvem_sombra=(0.58, 0.66, 0.80), nuvem_forca=1.0,
        grama_alto=(0.50, 0.78, 0.18), grama_meio=(0.30, 0.60, 0.08), grama_baixo=(0.14, 0.38, 0.04),
        mancha=(0.70, 0.82, 0.24), nevoa=(0.62, 0.80, 0.80), fundo=(0.30, 0.55, 0.30),
        tinta=(1.0, 1.0, 1.0), estrelas=0.0, brilho=None,
    ),
    'tarde': dict(
        ceu=[(0.0, (0.17, 0.17, 0.45)), (0.25, (0.42, 0.28, 0.58)), (0.45, (0.85, 0.45, 0.48)), (0.62, (1.0, 0.72, 0.45))],
        nuvem_luz=(1.0, 0.82, 0.70), nuvem_sombra=(0.48, 0.36, 0.55), nuvem_forca=0.95,
        grama_alto=(0.62, 0.66, 0.18), grama_meio=(0.36, 0.45, 0.10), grama_baixo=(0.14, 0.22, 0.06),
        mancha=(0.80, 0.66, 0.22), nevoa=(0.95, 0.66, 0.50), fundo=(0.40, 0.38, 0.30),
        tinta=(1.0, 0.92, 0.80), estrelas=0.12, brilho=((0.80, 0.56), (1.0, 0.78, 0.50), 0.45),
    ),
    'noite': dict(
        ceu=[(0.0, (0.01, 0.03, 0.10)), (0.35, (0.03, 0.08, 0.22)), (0.55, (0.08, 0.17, 0.38)), (0.66, (0.16, 0.28, 0.50))],
        nuvem_luz=(0.42, 0.50, 0.68), nuvem_sombra=(0.08, 0.12, 0.24), nuvem_forca=0.8,
        grama_alto=(0.13, 0.30, 0.16), grama_meio=(0.07, 0.19, 0.10), grama_baixo=(0.02, 0.07, 0.04),
        mancha=(0.16, 0.30, 0.20), nevoa=(0.20, 0.30, 0.45), fundo=(0.08, 0.16, 0.16),
        tinta=(0.80, 0.88, 1.0), estrelas=1.0, brilho=((0.57, 0.24), (0.85, 0.90, 1.0), 0.30),
    ),
}

# Nuvens: (centro x, centro y, raio x, raio y, peso), em frações da tela.
NUVENS = [
    (0.17, 0.22, 0.19, 0.095, 1.00),
    (0.36, 0.15, 0.09, 0.050, 0.90),
    (0.79, 0.27, 0.16, 0.075, 1.00),
    (0.97, 0.20, 0.08, 0.050, 0.85),
    (0.58, 0.40, 0.12, 0.048, 0.85),
    (0.06, 0.45, 0.10, 0.045, 0.80),
    (0.90, 0.47, 0.09, 0.040, 0.80),
]


def gerar(nome, W, H):
    p = PALETAS[nome]
    k = W / 2560  # escala dos detalhes em pixels
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = x / W, y / H

    # --- céu ---
    ceu = gradiente(v + 0.04 * (u - 0.3), p['ceu'])
    if p['brilho']:
        (bx, by), cor, forca = p['brilho']
        d = np.sqrt(((u - bx) * W / H) ** 2 + (v - by) ** 2)
        g = np.exp(-(d / 0.22) ** 2) * forca
        ceu = ceu * (1 - g[..., None]) + np.asarray(cor) * g[..., None]
        if nome == 'noite':
            # a lua: um disco nítido dentro do brilho
            disco = suave(0.032, 0.029, d)[..., None]
            ceu = ceu * (1 - disco) + np.asarray((0.93, 0.95, 1.0)) * disco

    # --- estrelas ---
    if p['estrelas'] > 0:
        rng = np.random.default_rng(7)
        n = int(1400 * (W * H) / (2560 * 1600))
        sx = rng.integers(0, W, n)
        sy = (rng.random(n) ** 1.6 * H * 0.6).astype(int)
        mag = rng.random(n) ** 3
        campo = np.zeros((H, W), np.float32)
        campo[sy, sx] = 0.35 + 0.65 * mag
        campo = np.maximum(campo, desfocar(campo, 1.2 * k) * 2.2)
        ceu = ceu + campo[..., None] * p['estrelas'] * (1 - v[..., None] / 0.62).clip(0, 1)

    # --- nuvens ---
    # Cada nuvem é um cúmulo: vários tufos redondos sobre uma base quase reta, depois recortados por
    # ruído fractal para a borda ficar irregular.
    ax, ay = x / H, y / H  # unidades proporcionais à altura, para os tufos ficarem redondos
    rng = np.random.default_rng(5)
    tufos = np.zeros((H, W), np.float32)
    for cx, cy, rx, ry, peso in NUVENS:
        cxa, base = cx * W / H, cy + ry * 0.55
        uma = np.zeros((H, W), np.float32)
        for _ in range(int(14 + 40 * rx)):
            off = float(np.clip(rng.normal(0, 0.45), -1, 1))
            px = cxa + off * rx * W / H * 0.85
            r = ry * rng.uniform(0.45, 1.15) * (1 - 0.45 * abs(off))
            py = base - r * rng.uniform(0.25, 1.0)
            d2 = ((ax - px) ** 2 + (ay - py) ** 2) / (r * r)
            uma += np.exp(-d2 * 2.2) * peso * 0.85
        # base achatada: abaixo da base a nuvem some rápido
        tufos += uma * (1 - suave(base, base + ry * 0.5, ay))
    forma = ruido(W, H, 260 * k, 6, 11, esticar=1.4, persist=0.6)
    fino = ruido(W, H, 40 * k, 4, 12)
    dens = np.clip(tufos, 0, 1.6) * (0.55 + 0.75 * forma) + 0.18 * (fino - 0.5)
    dens = suave(0.38, 0.85, dens)
    # fiapos altos, alongados (cirros)
    cirro = suave(0.62, 0.95, ruido(W, H, 300 * k, 5, 14, esticar=7, persist=0.6))
    cirro *= np.exp(-((v - 0.1) / 0.1) ** 2) * 0.45
    # Luz do alto: quem tem muita nuvem acima fica mais escuro (a barriga da nuvem).
    desl = max(1, int(30 * k))
    acima = np.zeros_like(dens)
    acima[desl:] = dens[:-desl]
    sombra = desfocar(acima, 22 * k)
    luz = np.clip(1.05 - 0.9 * sombra + 0.25 * (fino - 0.5), 0, 1) ** 1.1
    cor_nuvem = misturar(p['nuvem_sombra'], p['nuvem_luz'], luz)
    alfa = np.clip(np.maximum(dens, cirro) * p['nuvem_forca'], 0, 1)[..., None]
    ceu = ceu * (1 - alfa) + cor_nuvem * alfa

    # --- colinas ---
    def frente(uu):
        return 0.548 + 0.58 * (uu - 0.37) ** 2 + 0.012 * np.sin(uu * 7.0)

    def atras(uu):
        return 0.615 + 0.02 * np.sin(uu * 5.2 + 0.6) - 0.025 * uu

    yf = frente(u)
    yb = atras(u)
    borda = 1.2 / H
    cob_f = suave(yf - borda, yf + borda, v)
    cob_b = suave(yb - borda, yb + borda, v)

    # morro do fundo, azulado pela distância
    tex_b = ruido(W, H, 60 * k, 4, 21, esticar=3)
    fundo = np.asarray(p['fundo'], np.float32) * (0.9 + 0.2 * tex_b[..., None])
    fundo = misturar(fundo, p['nevoa'], np.clip(0.55 - (v - yb) * 9, 0, 0.55))
    img = ceu * (1 - cob_b[..., None]) + fundo * cob_b[..., None]

    # morro da frente: grama com manchas alongadas e grão fino
    t = np.clip((v - yf) / (1 - yf), 0, 1)
    grama = gradiente(t, [(0.0, p['grama_alto']), (0.35, p['grama_meio']), (1.0, p['grama_baixo'])])
    manchas = ruido(W, H, 380 * k, 5, 31, esticar=3.5)
    faixas = ruido(W, H, 120 * k, 4, 32, esticar=6)
    grao = ruido(W, H, 6 * k, 2, 33)
    grama = misturar(grama, p['mancha'], suave(0.5, 0.9, manchas) * 0.55 * (1 - t))
    grama = grama * (0.80 + 0.34 * faixas[..., None]) * (0.95 + 0.10 * grao[..., None])
    # sol vindo da esquerda: a encosta esquerda é mais clara
    luz_sol = 1 + 0.14 * np.exp(-((u - 0.30) / 0.28) ** 2) * (1 - t) - 0.10 * u * t
    grama = grama * luz_sol[..., None]
    # névoa fininha na crista
    grama = misturar(grama, p['nevoa'], np.exp(-t * 40) * 0.28)
    grama = grama * np.asarray(p['tinta'], np.float32)
    img = img * (1 - cob_f[..., None]) + grama * cob_f[..., None]

    # --- vinheta leve ---
    vin = 1 - 0.16 * (((u - 0.5) * 1.3) ** 2 + ((v - 0.45) * 1.1) ** 2)
    img = img * vin[..., None]

    rgb = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(rgb, 'RGB')


if __name__ == '__main__':
    W = int(sys.argv[1]) if len(sys.argv) > 1 else 2560
    H = round(W * 10 / 16)
    destino = Path(sys.argv[2]) if len(sys.argv) > 2 else SAIDA
    destino.mkdir(parents=True, exist_ok=True)
    for nome in PALETAS:
        im = gerar(nome, W, H)
        arq = destino / f'{nome}.webp'
        im.save(arq, 'WEBP', quality=84, method=6)
        print(arq, f'{arq.stat().st_size // 1024} KB')
