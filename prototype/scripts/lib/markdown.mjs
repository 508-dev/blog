import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { markdownToPortableText } from "emdash/client";

function plainBlockText(block) {
  if (block?._type !== "block" || block.style !== "normal" ||
      block.markDefs?.length || block.children?.length !== 1 ||
      block.children[0]?._type !== "span" || block.children[0].marks?.length) return null;
  return block.children[0].text;
}

function tableCells(block) {
  if (block?._type !== "block" || block.style !== "normal" || block.markDefs?.length ||
      !block.children?.every((child) => child._type === "span" && typeof child.text === "string")) return null;
  const line = block.children.map((child) => child.text).join("").trim();
  if (!/^\|.*\|$/.test(line)) return null;

  const cells = [];
  let current = [];
  let inside = false;
  for (const child of block.children) {
    for (const part of child.text.split(/(\|)/)) {
      if (part === "|") {
        if (inside) cells.push(current);
        current = [];
        inside = true;
      } else if (inside && part) {
        current.push({ text: part, marks: child.marks || [] });
      }
    }
  }
  return cells.map((cell) => {
    while (cell.length && !cell[0].text.trim()) cell.shift();
    while (cell.length && !cell.at(-1).text.trim()) cell.pop();
    if (cell.length) {
      cell[0].text = cell[0].text.trimStart();
      cell.at(-1).text = cell.at(-1).text.trimEnd();
    }
    return cell;
  });
}

export function convertBody(body, filename, staticDirectory) {
  const blocks = markdownToPortableText(body);
  // The converter leaves links nested inside bold Markdown as literal text.
  for (const block of blocks) {
    if (block._type !== "block" || !Array.isArray(block.children)) continue;
    block.children = block.children.flatMap((child) => {
      const link = child._type === "span" && child.marks?.includes("strong") &&
        child.text?.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)(:?)$/);
      if (!link) return [child];
      const key = `${child._key}-link`;
      block.markDefs.push({ _key: key, _type: "link", href: link[2] });
      return [
        { ...child, text: link[1], marks: [...child.marks, key] },
        ...(link[3] ? [{ _type: "span", _key: `${child._key}-colon`, text: link[3], marks: child.marks }] : []),
      ];
    });
  }
  const result = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = plainBlockText(block);
    const youtube = typeof text === "string" && text.match(/^\{\{< youtube ([a-zA-Z0-9_-]{11}) >\}\}$/);
    if (youtube) {
      result.push({ _type: "embed", _key: block._key, url: `https://www.youtube.com/watch?v=${youtube[1]}` });
      continue;
    }
    if (typeof text === "string" && /^<a id="[a-z0-9-]+"><\/a>$/.test(text)) {
      result.push({ _type: "htmlBlock", _key: block._key, html: text });
      continue;
    }
    const header = tableCells(block);
    const separator = tableCells(blocks[i + 1]);
    if (header && separator && header.length === separator.length &&
        separator.every((cell) => /^:?-{3,}:?$/.test(cell.map((span) => span.text).join("")))) {
      const rows = [header];
      i++;
      while (i + 1 < blocks.length) {
        const cells = tableCells(blocks[i + 1]);
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
            content: (cell.length ? cell : [{ text: "", marks: [] }]).map((span, spanIndex) => ({
              _type: "span", _key: `${block._key}-r${rowIndex}-c${cellIndex}-s${spanIndex}`,
              text: span.text, marks: span.marks,
            })),
          })),
        })),
      });
      continue;
    }
    result.push(block);
  }
  for (const block of result) {
    if (block._type !== "image" || !block.asset?.url?.startsWith("/")) continue;
    if (!existsSync(resolve(staticDirectory, block.asset.url.slice(1)))) {
      throw new Error(`Missing image ${block.asset.url} in ${filename}`);
    }
  }
  return result;
}
