---
titulo: StockGenius
resumo: Motor de decisão de investimentos para a B3 e a NYSE, com análise que roda offline e pode ser auditada.
ordem: 6
tipo: Ferramenta pessoal
periodo: '2026'
situacao: Uso pessoal
codigo: privado
stack: [Python, FastAPI, DuckDB, pandas, Jinja, Tailwind, Typer, WebView2]
numeros:
  - { valor: '0', rotulo: chamadas de rede na análise }
  - { valor: '~65 MB', rotulo: instalador para Windows }
capa: ../../assets/projetos/stockgenius/capa.webp
capaAlt: Relatório da WEGE3 no StockGenius, com gráfico de 250 pregões, score de 56 e o veredito.
galeria:
  - src: ../../assets/projetos/stockgenius/ranking.webp
    alt: Ranking dos ativos do armazém com score, recomendação e valor justo.
    legenda: O ranking muda conforme o perfil de risco, o objetivo e o horizonte. Dados de setembro de 2026, só para ilustrar.
---

## A ideia central

**Buscar dados e calcular são operações separadas.** O comando `sync` fala com a rede e grava
snapshots datados e imutáveis num armazém DuckDB. O `analyse` só lê do armazém e nunca toca a rede.
Essa separação deixa a análise rápida, reprodutível e auditável: cada decisão registra o snapshot e a
versão das regras que a produziram, então reabrir em dezembro a análise de junho mostra exatamente os
números em que ela se baseou.

## Como a análise funciona

Score, tese, riscos e veredito saem de um catálogo de sinais (fluxo de caixa descontado, screener,
risco, técnica, resultados, dividendos e concorrência), com pesos que mudam conforme o perfil, o
objetivo e o horizonte. Tudo é determinístico: **nenhum modelo de linguagem participa da análise.** O
único uso opcional de um modelo é traduzir as manchetes, que vêm em inglês.

## Carteira

O app lê as duas exportações da B3 e escolhe o leitor pelo conteúdo do arquivo, não pelo comando.
Com isso ele monta a composição, a evolução do patrimônio separando aporte de ganho, os proventos para
a declaração e a projeção dos próximos doze meses. Um comando explica, evento por evento, por que a
carteira tem exatamente aquela quantidade de cada ativo.

Duas decisões de interface: as altas e baixas mostram o movimento **em reais** ao lado da
porcentagem, porque 1,5% num papel de R$ 12 e 0,9% numa posição de R$ 24 mil não pesam igual. E o
calendário de proventos é projetado a partir do seu extrato, não do provedor de dados.

## Aplicativo instalável

Um mesmo código atende ao terminal, ao navegador e a uma janela nativa sobre o WebView2 do Windows,
sem embutir navegador. A instalação é por usuário e não pede privilégio de administrador, e os dados
ficam fora da pasta do programa: desinstalar pergunta antes de apagar carteiras e histórico.
