# Submit a post through GitHub

Add posts as `submissions/<slug>.md` at the repository root. Occasional
contributors can submit Markdown through a pull request without an
EmDash account. Editors can also write directly in EmDash. A merge makes a file
available for manual import; it does not publish or import it automatically.

## For contributors

1. Copy `_template.md` to `<your-post-slug>.md` in this directory.
2. Set the title, slug, author, and optional summary, tags, and categories.
   The filename must match the slug: `hello-508.md` uses `slug: hello-508` and
   will have the public URL `/posts/hello-508` when published. Use at most 63
   lowercase letters, digits, and single hyphens. Keep the slug stable.
3. Write standard Markdown. Headings, paragraphs, emphasis, links, lists, quotes,
   fenced code, simple pipe tables, and images on their own lines are supported. HTML, MDX, and Hugo shortcodes
   are outside this prototype's supported format. No date or publication-status
   field is accepted; the CMS controls publication and its date.
4. Optionally add images under `static/images/submissions/<slug>/`, and use
   `![Description](/images/submissions/<slug>/image.png)`. HTTPS image URLs also
   work, but remain dependent on that external host. Images are not downloaded
   into the CMS media library. Keep committed image files when archiving an
   imported submission so its published links remain working.
5. Open a PR containing the post and its images. The submission check validates
   the format; a maintainer reviews the content and attribution before merging.

`author: "Your Name"` creates or reuses a public byline, not a login account.
To choose an existing byline or use a name that cannot be converted to an ASCII
slug, use `author: { name: "Your Name", slug: your-byline-slug }`. Editors should
verify the attribution in the CMS before publishing.

To validate locally, run from `prototype/` after a frozen dependency install:

```sh
corepack pnpm submission:check
```

## For maintainers

After merging, deploy the reviewed `main` revision so its Markdown and static
images are available in the application container. Open Coolify's terminal for
that container; its working directory is `/app/prototype`. Preview one import:

```sh
node scripts/import-submission.mjs hello-508
```

This only reads the existing database. Confirm the title and slug, then import:

```sh
node scripts/import-submission.mjs hello-508 --apply
```

The script uses the container's `DATABASE_PATH`. Locally, explicitly select an
initialized test database with `--database ./test.db`. It refuses missing
databases, incompatible migration versions, and slugs already used by CMS
content, including trashed posts. It does not initialize or migrate a database.

An import backs up SQLite under the database directory's `backups/`, then adds
one **unpublished draft**, its byline and taxonomy terms, and an import receipt
in a single transaction. A failure rolls back those writes. Backups contain the
database's private settings: preserve them with the protected persistent volume.
An existing byline or term is reused without replacing its CMS fields. Use the
EmDash editor to preview the draft, check its formatting, images and attribution,
and publish it. No contributor credentials or GitHub deployment secrets are
required for this workflow.

## Ownership after import

EmDash owns the published post. Repeating an import preserves CMS edits, even if
the Markdown changed or an editor changed the post's slug. Import receipts live
in the database, so they travel with database backups and restores. A deleted
post is not automatically recreated by reimporting its submission.

The original Markdown remains a record of the reviewed submission; it is not a
live mirror of the CMS. Later PRs proposing corrections need an editor to apply
them in EmDash. There is no automatic synchronization or publication on deploy.
Deleting Markdown does not delete the CMS post. Normal deployment still has to
include committed static images used by imported posts.
