// Ícone de cada projeto: um "squircle" com o brilho do XP e um desenho branco por cima.
// O desenho é um trecho de SVG num quadro de 48 × 48; a chave é o nome do arquivo em src/content/projetos.

export interface IconeProjeto {
  cores: [string, string];
  desenho: string;
}

export const iconesProjeto: Record<string, IconeProjeto> = {
  'academia-dos-sabios': {
    cores: ['#ffd77e', '#c47a18'],
    desenho:
      '<path d="M11.5 15 24 8.5 36.5 15Z"/><path d="M13.5 16.5h21v2.6h-21Z"/><path d="M15.5 20.5h3.2v12.4h-3.2ZM22.4 20.5h3.2v12.4h-3.2ZM29.3 20.5h3.2v12.4h-3.2Z"/><path d="M13.5 34.2h21v2.6h-21ZM11.5 37.8h25v2.8h-25Z"/>',
  },
  alexandria: {
    cores: ['#a796ff', '#4a2fc4'],
    desenho:
      '<path d="M24 16.2c-3.3-2.6-7.6-3.6-12.3-3.2v21.6c4.7-.4 9 .6 12.3 3.2 3.3-2.6 7.6-3.6 12.3-3.2V13c-4.7-.4-9 .6-12.3 3.2Z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 16.5v20.8" stroke="#fff" stroke-width="2.4"/>',
  },
  'gymnous-mind': {
    cores: ['#63e6a6', '#0f8a5c'],
    desenho:
      '<rect x="8" y="18.5" width="4.5" height="11" rx="1.4"/><rect x="12.8" y="14.5" width="5" height="19" rx="1.6"/><rect x="30.2" y="14.5" width="5" height="19" rx="1.6"/><rect x="35.5" y="18.5" width="4.5" height="11" rx="1.4"/><rect x="17.5" y="22.4" width="13" height="3.2" rx="1"/>',
  },
  stockgenius: {
    cores: ['#62b6ff', '#0d55c9'],
    desenho:
      '<path d="M11 32.5 19 24.5l6 4.5 11.5-12.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M29.5 15.8h7.6v7.6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 37.5h28" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>',
  },
  nous: {
    cores: ['#ff92d4', '#8a34d8'],
    desenho:
      '<path d="M22 9.5c1.6 7.6 4.3 10.3 11.9 11.9-7.6 1.6-10.3 4.3-11.9 11.9-1.6-7.6-4.3-10.3-11.9-11.9C17.7 19.8 20.4 17.1 22 9.5Z"/><path d="M34 28.5c.8 3.6 2 4.8 5.6 5.6-3.6.8-4.8 2-5.6 5.6-.8-3.6-2-4.8-5.6-5.6 3.6-.8 4.8-2 5.6-5.6Z"/>',
  },
  'llm-hub': {
    cores: ['#7fe0ff', '#14708f'],
    desenho:
      '<rect x="15" y="15" width="18" height="18" rx="3.2" fill="none" stroke="#fff" stroke-width="2.6"/><rect x="20.2" y="20.2" width="7.6" height="7.6" rx="1.4"/><path d="M19.5 10.5v4M24 10.5v4M28.5 10.5v4M19.5 33.5v4M24 33.5v4M28.5 33.5v4M10.5 19.5h4M10.5 24h4M10.5 28.5h4M33.5 19.5h4M33.5 24h4M33.5 28.5h4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  },
  compressor: {
    cores: ['#6ff0d6', '#0c8a7c'],
    desenho:
      '<path d="M10.5 10.5l8 8M19 12.5v6h-6M37.5 10.5l-8 8M29 12.5v6h6M10.5 37.5l8-8M19 35.5v-6h-6M37.5 37.5l-8-8M29 35.5v-6h6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'dashboards-hub': {
    cores: ['#ff96ad', '#c2264f'],
    desenho:
      '<rect x="9" y="11" width="30" height="26" rx="3.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M15.5 31v-5M21.5 31v-10M27.5 31v-7M33.5 31v-13" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>',
  },
  rookgaard: {
    cores: ['#ffa36e', '#c03a17'],
    desenho:
      '<path d="M34.8 9.8h4.4v4.4L23.5 29.9l-4.4-4.4Z"/><path d="M14.6 25.4l8 8" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M18.6 29.4l-7.4 7.4" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><circle cx="10.4" cy="37.6" r="2.4"/>',
  },
};

export const iconePadrao: IconeProjeto = {
  cores: ['#c9d3e6', '#6f7f9c'],
  desenho: '<rect x="15" y="12" width="18" height="24" rx="2"/>',
};

export function iconeDe(slug: string): IconeProjeto {
  return iconesProjeto[slug] ?? iconePadrao;
}
