---
titulo: Nous
resumo: Uma IA privada que roda inteira no seu PC, com chat, visão, geração de imagem e memória, instalada em dois cliques.
ordem: 7
tipo: App para Windows
periodo: '2026'
situacao: Disponível
codigo: aberto
stack: [Python, PowerShell, Ollama, Open WebUI, ComfyUI, Flux]
numeros:
  - { valor: '100%', rotulo: local, sem nuvem }
  - { valor: '2', rotulo: cliques para instalar }
links:
  codigo: https://github.com/Guilhermecmt/Nous-Webui
capa: ../../assets/projetos/nous/capa.webp
capaAlt: Arte de apresentação do Nous mostrando a interface de chat e o painel de recursos da GPU.
---

## Por quê

Montar uma IA local hoje exige juntar Ollama, uma interface, modelos e configurações, e cada passo
pede conhecimento técnico. O Nous transforma esse conjunto num produto acabado: instala em dois
cliques, escolhe o modelo certo para o seu computador e roda tudo em segundo plano. As conversas
nunca saem da máquina.

## O que ele faz

- **Lembra de você.** Aprende fatos duradouros (nome, trabalho, preferências) e usa nas conversas
  seguintes. Tudo fica num painel onde você vê, edita e apaga cada memória.
- **Lê suas anotações.** Aponte para um cofre do Obsidian ou uma pasta de notas, e as passagens
  relevantes entram na resposta com citação da fonte.
- **Loja de modelos.** Analisa o hardware, recomenda o modelo ideal e baixa com uma barra de progresso.
- **Visão e imagens.** Entende capturas de tela e gera imagens na conversa (ComfyUI com Flux, opcional).
- **Painel de recursos.** VRAM em tempo real e um botão para liberar a GPU, que depois virou o
  [LLM Hub](/projetos/llm-hub/).

Funciona até sem placa de vídeo dedicada: a loja percebe isso e recomenda modelos leves.
