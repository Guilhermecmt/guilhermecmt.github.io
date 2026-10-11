---
titulo: ArteAqui
resumo: Projeto de conclusão de curso da faculdade, um mapa dos eventos culturais da cidade que mostra o que está acontecendo ao redor de quem abre.
ordem: 10
tipo: Projeto de conclusão de curso
periodo: '2018'
situacao: Concluído
codigo: aberto
stack: [TypeScript, Angular, Ionic, Firebase, Geolocalização, Leaflet, OpenStreetMap]
numeros:
  - { valor: '332', rotulo: pontos culturais de Salvador no mapa }
  - { valor: '15', rotulo: categorias, de teatro a capoeira }
  - { valor: '0', rotulo: custo para quem organiza o evento }
links:
  demo: https://guilhermecmt.github.io/ArteAqui1.0/
  codigo: https://github.com/eduardosilva97/ArteAqui1.0
capa: ../../assets/projetos/arteaqui/capa.webp
capaAlt: Mapa de Salvador no ArteAqui, com marcadores coloridos por categoria, grupos de eventos próximos e a barra de filtros com Festa popular, Carnaval, Música, Dança, Capoeira, Teatro, Cinema e Museu.
galeria:
  - src: ../../assets/projetos/arteaqui/celular.webp
    alt: O ArteAqui aberto num celular, com o mapa de Salvador e os filtros de categoria no topo.
    legenda: A versão no ar abre direto no mapa, sem login, e funciona no celular, no tablet e no computador.
---

## A ideia

O ArteAqui foi o projeto de conclusão de curso da faculdade, feito em dupla com Eduardo Silva.
A ideia principal era **mapear todos os eventos culturais da cidade** e mostrar o que está
acontecendo ao redor do usuário: abrir o mapa e ver o show, a peça, a feira ou a roda de capoeira que
está perto de você.

## Como ele se sustentaria

- **Parceria com o governo:** a intenção era fechar uma parceria governamental para ter acesso à
  agenda cultural oficial da cidade e colocar tudo no mapa.
- **Organizadores de graça:** quem organiza um evento poderia cadastrá-lo na plataforma sem pagar
  nada, para fomentar o trabalho dos produtores culturais.
- **Grandes eventos pagando a conta:** os custos do projeto seriam bancados pelos eventos de grande
  porte que quisessem anunciar dentro da plataforma.

## O que foi construído

O foco do TCC foi o **motor interno**, e as telas ficaram pela metade. O motor cuida da conta do
usuário (e-mail e Facebook), do cadastro de eventos com local, data, preço, classificação e gênero, da
localização de quem abre e da marcação de cada evento no mapa, tudo sobre o Firebase.

## A versão no ar

Em 2026 o motor voltou a rodar e ganhou uma interface completa, para mostrar a ideia funcionando. O Firebase e a chave do mapa de 2018 já não funcionavam, então os
dados passaram a ficar no próprio navegador e o mapa trocou o Google Maps pelo OpenStreetMap, que não
precisa de chave. O mapa já vem com **332 pontos culturais de
Salvador** (teatros, museus, cinemas, festas populares, circuitos do carnaval, ensaios, rodas de
capoeira e feiras), com data, preço e fonte, separados em 15 categorias com cor e ícone próprios.
