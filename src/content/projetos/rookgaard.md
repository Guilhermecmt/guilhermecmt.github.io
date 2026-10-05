---
titulo: Rookgaard
resumo: Um RPG 2D no estilo Tibia feito do zero em JavaScript puro sobre Canvas, sem frameworks e sem nenhum arquivo de imagem ou som.
ordem: 9
tipo: Jogo no navegador
periodo: '2026'
situacao: Concluído
codigo: privado
stack: [JavaScript, HTML5 Canvas, Web Audio, Node.js, Playwright]
numeros:
  - { valor: '0', rotulo: dependências para jogar }
  - { valor: '0', rotulo: arquivos de imagem ou som }
  - { valor: '3', rotulo: territórios }
capa: ../../assets/projetos/rookgaard/capa.webp
capaAlt: O herói na saída do templo de Rookgaard, com painéis de vida, mana, skills e minimapa.
galeria:
  - src: ../../assets/projetos/rookgaard/abertura.webp
    alt: Tela de abertura do Rookgaard com o botão Novo Jogo.
    legenda: A tela de abertura. O progresso fica salvo no navegador e o jogo oferece continuar a jornada.
---

## O que é

Um RPG de ação ambientado em Rookgaard, a ilha onde todo jogador de Tibia começou. Você sai do templo,
caça monstros em três territórios (a Floresta das Aranhas, a Cripta dos Mortos e os Esgotos
Infestados), sobe de nível, equipa itens, fabrica objetos e negocia com NPCs.

## Feito do zero

Não há framework, bundler nem dependência para jogar. **Todo o conteúdo visual é gerado por código:**
os sprites em pixel art são desenhados em canvas e os efeitos sonoros são sintetizados com a Web Audio
API. Não existe um único arquivo de imagem ou de áudio no projeto.

## Organização

- Um **motor genérico** que não sabe o que é Rookgaard: renderização, entrada, câmera, partículas,
  janelas arrastáveis, áudio e salvamento.
- O **conteúdo do jogo** (mundo, monstros, combate, magias) em módulos separados.
- Todo o **balanceamento e o mapa em JSON**, sem números mágicos no código, com um validador que confere
  as referências cruzadas entre os arquivos.
- Um teste de ponta a ponta com Playwright que abre o jogo num navegador real, joga um pouco e confere
  que nada quebrou.
