import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = resolve(process.env.DATABASE_PATH || join(project, "data.db"));
const seedPath = join(project, "seed/seed.json");
const markerPath = join(dirname(databasePath), ".hotwire-post-imported-v1");
const pendingPath = join(dirname(databasePath), ".hotwire-post-import-pending-v1");
const slug = "hotwire-native-coscup";

if (!existsSync(databasePath)) throw new Error(`Database does not exist: ${databasePath}`);

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const posts = seed.content?.posts;
const post = Array.isArray(posts) && posts.find((item) => item.slug === slug);
if (!post || posts.filter((item) => item.slug === slug).length !== 1) {
  throw new Error(`Expected exactly one ${slug} post in the reviewed seed`);
}
if (existsSync(markerPath)) {
  const check = new DatabaseSync(databasePath, { readOnly: true });
  const imported = check.prepare("SELECT slug FROM ec_posts WHERE slug = ?").get(slug);
  check.close();
  if (!imported) {
    throw new Error(`Import marker does not match this database (${slug} missing). If this is a restore, remove ${markerPath} after verifying the database, then rerun the import.`);
  }
  if (existsSync(pendingPath)) unlinkSync(pendingPath);
  console.log("Hotwire post import already completed; leaving CMS content unchanged.");
  process.exit(0);
}
if (existsSync(pendingPath)) {
  throw new Error(`A previous import did not finish. Stop the app and restore the backup recorded in ${pendingPath} before removing that file and retrying.`);
}

process.umask(0o077);
const backupDir = join(dirname(databasePath), "backups");
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA busy_timeout = 5000");
const initialRows = db.prepare("SELECT slug, status, title, content, excerpt, original_date, published_at FROM ec_posts").all();
const existing = new Map(initialRows.map((row) => [row.slug, row]));
if (existing.has(slug)) {
  db.close();
  console.log(`${slug} already exists; leaving CMS content unchanged.`);
  process.exit(0);
}
const backupPath = join(backupDir, `before-hotwire-post-import-${new Date().toISOString().replaceAll(":", "-")}.db`);
db.exec(`VACUUM INTO '${backupPath.replaceAll("'", "''")}'`);
chmodSync(backupPath, 0o600);
db.close();
console.log(`Created consistent SQLite backup at ${backupPath}`);
// A failed seed may have written some records. Keep this recovery marker so a
// retry cannot mistake a partial import for pre-existing CMS content.
writeFileSync(pendingPath, `${backupPath}\n`, { mode: 0o600 });

const scratchDir = mkdtempSync(join(tmpdir(), "emdash-post-import-"));
const contentSeedPath = join(scratchDir, "content.json");
const taxonomies = seed.taxonomies.map((taxonomy) => ({
  ...taxonomy,
  terms: taxonomy.terms.filter((term) => post.taxonomies?.[taxonomy.name]?.includes(term.slug)),
}));
const bylines = seed.bylines.filter((byline) => post.bylines?.some((item) => item.byline === byline.id));
writeFileSync(contentSeedPath, JSON.stringify({
  version: "1", taxonomies, bylines, content: { posts: [post] },
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
let dated = 0;
updated.exec("BEGIN IMMEDIATE");
try {
  for (const [existingSlug, before] of existing) {
    const row = findPost.get(existingSlug);
    if (!row || Object.keys(before).some((field) => row[field] !== before[field])) {
      throw new Error(`Existing post changed during import: ${existingSlug}`);
    }
  }
  const row = findPost.get(slug);
  if (!row || row.status !== post.status || row.title !== post.data.title ||
      row.excerpt !== post.data.excerpt || row.original_date !== post.data.original_date ||
      JSON.stringify(JSON.parse(row.content)) !== JSON.stringify(post.data.content)) {
    throw new Error(`Imported post does not match the reviewed seed: ${slug}`);
  }
  if (post.status === "published" && row.published_at !== row.original_date) {
    dated = setDate.run(row.original_date, slug, row.original_date).changes;
  }
  updated.exec("COMMIT");
} catch (error) {
  updated.exec("ROLLBACK");
  throw error;
} finally {
  updated.close();
}

writeFileSync(markerPath, `${new Date().toISOString()} ${slug}\n`, { mode: 0o600 });
unlinkSync(pendingPath);
console.log(`Import complete: ${slug} added, ${existing.size} existing posts preserved, ${dated} publication dates aligned.`);
