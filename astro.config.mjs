// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Endereço do GitHub Pages. Com domínio próprio, troque aqui também (vale para o Open Graph).
  site: 'https://guilhermecmt.github.io',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
