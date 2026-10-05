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

## Publicação

O site fica no GitHub Pages, de graça, em **https://guilhermecmt.github.io/**. Todo push no `main`
roda o workflow `.github/workflows/deploy.yml`, que faz o build e publica em um ou dois minutos.
Para acompanhar: `gh run list --workflow deploy.yml`.

O repositório precisa ser público, porque o Pages do plano gratuito só publica a partir de
repositório público. Isso não expõe nada: aqui só estão o texto e as imagens que o site já mostra.

Para usar um domínio próprio mais tarde, configure em Settings → Pages → Custom domain e troque
`site` em `astro.config.mjs`.
