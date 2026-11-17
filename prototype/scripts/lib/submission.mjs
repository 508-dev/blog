import { closeSync, openSync, readFileSync, readSync, realpathSync, statSync } from "node:fs";
import { basename, extname, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { parseDocument } from "yaml";
import { validateSeed } from "emdash/seed";
import { convertBody } from "./markdown.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedFields = new Set(["title", "slug", "author", "summary", "tags", "categories"]);
const termSlug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function text(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  return value.trim();
}

export function assertSlug(value) {
  if (typeof value !== "string" || value.length > 63 || !slugPattern.test(value)) {
    throw new Error("Use a slug of at most 63 lowercase letters, digits, and single hyphens");
  }
  return value;
}

function terms(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be a list of strings`);
  const result = value.map((label) => {
    label = text(label, field);
    return { label, slug: assertSlug(termSlug(label)) };
  });
  if (new Set(result.map((term) => term.slug)).size !== result.length) {
    throw new Error(`${field} contains duplicate or colliding slugs`);
  }
  return result;
}

function validateLinks(value) {
  if (!value || typeof value !== "object") return;
  for (const mark of Array.isArray(value.markDefs) ? value.markDefs : []) {
    if (mark?._type !== "link") continue;
    const href = mark.href;
    if (typeof href !== "string" || !href || /[\u0000-\u0020\u007f\\]/u.test(href)) {
      throw new Error("Link target must be a URL without whitespace or control characters");
    }
    if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) continue;
    if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
      const url = new URL(href);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname) continue;
      if (url.protocol === "mailto:" && url.pathname) continue;
    }
    throw new Error(`Unsupported link target: ${href}. Use HTTP(S), mailto, /site-path, or #anchor links`);
  }
  for (const child of Object.values(value)) validateLinks(child);
}

function validateImageFile(path, url) {
  const header = Buffer.alloc(12);
  const file = openSync(path, "r");
  try { readSync(file, header, 0, header.length, 0); } finally { closeSync(file); }
  const extension = extname(url).toLowerCase();
  const valid = extension === ".png" ? header.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    : [".jpg", ".jpeg"].includes(extension) ? header.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
    : extension === ".gif" ? ["GIF87a", "GIF89a"].includes(header.subarray(0, 6).toString("ascii"))
    : extension === ".webp" ? header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP"
    : false;
  if (!valid) throw new Error(`Image extension and file header must match PNG, JPEG, GIF, or WebP: ${url}`);
}

/** Read reviewed Markdown as data. This never evaluates MDX or fetches URLs. */
export function readSubmission(filename, staticDirectory) {
  const source = readFileSync(filename, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Submission needs YAML front matter followed by Markdown");
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors.map((error) => error.message).join("; "));
  const meta = document.toJS({ maxAliasCount: 0 });
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) throw new Error("Front matter must be a mapping");
  for (const key of Object.keys(meta)) {
    if (!allowedFields.has(key)) throw new Error(`Unsupported front matter field: ${key}`);
  }
  const slug = assertSlug(meta.slug);
  if (basename(filename) !== `${slug}.md`) throw new Error(`Filename must be ${slug}.md`);
  const authorName = text(typeof meta.author === "string" ? meta.author : meta.author?.name, "author");
  const authorSlug = assertSlug(typeof meta.author === "object" && meta.author?.slug !== undefined
    ? meta.author.slug : termSlug(authorName));
  const title = text(meta.title, "title");
  const summary = meta.summary === undefined ? "" : text(meta.summary, "summary");
  if (!match[2].trim()) throw new Error("Submission body is empty");
  const content = convertBody(match[2], filename, staticDirectory);
  if (!content.length) throw new Error("Submission has no supported Markdown content");
  validateLinks(content);
  for (const block of content) {
    if (!["block", "code", "image", "table"].includes(block._type)) {
      throw new Error(`Unsupported block: ${block._type}. Use standard Markdown rather than HTML, MDX, or shortcodes`);
    }
    if (block._type !== "image") continue;
    const url = block.asset?.url;
    if (typeof url !== "string") throw new Error("Image URL missing");
    if (url.startsWith("/images/") && !/[?#%\\]/.test(url)) {
      const root = realpathSync(staticDirectory);
      const path = realpathSync(resolve(root, url.slice(1)));
      const rel = relative(resolve(root, "images"), path);
      if (rel.startsWith(`..${sep}`) || rel === ".." || !statSync(path).isFile()) {
        throw new Error(`Image is outside static/images/ or not a regular file: ${url}`);
      }
      validateImageFile(path, url);
    } else if (!/^https:\/\//.test(url)) {
      throw new Error(`Image must use /images/... in static/ or an https:// URL: ${url}`);
    }
  }
  const taxonomies = [["tag", terms(meta.tags, "tags")], ["category", terms(meta.categories, "categories")]];
  const seed = {
    version: "1",
    bylines: [{ id: `author-${authorSlug}`, slug: authorSlug, displayName: authorName }],
    taxonomies: taxonomies.map(([name, items]) => ({
      name, label: name === "tag" ? "Tags" : "Categories",
      labelSingular: name === "tag" ? "Tag" : "Category",
      hierarchical: name === "category", collections: ["posts"], terms: items,
    })),
    content: { posts: [{
      id: `submission-${slug}`, slug, status: "draft",
      data: { title, excerpt: summary, content },
      bylines: [{ byline: `author-${authorSlug}` }],
      taxonomies: Object.fromEntries(taxonomies.map(([name, items]) => [name, items.map((term) => term.slug)])),
    }] },
  };
  const validation = validateSeed(seed);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  return { slug, title, seed, digest: createHash("sha256").update(source).digest("hex") };
}
