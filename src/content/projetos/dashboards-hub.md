---
titulo: Dashboards Hub
resumo: Central com login único para os painéis de comissões, comercial e financeiro de uma corretora de seguros, com perfis por setor e os dados importados salvos.
ordem: 3
tipo: Painéis de dados (web)
periodo: '2026'
situacao: Em produção
codigo: empresa
stack: [Node.js, Express, SQLite, JavaScript, Chart.js, D3, Docker]
numeros:
  - { valor: '3', rotulo: painéis de setores diferentes }
  - { valor: '4', rotulo: perfis de acesso }
  - { valor: '1', rotulo: login para todos os painéis }
  - { valor: '1.5', rotulo: versão atual }
capa: ../../assets/projetos/dashboards-hub/capa.webp
capaAlt: Diagrama do Dashboards Hub, com o login único, a central de perfis, os painéis de comissões, comercial e financeiro e a base dos imports.
---

## O que é

Os números da corretora saem do sistema de gestão em relatórios exportados, em XML e planilha. Cada
painel lê esses relatórios no navegador e os transforma em análise:

- **Comissões:** auditoria das comissões de corretagem, com a distribuição por corretor e operadora,
  lotes, parcelas e notas fiscais. Um botão gera um relatório de divergência pronto para colar no
  e-mail, com a versão, o arquivo e os filtros usados.
- **Comercial:** matriz de decisão 2×2 (conversão × produção), um health score por vendedor que pesa
  permanência, volume e qualidade, um motor de decisão que aponta onde vender mais e o que cortar, e
  uma auditoria do cadastro dos contratos.
- **Financeiro:** DFC em três níveis, fluxo de caixa, receitas, despesas e indicadores, com as
  empresas do grupo vistas juntas ou separadas.

## A central

Um servidor Node.js reúne os três painéis atrás de um **login único**: entrou na central, abre os
painéis sem outra senha. Os perfis Administrador, Comissões, Comercial e Financeiro decidem quem vê
cada painel e, no Comercial, cada aba. Uma tela de gestão de acessos cria usuários, gera senhas,
desativa contas e mostra o registro de acessos.

## Decisões técnicas

- **Os imports ficam salvos** numa base SQLite por painel: reimportar atualiza sem duplicar, e o
  painel já abre carregado para todos que têm acesso a ele.
- Colunas pessoais que nenhum cálculo usa (telefone, e-mail, CPF, endereço, Pix) nem entram no banco.
- Senhas com bcrypt, sessão em cookie assinado, limite de tentativas que só conta os logins errados, e
  a troca de senha derruba as sessões abertas daquela pessoa.
- Cada painel é um HTML único, que continua funcionando sozinho, aberto direto do disco. O de
  comissões traz as bibliotecas de gráfico embutidas e funciona totalmente offline.
- Os quatro repositórios (a central e os três painéis) viraram um só, com o histórico de cada um
  preservado.
