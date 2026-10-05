# Portfólio

Site pessoal com os projetos de Guilherme Macêdo. É estático, feito com [Astro](https://astro.build),
e não tem JavaScript além do botão de tema.

O código dos projetos mostrados continua nos repositórios privados. Aqui ficam só o texto e as capturas de tela.

## Rodar

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # gera dist/
npm run preview   # serve o dist/ para conferir
```

Node 22 ou mais novo.

## Onde mexer

| O quê | Onde |
|---|---|
| Nome, e-mail, LinkedIn, GitHub | `src/site.config.ts` (campo vazio esconde o link) |
| Um projeto | `src/content/projetos/<slug>.md`: o cabeçalho tem os dados do cartão, e o corpo é o texto da página |
| Imagens dos projetos | `src/assets/projetos/<slug>/`. O Astro gera as versões responsivas no build |
| Cores e fontes | `src/styles/global.css` (tokens em `:root`, tema escuro logo abaixo) |
| Capa do Alexandria | fonte editável em `design/alexandria-capa.svg`; a capa usada é o `.webp` gerado a partir dela |

Para adicionar um projeto, crie o `.md` com os mesmos campos dos outros. O esquema está em
`src/content.config.ts`, e o build falha se faltar algum campo. `ordem` define a posição na página
inicial, e o projeto com `ordem: 1` aparece em destaque.

Antes de pôr uma captura nova, confira que ela não mostra chave, senha, dado de cliente ou dado financeiro real.

## Publicar no Cloudflare Pages

1. No painel da Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, e escolha
   `Guilhermecmt/portfolio`. O Cloudflare lê repositórios privados.
2. Configuração do build:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - A versão do Node vem do arquivo `.node-version` (22).
3. Cada push no `main` publica de novo. Branches e pull requests ganham uma URL de pré-visualização.
4. Domínio próprio: em **Custom domains**, adicione o domínio. Depois preencha `site` em
   `astro.config.mjs` com a URL final, para as imagens de compartilhamento (Open Graph) saírem com
   endereço absoluto.

O arquivo `public/_headers` define o cache longo dos arquivos em `/_astro/` e cabeçalhos básicos de segurança.
