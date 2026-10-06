# 508.dev EmDash preview

This is an isolated CMS prototype for the 508.dev blog. The current Hugo site and GitHub Pages deployment remain active. The preview contains all 15 Hugo posts, including their original slugs, author credits, tags, categories, publication dates, and referenced static images. It uses EmDash 1.0.1 on Astro, with drafts, revisions, scheduling, search, and RSS.

## Local development

From `prototype/`:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec emdash secrets generate --write .env
ln -s ../static public
corepack pnpm exec emdash seed seed/seed.json --database ./data.db
ASTRO_TELEMETRY_DISABLED=1 corepack pnpm dev
```

Open `http://localhost:4321/_emdash/admin` to create the first administrator. The local database, uploads, and `.env` are ignored by Git. `corepack pnpm seed:generate` regenerates the bootstrap seed from every Markdown post in `../content/posts/`. The one-time import script extracts only the content, authors, and taxonomy terms from that seed.

## Coolify preview

Create a Dockerfile application from this repository's `main` branch, with the repository root as the build context and `prototype/Dockerfile` as the Dockerfile path. Set the domain to `https://emdash.508.dev`, the application port to `4321`, and the health path to `/health`. Set `EMDASH_SITE_URL=https://emdash.508.dev` at build time and runtime before initial admin setup. Mount a persistent volume at `/data` for SQLite, uploaded media, and the deployment encryption key. If no `EMDASH_ENCRYPTION_KEY` environment variable is provided, the entrypoint generates a fresh key at `/data/.emdash-encryption-key` with owner-only permissions and loads it into the server environment. Preserve this file with `/data/data.db` and `/data/uploads` in backups and restores; losing it makes encrypted plugin settings unreadable. The local development key is never used for this deployment. The entrypoint seeds only when the database file is absent.

Before starting a public deployment, restrict the preview hostname with Cloudflare Access, proxy authentication, or an IP allowlist. The first visitor to `/_emdash/admin` can create the initial administrator, and the email used for passkey setup is not verified. Keep the restriction active until you have created and tested the administrator account. Reapply it before restoring a database without an administrator. Do not expose the Coolify preview while initial setup is open.

For an existing preview database, run `node scripts/import-remaining-posts.mjs` once inside the deployed container after updating its image. The script makes a consistent SQLite backup under `/data/backups`, applies only posts, bylines, and taxonomy terms with `--on-conflict skip`, aligns the imported posts' internal publication timestamps with their original dates, and writes `/data/.all-posts-imported-v1` only after successful verification. It leaves the administrator, existing post content, site settings, and navigation in place. Back up `/data/backups` with the rest of `/data` until the import is verified. The full migration still needs a URL comparison before switching `blog.508.dev`.
