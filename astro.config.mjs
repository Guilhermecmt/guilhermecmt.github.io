// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Endereço do GitHub Pages. Com domínio próprio, troque aqui também (vale para o Open Graph).
  site: 'https://guilhermecmt.github.io',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // A barra de ferramentas do Astro (só no `npm run dev`) ficava em cima do Dock.
  devToolbar: { enabled: false },
});
