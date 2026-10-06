import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = resolve(process.env.DATABASE_PATH || join(project, "data.db"));
const seedPath = join(project, "seed/seed.json");
const markerPath = join(dirname(databasePath), ".all-posts-imported-v1");
const pendingPath = join(dirname(databasePath), ".all-posts-import-pending-v1");

if (!existsSync(databasePath)) throw new Error(`Database does not exist: ${databasePath}`);

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const posts = seed.content?.posts;
if (!Array.isArray(posts) || posts.length !== 15) {
  throw new Error("Expected the reviewed 15-post seed before importing");
}
if (existsSync(markerPath)) {
  const check = new DatabaseSync(databasePath, { readOnly: true });
  const slugs = new Set(check.prepare("SELECT slug FROM ec_posts").all().map((row) => row.slug));
  check.close();
  const missing = posts.filter((post) => !slugs.has(post.slug)).map((post) => post.slug);
  if (missing.length > 0) {
    throw new Error(`Import marker does not match this database (${missing.length} posts missing). If this is a restore, remove ${markerPath} after verifying the database, then rerun the import.`);
  }
  if (existsSync(pendingPath)) unlinkSync(pendingPath);
  console.log("Full post import already completed; leaving CMS content unchanged.");
  process.exit(0);
}
if (existsSync(pendingPath)) {
  throw new Error(`A previous import did not finish. Stop the app and restore the backup recorded in ${pendingPath} before removing that file and retrying.`);
}

process.umask(0o077);
const backupDir = join(dirname(databasePath), "backups");
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
const backupPath = join(backupDir, `before-full-post-import-${new Date().toISOString().replaceAll(":", "-")}.db`);
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA busy_timeout = 5000");
const initialRows = db.prepare("SELECT slug, title, content, excerpt, original_date FROM ec_posts").all();
const existing = new Map(initialRows.map((row) => [row.slug, row]));
db.exec(`VACUUM INTO '${backupPath.replaceAll("'", "''")}'`);
chmodSync(backupPath, 0o600);
db.close();
console.log(`Created consistent SQLite backup at ${backupPath}`);
// A failed seed may have written some records. Keep this recovery marker so a
// retry cannot mistake a partial import for pre-existing CMS content.
writeFileSync(pendingPath, `${backupPath}\n`, { mode: 0o600 });

const scratchDir = mkdtempSync(join(tmpdir(), "emdash-post-import-"));
const contentSeedPath = join(scratchDir, "content.json");
writeFileSync(contentSeedPath, JSON.stringify({
  version: "1", taxonomies: seed.taxonomies, bylines: seed.bylines, content: seed.content,
}), { mode: 0o600 });
let seedResult;
try {
  seedResult = spawnSync(join(project, "node_modules/.bin/emdash"), [
    "seed", contentSeedPath, "--database", databasePath, "--on-conflict", "skip",
  ], { cwd: project, stdio: "inherit" });
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
if (seedResult.error) throw seedResult.error;
if (seedResult.status !== 0) throw new Error(`Seed command failed with status ${seedResult.status}`);

const updated = new DatabaseSync(databasePath);
updated.exec("PRAGMA busy_timeout = 5000");
const findPost = updated.prepare("SELECT slug, status, title, content, excerpt, original_date, published_at FROM ec_posts WHERE slug = ?");
const setDate = updated.prepare("UPDATE ec_posts SET published_at = ? WHERE slug = ? AND status = 'published' AND original_date = ?");
let inserted = 0;
let dated = 0;
updated.exec("BEGIN IMMEDIATE");
try {
  for (const post of posts) {
    const row = findPost.get(post.slug);
    if (!row) throw new Error(`Missing imported post: ${post.slug}`);
    const before = existing.get(post.slug);
    if (before) {
      for (const field of ["title", "content", "excerpt", "original_date"]) {
        if (row[field] !== before[field]) throw new Error(`Existing post changed during import: ${post.slug}`);
      }
    } else {
      if (row.status !== post.status || row.title !== post.data.title ||
          row.excerpt !== post.data.excerpt || row.original_date !== post.data.original_date ||
          JSON.stringify(JSON.parse(row.content)) !== JSON.stringify(post.data.content)) {
        throw new Error(`Imported post does not match the reviewed seed: ${post.slug}`);
      }
      inserted++;
    }
    if (post.status === "published" && row.status === "published" &&
        row.original_date === post.data.original_date && row.published_at !== row.original_date) {
      dated += setDate.run(row.original_date, post.slug, row.original_date).changes;
    }
  }
  updated.exec("COMMIT");
} catch (error) {
  updated.exec("ROLLBACK");
  throw error;
} finally {
  updated.close();
}

writeFileSync(markerPath, `${new Date().toISOString()} ${inserted} new posts\n`, { mode: 0o600 });
unlinkSync(pendingPath);
console.log(`Import complete: ${inserted} new posts, ${posts.length - inserted} existing posts preserved, ${dated} publication dates aligned.`);
