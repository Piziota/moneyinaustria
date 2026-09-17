import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const CATEGORIES = [
  'taxes',
  'social-insurance',
  'banking',
  'pension',
  'family-benefits',
  'investing',
] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  taxes: 'Taxes',
  'social-insurance': 'Social Insurance',
  banking: 'Banking',
  pension: 'Pension',
  'family-benefits': 'Family Benefits',
  investing: 'Investing',
};

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(CATEGORIES),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
