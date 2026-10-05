import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projetos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projetos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      // Uma frase: o que é, para quem bate o olho no cartão.
      resumo: z.string(),
      ordem: z.number(),
      tipo: z.string(),
      periodo: z.string(),
      situacao: z.enum(['No ar', 'Disponível', 'Em desenvolvimento', 'Uso pessoal', 'Concluído']),
      // "privado": o código não é público; a página diz que o acesso é sob pedido.
      codigo: z.enum(['privado', 'aberto']),
      stack: z.array(z.string()),
      numeros: z.array(z.object({ valor: z.string(), rotulo: z.string() })).default([]),
      links: z
        .object({
          demo: z.string().url().optional(),
          codigo: z.string().url().optional(),
          download: z.string().url().optional(),
        })
        .default({}),
      capa: image().optional(),
      capaAlt: z.string().optional(),
      // Quando a capa é estreita (ex.: um painel de 360 px), o layout a mostra em coluna.
      capaRetrato: z.boolean().default(false),
      galeria: z
        .array(z.object({ src: image(), alt: z.string(), legenda: z.string().optional() }))
        .default([]),
    }),
});

export const collections = { projetos };
