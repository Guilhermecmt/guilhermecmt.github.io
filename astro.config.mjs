// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Quando o domínio estiver definido, preencha `site` (usado nas URLs absolutas do Open Graph).
  // site: 'https://seudominio.com.br',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
