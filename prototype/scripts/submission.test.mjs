import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Kysely } from "kysely";
import { createDialect } from "emdash/db/sqlite";
import { runMigrations } from "emdash/db";
import { applySeed } from "emdash/seed";
import { importSubmission } from "./import-submission.mjs";
import { readSubmission } from "./lib/submission.mjs";

const scratch = mkdtempSync(join(tmpdir(), "emdash-submissions-test-"));
const staticDirectory = join(scratch, "static");
const baseline = join(scratch, "baseline.db");
const template = readFileSync(new URL("../../submissions/_template.md", import.meta.url), "utf8");
let sequence = 0;

before(async () => {
  mkdirSync(join(staticDirectory, "images"), { recursive: true });
  writeFileSync(join(staticDirectory, "images/diagram.png"), "test image");
  const db = new Kysely({ dialect: createDialect({ url: `file:${baseline}` }) });
  try {
    await runMigrations(db);
    const seed = JSON.parse(readFileSync(new URL("../seed/seed.json", import.meta.url), "utf8"));
    await applySeed(db, {
      version: "1", collections: seed.collections, settings: { title: "CMS sentinel" },
      content: { posts: [{ id: "existing", slug: "existing-cms-post", status: "published", data: { title: "CMS only", content: [] } }] },
    }, { includeContent: true });
  } finally { await db.destroy(); }
});

after(() => rmSync(scratch, { recursive: true, force: true }));

function submission(source = template, slug = "your-post-slug") {
  const directory = join(scratch, `source-${sequence++}`);
  mkdirSync(directory);
  const filename = join(directory, `${slug}.md`);
  writeFileSync(filename, source);
  return readSubmission(filename, staticDirectory);
}

function database() {
  const filename = join(scratch, `test-${sequence++}.db`);
  copyFileSync(baseline, filename);
  return filename;
}

function query(filename, fn) {
  const db = new DatabaseSync(filename);
  try { return fn(db); } finally { db.close(); }
}

test("the contribution template produces only a draft with byline and taxonomy credits", () => {
  const post = submission();
  assert.equal(post.seed.content.posts[0].status, "draft");
  assert.equal(post.seed.content.posts[0].data.title, "Your post title");
  assert.equal(post.seed.bylines[0].displayName, "Your Name");
  assert.deepEqual(post.seed.content.posts[0].taxonomies, { tag: ["community"], category: ["updates"] });
  assert.deepEqual(Object.keys(post.seed).sort(), ["bylines", "content", "taxonomies", "version"]);
});

test("malformed metadata, duplicate YAML keys, unsupported fields and filename mismatches fail", () => {
  for (const source of [
    template.replace("slug: your-post-slug", "slug: ../escape"),
    template.replace("slug: your-post-slug", "slug: another-slug"),
    template.replace("title: \"Your post title\"", "title: 42"),
    template.replace("summary:", "status: published\nsummary:"),
    template.replace("summary:", "slug: your-post-slug\nsummary:"),
    template.replace("  - Community", "  - Community\n  - community"),
  ]) assert.throws(() => submission(source));
  assert.throws(() => submission("No front matter"));
});

test("local and HTTPS images are supported without downloading or accepting filesystem escapes", () => {
  assert.equal(submission(`${template}\n![Diagram](/images/diagram.png)\n`).seed.content.posts[0].data.content.at(-1)._type, "image");
  assert.doesNotThrow(() => submission(`${template}\n![External](https://example.invalid/diagram.png)\n`));
  assert.throws(() => submission(`${template}\n![Missing](/images/missing.png)\n`));
  assert.throws(() => submission(`${template}\n![Relative](../diagram.png)\n`));
  symlinkSync(baseline, join(staticDirectory, "images/escape.png"));
  assert.throws(() => submission(`${template}\n![Escape](/images/escape.png)\n`), /outside static/);
});

test("Markdown tables, code and emphasis survive the shared conversion", () => {
  const post = submission(`${template}\n| Name | Value |\n| --- | --- |\n| **One** | Two |\n\n\`\`\`js\nconsole.log('hello');\n\`\`\`\n`);
  const blocks = post.seed.content.posts[0].data.content;
  assert.ok(blocks.some((block) => block._type === "table" && block.rows.length === 2));
  assert.ok(blocks.some((block) => block._type === "code" && block.code.includes("console.log")));
});

test("dry run does not change the database or create a backup; missing database is never created", async () => {
  const path = database();
  const before = readFileSync(path);
  assert.equal((await importSubmission(submission(), path)).status, "ready");
  assert.deepEqual(readFileSync(path), before);
  assert.equal(query(path, (db) => db.prepare("SELECT count(*) AS n FROM ec_posts").get().n), 1);
  const missing = join(scratch, "missing.db");
  await assert.rejects(importSubmission(submission(), missing, { apply: true }));
  assert.equal(existsSync(missing), false);
});

test("applied import creates one draft, credits, protected backup and receipt; CMS edits and renamed slugs survive retries", async () => {
  const path = database();
  const before = query(path, (db) => db.prepare("SELECT * FROM ec_posts").all());
  const result = await importSubmission(submission(`${template}\n![Diagram](/images/diagram.png)\n`), path, { apply: true });
  assert.equal(result.status, "imported");
  assert.equal(statSync(result.backupPath).mode & 0o777, 0o600);
  assert.equal(query(result.backupPath, (db) => db.prepare("SELECT count(*) AS n FROM ec_posts").get().n), 1);
  query(path, (db) => {
    const post = db.prepare("SELECT * FROM ec_posts WHERE id = ?").get(result.id);
    assert.equal(post.status, "draft");
    assert.equal(post.published_at, null);
    assert.equal(JSON.parse(post.content).at(-1).asset.url, "/images/diagram.png");
    assert.equal(db.prepare("SELECT count(*) AS n FROM _emdash_content_bylines WHERE content_id = ?").get(result.id).n, 1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM content_taxonomies WHERE entry_id = ?").get(post.translation_group).n, 2);
    assert.deepEqual(db.prepare("SELECT * FROM ec_posts WHERE slug = 'existing-cms-post'").all(), before);
    assert.equal(JSON.parse(db.prepare("SELECT value FROM options WHERE name = 'site:title'").get().value), "CMS sentinel");
    db.prepare("UPDATE ec_posts SET slug = 'editor-renamed', title = 'Edited in CMS' WHERE id = ?").run(result.id);
  });
  const retry = await importSubmission(submission(template.replace("Your post title", "Changed in Git")), path, { apply: true });
  assert.equal(retry.status, "already-imported");
  assert.equal(retry.slug, "editor-renamed");
  assert.equal(retry.sourceChanged, true);
  query(path, (db) => {
    assert.equal(db.prepare("SELECT count(*) AS n FROM ec_posts").get().n, 2);
    assert.equal(db.prepare("SELECT title FROM ec_posts WHERE id = ?").get(result.id).title, "Edited in CMS");
  });
});

test("an existing CMS slug is refused without overwriting it", async () => {
  const path = database();
  await assert.rejects(importSubmission(submission(template.replaceAll("your-post-slug", "existing-cms-post"), "existing-cms-post"), path, { apply: true }), /already exists/);
  assert.equal(query(path, (db) => db.prepare("SELECT title FROM ec_posts").get().title), "CMS only");
});

test("an import failure rolls back its post, byline, taxonomy terms and receipt", async () => {
  const path = database();
  query(path, (db) => db.exec("CREATE TRIGGER reject_submission BEFORE INSERT ON ec_posts WHEN NEW.slug = 'your-post-slug' BEGIN SELECT RAISE(ABORT, 'test import failure'); END"));
  await assert.rejects(importSubmission(submission(), path, { apply: true }), /test import failure/);
  query(path, (db) => {
    assert.equal(db.prepare("SELECT count(*) AS n FROM ec_posts").get().n, 1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM _emdash_bylines").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM taxonomies").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM options WHERE name LIKE '508:submission:%'").get().n, 0);
  });
});

test("incompatible migrations and receipts pointing at missing posts fail closed", async () => {
  const path = database();
  const result = await importSubmission(submission(), path, { apply: true });
  query(path, (db) => db.prepare("DELETE FROM ec_posts WHERE id = ?").run(result.id));
  await assert.rejects(importSubmission(submission(), path, { apply: true }), /post is missing/);
  query(path, (db) => db.exec("DELETE FROM _emdash_migrations WHERE name = '091_redirect_artifacts'"));
  await assert.rejects(importSubmission(submission(), path, { apply: true }), /migrations do not match/);
});
