---
titulo: Alexandria
resumo: Plataforma de cursos online white-label, em que cada organização tem domínio, marca, alunos e administradores próprios.
ordem: 4
tipo: SaaS multi-tenant
periodo: '2026'
situacao: Em desenvolvimento
codigo: privado
stack: [TypeScript, Next.js 15, NestJS 11, PostgreSQL, Prisma, Redis, BullMQ, OpenTelemetry]
numeros:
  - { valor: '3', rotulo: camadas de isolamento }
  - { valor: '7', rotulo: fases no roadmap }
  - { valor: '4', rotulo: suítes de teste }
  - { valor: '15 min', rotulo: vida do token de acesso }
capa: ../../assets/projetos/alexandria/capa.webp
capaAlt: Diagrama das três camadas de isolamento entre organizações, da resolução pelo domínio até o Row-Level Security do banco.
---

## O que é

Um "sistema operacional de aprendizagem" que atende do produtor de cursos independente à universidade
corporativa. Cada organização é um tenant isolado: tem domínio, marca, catálogo, usuários e
administradores próprios, e não enxerga nada das outras.

## A invariante: um tenant nunca vê o outro

Em uma plataforma assim, o isolamento não é uma feature entre outras. É a garantia que sustenta o
produto. Por isso ele foi construído em três camadas independentes, todas fechadas por padrão, e
nenhuma confia na anterior:

1. **Resolução pelo domínio.** O site e a API descobrem a organização pelo cabeçalho `Host`, cada um
   por conta própria. A API nunca confia no que o site diz.
2. **Contexto em toda consulta.** Uma extensão do Prisma injeta o tenant em toda query. Sem contexto, a
   consulta dá erro, nunca roda "sem filtro". SQL cru e transações sem escopo são barrados pelo lint.
3. **Row-Level Security no PostgreSQL.** Cada transação declara o tenant. Sem essa declaração, o banco
   devolve zero linhas, inclusive para o dono da tabela. O usuário de banco da aplicação não consegue
   ignorar a regra.

O acesso entre organizações existe por um único caminho, que exige motivo declarado e grava o registro
de auditoria **antes** de executar. Uma suíte de testes própria tenta furar o isolamento e roda em todo
pull request. Um meta-teste reprova a build se uma tabela nova for criada sem as proteções.

## Segurança e operação

- Senhas com Argon2id, token de acesso JWT (EdDSA) de 15 minutos e refresh rotativo com detecção de
  reuso: um token já usado derruba a sessão inteira daquele dispositivo.
- Tokens só em cookie `httpOnly`, MFA por TOTP com códigos de recuperação, e nenhuma resposta revela se
  um e-mail está cadastrado.
- Toda rota nova nasce fechada; abrir uma exige uma marcação explícita no código.
- Logs com `requestId`, tenant e usuário, traces e métricas com OpenTelemetry e erros no Sentry.

## Como o projeto é conduzido

O planejamento vem primeiro e é a fonte da verdade: o código implementa o que está documentado, e as
decisões que fogem do plano viram ADR. O roadmap tem sete fases divididas em épicos, com o estado de
cada um registrado em um só lugar.
