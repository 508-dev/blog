import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { markdownToPortableText } from "emdash/client";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const filenames = [
  "why-coop.md",
  "508-devkit.md",
  "paseo-visual-agent-orchestration.md",
];

function readPost(filename) {
  const source = readFileSync(resolve(root, "content/posts", filename), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing YAML front matter: ${filename}`);
  const meta = parseYaml(match[1]);
  const author = typeof meta.author === "string" ? meta.author : meta.author?.name;
  if (!meta.title || !meta.slug || !author) throw new Error(`Missing title, slug, or author: ${filename}`);
  return { meta, author, body: match[2] };
}

const posts = filenames.map(readPost);
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
    posts: posts.map(({ meta, author, body }) => ({
      id: `post-${meta.slug}`,
      slug: meta.slug,
      status: "published",
      data: {
        title: meta.title,
        excerpt: meta.summary || meta.description || "",
        original_date: new Date(meta.date).toISOString(),
        content: markdownToPortableText(body),
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
