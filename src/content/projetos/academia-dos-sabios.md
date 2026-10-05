---
titulo: Academia dos Sábios
resumo: Conversas com filósofos da história, reconstruídos a partir das próprias obras e citando o texto original.
ordem: 1
tipo: Produto web
periodo: '2026'
situacao: No ar
codigo: privado
stack: [TypeScript, React, Vite, Node.js, PostgreSQL, Zod, Playwright, Claude · OpenAI · Gemini]
numeros:
  - { valor: '7', rotulo: personagens }
  - { valor: '57', rotulo: obras no acervo }
  - { valor: '4.449', rotulo: passagens citáveis }
  - { valor: '26', rotulo: decisões registradas em ADR }
links:
  demo: https://academia-dos-sabios-server.vercel.app
capa: ../../assets/projetos/academia-dos-sabios/capa.webp
capaAlt: Página inicial da Academia dos Sábios, com Sócrates sentado entre as colunas e a Acrópole ao fundo.
galeria:
  - src: ../../assets/projetos/academia-dos-sabios/biblioteca.webp
    alt: A Biblioteca Filosófica, com a linha do tempo das obras de Pitágoras.
    legenda: A biblioteca reúne cada obra do acervo com ficha de estudo e o convite para conversar com o autor.
  - src: ../../assets/projetos/academia-dos-sabios/cena-platao.webp
    alt: Ilustração da sala de Platão.
    legenda: Cada mestre tem a sua sala, com cena própria.
  - src: ../../assets/projetos/academia-dos-sabios/cena-confucio.webp
    alt: Ilustração da sala de Confúcio.
---

## A ideia

Conversar com Sócrates, Marco Aurélio ou Confúcio, e ouvir de volta o que eles de fato escreveram ou
disseram, não uma imitação genérica. Quando um personagem cita uma passagem, ela vem de uma edição
crítica, com o original grego ou chinês ao lado da tradução.

## Como foi construído

O coração do projeto é um **motor de personagens orientado a dados**. Nenhuma linha de código sabe
quem é Sócrates: cada personagem é uma pasta de arquivos JSON validados por esquema, e o motor monta
a identidade de forma determinística a partir deles. A IA só gera texto, por uma única porta, e dá
para trocar de provedor (Claude, OpenAI, Gemini ou um modelo falso para testes) só por configuração.

A arquitetura é hexagonal: o núcleo é puro, e banco, provedores de IA, e-mail e leitura do acervo são
adaptadores plugáveis. Em desenvolvimento tudo roda em memória, sem chave de IA e sem banco. Em
produção, as conversas, as contas e a memória de cada pessoa ficam no PostgreSQL.

## O acervo

As passagens vêm de Perseus, First1KGreek e Wikisource, baixadas e alinhadas por script, nunca
digitadas à mão. Onde a obra é feita de unidades discretas, há uma passagem por capítulo da edição:
cada um dos 486 capítulos das *Meditações*, cada um dos 499 versos dos *Analectos*. O que é paráfrase
ou testemunho (caso de Pitágoras, que nada escreveu) é rotulado como tal no prompt, para o personagem
não citar como sua uma frase que não é.

Um job semanal baixa as fontes de novo e confere, passagem por passagem, se o texto gravado ainda bate
com o das edições. É o jeito de perceber uma reedição sem ninguém precisar reprocessar o acervo à mão.

## O que mais tem

- Contas com e-mail e senha, recuperação de senha por e-mail e modo visitante que passa o histórico
  para a conta quando a pessoa se cadastra.
- Chave própria de IA (BYOK) para quem quiser usar a sua, sem que ela toque o banco ou os logs.
- Respostas em streaming, trilhas de estudo com progresso e painel administrativo.
- Testes unitários, de integração contra PostgreSQL real e de ponta a ponta no navegador com Playwright.
