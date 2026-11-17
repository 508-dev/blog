import { chmodSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { backup, DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { Kysely } from "kysely";
import { createDialect } from "emdash/db/sqlite";
import { MIGRATION_NAMES } from "emdash/db";
import { applySeed } from "emdash/seed";
import { OptionsRepository } from "emdash/api/route-utils";
import { assertSlug, readSubmission } from "./lib/submission.mjs";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const receiptKey = (slug) => `508:submission:${slug}`;

function inspect(db, submission) {
  const receipt = db.prepare("SELECT value FROM options WHERE name = ?").get(receiptKey(submission.slug));
  if (receipt) {
    const saved = JSON.parse(receipt.value);
    const post = db.prepare("SELECT id, slug FROM ec_posts WHERE id = ?").get(saved.id);
    if (!post) throw new Error("Import receipt exists but its post is missing; investigate the database restore before retrying");
    return { status: "already-imported", id: post.id, slug: post.slug, sourceChanged: saved.digest !== submission.digest };
  }
  if (db.prepare("SELECT id FROM ec_posts WHERE slug = ?").get(submission.slug)) {
    throw new Error(`Slug ${submission.slug} already exists (including trash); existing CMS content will not be replaced`);
  }
  return { status: "ready", slug: submission.slug };
}

/** Import a single draft and its receipt atomically; no migrations or publication. */
export async function importSubmission(submission, databasePath, { apply = false } = {}) {
  databasePath = resolve(databasePath);
  // Read-only open also ensures a typo cannot create an empty database.
  const check = new DatabaseSync(databasePath, { readOnly: true });
  let backupPath;
  try {
    const applied = check.prepare("SELECT name FROM _emdash_migrations").all().map((row) => row.name);
    if (applied.length !== MIGRATION_NAMES.length || MIGRATION_NAMES.some((name) => !applied.includes(name))) {
      throw new Error("Database migrations do not match this EmDash version; upgrade the app separately before importing");
    }
    const plan = inspect(check, submission);
    if (plan.status !== "ready" || !apply) return plan;
    const backupDir = join(dirname(databasePath), "backups");
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    backupPath = join(backupDir, `before-submission-${submission.slug}-${randomUUID()}.db`);
    writeFileSync(backupPath, "", { flag: "wx", mode: 0o600 });
    // Consistent with WAL writers; the backup contains the existing database's secrets.
    // Create it in an owner-only directory and preserve it with the volume.
    await backup(check, backupPath);
    chmodSync(backupPath, 0o600);
  } finally {
    check.close();
  }

  const db = new Kysely({ dialect: createDialect({ url: `file:${databasePath}` }) });
  try {
    return await db.transaction().execute(async (trx) => {
      const options = new OptionsRepository(trx);
      // Reserve the stable submission slug within the same transaction as content.
      // Concurrent imports either observe the receipt or fail without partial writes.
      const reserved = await options.setIfAbsent(receiptKey(submission.slug), { pending: true });
      if (!reserved) throw new Error("Submission was imported concurrently; rerun to inspect its receipt");
      const existing = await trx.selectFrom("ec_posts").select("id").where("slug", "=", submission.slug).executeTakeFirst();
      if (existing) throw new Error(`Slug ${submission.slug} already exists; existing CMS content will not be replaced`);
      const result = await applySeed(trx, submission.seed, {
        includeContent: true, onConflict: "skip", skipMediaDownload: true,
      });
      const post = await trx.selectFrom("ec_posts").select(["id", "slug", "status", "published_at"])
        .where("slug", "=", submission.slug).executeTakeFirst();
      if (result.content.created !== 1 || !post || post.status !== "draft" || post.published_at !== null) {
        throw new Error("Submission was not created as exactly one unpublished draft");
      }
      await options.set(receiptKey(submission.slug), {
        id: post.id, digest: submission.digest, importedAt: new Date().toISOString(),
      });
      return { status: "imported", id: post.id, slug: post.slug, backupPath };
    });
  } finally {
    await db.destroy();
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { check: { type: "boolean" }, apply: { type: "boolean" }, database: { type: "string" }, help: { type: "boolean" } },
  });
  if (values.help) {
    console.log("Usage: node scripts/import-submission.mjs --check\n       node scripts/import-submission.mjs <slug> [--database path] [--apply]\nWithout --apply, only reads and previews. Imports are always drafts.");
    return;
  }
  const directory = join(project, "submissions");
  const staticDirectory = resolve(project, "../static");
  if (values.check) {
    if (positionals.length || values.apply || values.database) throw new Error("--check takes no slug, --apply, or --database");
    const files = readdirSync(directory).filter((name) => name.endsWith(".md") && name !== "README.md" && !name.startsWith("_"));
    for (const name of files) {
      try { readSubmission(join(directory, name), staticDirectory); }
      catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
    }
    console.log(`Validated ${files.length} submission(s). No database access or publication.`);
    return;
  }
  if (positionals.length !== 1) throw new Error("Provide one submission slug, or use --check / --help");
  const slug = assertSlug(positionals[0]);
  const submission = readSubmission(join(directory, `${slug}.md`), staticDirectory);
  const result = await importSubmission(submission, values.database || process.env.DATABASE_PATH || join(project, "data.db"), {
    apply: values.apply,
  });
  if (result.status === "already-imported") {
    console.log(`Already imported: ${result.id} (current slug: ${result.slug}). CMS edits preserved.${result.sourceChanged ? " Markdown changed; apply corrections through the CMS." : ""}`);
  } else if (result.status === "ready") {
    console.log(`Ready: "${submission.title}" -> /posts/${slug} as a DRAFT. Rerun with --apply to import.`);
  } else {
    console.log(`Imported DRAFT: ${result.id} (/posts/${result.slug}). Preview and publish in EmDash. Backup: ${result.backupPath}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
