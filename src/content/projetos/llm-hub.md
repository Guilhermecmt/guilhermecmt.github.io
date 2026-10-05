---
titulo: LLM Hub
resumo: Um app de bandeja para Windows que mostra a VRAM da GPU e libera a memória presa por modelos de IA locais com um clique.
ordem: 6
tipo: App para Windows
periodo: '2026'
situacao: Disponível
codigo: aberto
stack: [Python, aiohttp, pywebview, pystray, Ollama, PyInstaller]
numeros:
  - { valor: '80+', rotulo: modelos na loja }
  - { valor: '3', rotulo: fabricantes de GPU }
links:
  codigo: https://github.com/Guilhermecmt/HUB-LLM-LOCAL
  download: https://github.com/Guilhermecmt/HUB-LLM-LOCAL/releases
capa: ../../assets/projetos/llm-hub/capa.webp
capaAlt: Painel do LLM Hub com o uso de VRAM da GPU e da memória compartilhada.
capaRetrato: true
---

## O problema

Quem usa Ollama, Open WebUI ou ComfyUI conhece a situação: modelos ficam presos na memória da GPU, a
VRAM enche sem aviso e não há um jeito rápido de saber o que está ocupando o quê. O Windows não mostra
isso com clareza, e a saída costuma ser fechar programas no chute.

## A solução

O LLM Hub fica discreto na bandeja do Windows. Um clique abre o painel com a VRAM dedicada e a
compartilhada em tempo real, os modelos carregados e um botão para liberar tudo. A loja integrada
baixa e remove modelos, e indica quais cabem na sua placa e quais vão sobrecarregá-la.

## Detalhes que fizeram diferença

- **Funciona com NVIDIA, AMD e Intel.** Lê os mesmos contadores de desempenho que o Gerenciador de
  Tarefas usa, em vez de depender do `nvidia-smi`. Foi desenvolvido numa AMD Radeon RX 9070 XT.
- **Fala com o motor, não com a interface.** O botão de parar descarrega o modelo direto no Ollama,
  então funciona com qualquer cliente que rode sobre ele.
- **Instala o Ollama para você**, no perfil do usuário e sem pedir administrador. Isso ajuda em
  máquinas corporativas.
- **Nada sai da máquina.** Bandeja, painel e um micro-servidor local conversam só em `127.0.0.1`.

Nasceu como a tela de recursos do [Nous](/projetos/nous/) e virou uma ferramenta independente.
