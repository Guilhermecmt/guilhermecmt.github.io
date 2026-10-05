---
titulo: Gymnous Mind
resumo: App de treinos para casa, calistenia e academia que monta o treino e sobe a carga quando você bate a meta.
ordem: 5
tipo: App de desktop e celular
periodo: '2026'
situacao: Em desenvolvimento
codigo: privado
stack: [JavaScript, Electron, Capacitor, SQLite, Node.js, ESLint, Playwright]
numeros:
  - { valor: '190+', rotulo: exercícios com foto e vídeo }
  - { valor: '27', rotulo: músculos no filtro }
  - { valor: '3', rotulo: modalidades }
  - { valor: '1.8', rotulo: versão atual }
capa: ../../assets/projetos/gymnous-mind/capa.webp
capaAlt: Tela de treino do Gymnous Mind mostrando a progressão automática de 10 kg para 11 kg.
galeria:
  - src: ../../assets/projetos/gymnous-mind/exercicios.webp
    alt: Biblioteca de exercícios filtrada por região e músculo.
    legenda: A biblioteca filtra por região e por músculo. Cada exercício declara os músculos principais e os secundários.
  - src: ../../assets/projetos/gymnous-mind/treino.webp
    alt: Treino em andamento com vídeo do exercício, cronômetro e sequência.
    legenda: Durante o treino, o app mostra o vídeo, controla séries e descanso e guarda o progresso mesmo se fechar.
---

## O problema

Quem treina em casa tem pouco equipamento, quem faz calistenia depende do próprio peso e quem vai à
academia tem máquina de sobra. Os apps de treino costumam tratar todo mundo igual. O Gymnous Mind
começa perguntando o objetivo, onde a pessoa treina, o que ela tem em casa e quanto tempo tem, e monta
o plano a partir disso.

## O que ele faz

- **Planos A, B e C** para casa, calistenia e academia. Se você não tem um equipamento, o plano troca
  o exercício sozinho por uma alternativa equivalente: mesmo músculo, nível e tipo mais próximos.
- **Montar meu treino:** você marca regiões e músculos (escápula, deltoide posterior, lombar...) e o app
  mostra só o que trabalha aquilo, ou gera o treino completo para a duração e o objetivo escolhidos.
- **Progressão automática:** quando você fecha todas as séries no alvo, o próximo treino começa um passo
  acima, no menor incremento real do equipamento (2,5 kg na barra, 1 kg no halter, uma repetição no peso
  do corpo). Se a série cai abaixo de 60% do alvo, a carga desce. A tela explica de onde veio o número.
- **Histórico** com estatísticas, mapa de calor de 18 semanas e evolução por exercício, incluindo 1RM
  estimado.

## Decisões técnicas

Tudo fica num banco **SQLite local**, com cópia automática diária e exportação em JSON. Não há servidor
nem conta na nuvem. A interface é HTML, CSS e JavaScript puro, sem bundler, e a mesma base roda no
Electron (Windows) e no Capacitor (Android e iOS).

Os 44 exercícios de equipamento de casa que não têm foto livre ganharam uma ilustração anatômica
própria: um boneco vetorial desenhado na hora por código, a partir de poses declaradas por exercício.
Isso não aumenta em nada o tamanho do instalador.

As fotos passaram por revisão: cada imagem tem origem, licença e situação registradas num manifesto.
Uma segunda rodada, com seis revisores olhando a foto e não o nome do arquivo, encontrou erros da
primeira. Hoje os testes falham se uma foto aprovada repetir o mesmo arquivo nos dois quadros.
