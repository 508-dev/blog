# 508.dev EmDash preview

This is an isolated CMS prototype for the 508.dev blog. The current Hugo site and GitHub Pages deployment remain active. The preview contains three representative posts, including their original slugs, author credits, tags, categories, publication dates, and referenced static images. It uses EmDash 1.0.1 on Astro, with drafts, revisions, scheduling, search, and RSS.

## Local development

From `prototype/`:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec emdash secrets generate --write .env
ln -s ../static public
corepack pnpm exec emdash seed seed/seed.json --database ./data.db
ASTRO_TELEMETRY_DISABLED=1 corepack pnpm dev
```

Open `http://localhost:4321/_emdash/admin` to create the first administrator. The local database, uploads, and `.env` are ignored by Git. `corepack pnpm seed:generate` regenerates the preview seed from three Hugo posts in `../content/posts/`.

## Coolify preview

Create a Dockerfile application from this repository's prototype branch, with the repository root as the build context and `prototype/Dockerfile` as the Dockerfile path. Set the domain to `https://emdash.508.dev`, the application port to `4321`, and the health path to `/health`. Mount a persistent volume at `/data` for SQLite and uploaded media. Set `EMDASH_ENCRYPTION_KEY` as a secret environment variable; generate a fresh key with `corepack pnpm exec emdash secrets generate` and keep it for backup restores. The entrypoint seeds an empty preview database once and does not overwrite later CMS edits.

The three imported posts use an `original_date` field to preserve the displayed date and RSS date. EmDash records the preview import time as its internal publication timestamp, so database sorting of these initial posts reflects import order. The full migration still needs a checked conversion of every Markdown post, richer Markdown constructs such as tables and raw HTML, and a URL comparison before switching `blog.508.dev`.
