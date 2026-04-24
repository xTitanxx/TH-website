import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const sections = defineCollection({
  loader: glob({ base: './src/content/sections', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string().optional(),
    tagline: z.string().optional(),
    images: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string().default(''),
          caption: z.string().optional(),
        }),
      )
      .optional(),
    gmaps: z.string().url().optional(),
    amaps: z.string().url().optional(),
  }),
});

const settings = defineCollection({
  loader: glob({ base: './src/content/settings', pattern: '**/*.md' }),
  schema: z.object({
    titleScale: z.number().min(0.5).max(2).default(1),
  }),
});

export const collections = { sections, settings };
