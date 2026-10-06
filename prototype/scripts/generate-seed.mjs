import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { markdownToPortableText } from "emdash/client";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const filenames = readdirSync(resolve(root, "content/posts"))
  .filter((name) => name.endsWith(".md"));

function readPost(filename) {
  const source = readFileSync(resolve(root, "content/posts", filename), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing YAML front matter: ${filename}`);
  const meta = parseYaml(match[1]);
  const author = typeof meta.author === "string" ? meta.author : meta.author?.name;
  if (!meta.title || !meta.slug || !author || !meta.date) {
    throw new Error(`Missing title, slug, author, or date: ${filename}`);
  }
  return { filename, meta, author, body: match[2] };
}

const posts = filenames.map(readPost).sort((a, b) =>
  new Date(a.meta.date).getTime() - new Date(b.meta.date).getTime()
);
const slugs = posts.map(({ meta }) => meta.slug);
if (new Set(slugs).size !== slugs.length) throw new Error("Duplicate post slugs");

function plainBlockText(block) {
  if (block?._type !== "block" || block.style !== "normal" ||
      block.markDefs?.length || block.children?.length !== 1 ||
      block.children[0]?._type !== "span" || block.children[0].marks?.length) return null;
  return block.children[0].text;
}

function tableCells(line) {
  if (typeof line !== "string" || !/^\|.*\|$/.test(line.trim())) return null;
  return line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
}

function convertBody(body, filename) {
  const blocks = markdownToPortableText(body);
  const result = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = plainBlockText(block);
    if (typeof text === "string" && /^<a id="[a-z0-9-]+"><\/a>$/.test(text)) {
      result.push({ _type: "htmlBlock", _key: block._key, html: text });
      continue;
    }
    const header = tableCells(text);
    const separator = tableCells(plainBlockText(blocks[i + 1]));
    if (header && separator && header.length === separator.length &&
        separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const rows = [header];
      i++;
      while (i + 1 < blocks.length) {
        const cells = tableCells(plainBlockText(blocks[i + 1]));
        if (!cells || cells.length !== header.length) break;
        rows.push(cells);
        i++;
      }
      result.push({
        _type: "table", _key: block._key, hasHeaderRow: true,
        rows: rows.map((cells, rowIndex) => ({
          _type: "tableRow", _key: `${block._key}-r${rowIndex}`,
          cells: cells.map((cell, cellIndex) => ({
            _type: "tableCell", _key: `${block._key}-r${rowIndex}-c${cellIndex}`,
            isHeader: rowIndex === 0,
            content: [{ _type: "span", _key: `${block._key}-r${rowIndex}-c${cellIndex}-s`, text: cell, marks: [] }],
          })),
        })),
      });
      continue;
    }
    result.push(block);
  }
  for (const block of result) {
    if (block._type !== "image" || !block.asset?.url?.startsWith("/")) continue;
    if (!existsSync(resolve(root, "static", block.asset.url.slice(1)))) {
      throw new Error(`Missing image ${block.asset.url} in ${filename}`);
    }
  }
  return result;
}
const termSlug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const taxonomy = (name, values) => ({
  name,
  label: name === "tag" ? "Tags" : "Categories",
  labelSingular: name === "tag" ? "Tag" : "Category",
  hierarchical: name === "category",
  collections: ["posts"],
  terms: [...new Set(values)].map((label) => ({ slug: termSlug(label), label })),
});

const seed = {
  version: "1",
  meta: { name: "508.dev blog prototype", author: "508.dev" },
  settings: {
    title: "508.dev Blog",
    tagline: "Ideas and updates from the 508.dev co-op",
    url: "https://emdash.508.dev",
  },
  collections: [{
    slug: "posts",
    label: "Posts",
    labelSingular: "Post",
    urlPattern: "/posts/{slug}",
    supports: ["drafts", "revisions", "preview", "scheduling", "search", "seo"],
    commentsEnabled: false,
    fields: [
      { slug: "title", label: "Title", type: "string", required: true, searchable: true },
      { slug: "featured_image", label: "Featured Image", type: "image" },
      { slug: "content", label: "Content", type: "portableText", searchable: true },
      { slug: "excerpt", label: "Excerpt", type: "text" },
      { slug: "original_date", label: "Original publication date", type: "string" },
    ],
  }],
  taxonomies: [
    taxonomy("category", posts.flatMap(({ meta }) => meta.categories || [])),
    taxonomy("tag", posts.flatMap(({ meta }) => meta.tags || [])),
  ],
  bylines: [...new Set(posts.map((post) => post.author))].map((name) => ({
    id: `byline-${termSlug(name)}`,
    slug: termSlug(name),
    displayName: name,
  })),
  menus: [{
    name: "primary",
    label: "Primary Navigation",
    items: [
      { type: "custom", label: "Home", url: "/" },
      { type: "custom", label: "Posts", url: "/posts" },
      { type: "custom", label: "Search", url: "/search" },
    ],
  }],
  content: {
    posts: posts.map(({ filename, meta, author, body }) => ({
      id: `post-${meta.slug}`,
      slug: meta.slug,
      status: meta.draft ? "draft" : "published",
      data: {
        title: meta.title,
        excerpt: meta.summary || meta.description || "",
        original_date: new Date(meta.date).toISOString(),
        content: convertBody(body, filename),
      },
      taxonomies: {
        category: (meta.categories || []).map(termSlug),
        tag: (meta.tags || []).map(termSlug),
      },
      bylines: [{ byline: `byline-${termSlug(author)}` }],
    })),
  },
};

writeFileSync(resolve(here, "../seed/seed.json"), `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Generated EmDash seed with ${posts.length} posts`);
