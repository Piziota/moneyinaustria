# Money in Austria

A plain-English financial literacy site for immigrants living in Austria — taxes, social insurance, banking, pensions, family benefits, and investing, with German terms explained the first time they appear.

Built with [Astro](https://astro.build) (static output, TypeScript, content collections, MDX, sitemap).

## Project structure

```text
/
├── public/                     static assets (favicon)
├── src/
│   ├── components/              Header, Footer, Seo, Term (German-term explainer)
│   ├── content/articles/        article content (.mdx)
│   ├── content.config.ts        content collection schema + categories
│   ├── layouts/                 BaseLayout, ArticleLayout
│   ├── pages/                   home, about, 404, category & article routes
│   └── styles/global.css        site-wide styles
└── astro.config.mjs
```

## Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build the production site to `./dist/`           |
| `npm run preview`         | Preview the build locally, before deploying      |
| `npm run astro check`     | Type-check the project                           |

## Content

Articles live in `src/content/articles/` as `.mdx` files with frontmatter (`title`, `description`, `category`, `publishDate`). Use the `<Term de="..." en="...">` component to explain a German term the first time it's used in an article. Categories are defined once in `src/content.config.ts` and drive both the schema and the site navigation/category pages.

See `backlog.md` for planned articles.

## Disclaimer

This site is informational only and is not financial, tax, or legal advice.
