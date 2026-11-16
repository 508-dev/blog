import {
	toHTML,
	type NodeRenderer,
	type PortableTextComponents,
	type PortableTextTypeComponentOptions,
} from "@portabletext/to-html";
import type {
	PortableTextBlock,
	PortableTextCodeBlock,
	PortableTextHtmlBlock,
	PortableTextImageBlock,
	PortableTextTableBlock,
	PortableTextTableCell,
} from "emdash";
import { escapeMarkup } from "./escape-markup.ts";

interface EmbedBlock {
	_type: "embed";
	url: string;
}

const tableCellStyle = "feedTableCell";

function renderCode({ value }: PortableTextTypeComponentOptions<PortableTextCodeBlock>) {
	const languageClass = value.language ? ` class="language-${escapeMarkup(value.language)}"` : "";
	return `<pre><code${languageClass}>${escapeMarkup(value.code)}</code></pre>`;
}

// Mirrors the `local()` storage `baseUrl` in astro.config.mjs
function renderImage({ value }: PortableTextTypeComponentOptions<PortableTextImageBlock>) {
	const source = value.asset.url ?? `/_emdash/api/media/file/${value.asset._ref}`;
	const image = `<img src="${escapeMarkup(source)}" alt="${escapeMarkup(value.alt ?? "")}">`;
	const caption = value.caption ? `<figcaption>${escapeMarkup(value.caption)}</figcaption>` : "";
	return `<figure>${image}${caption}</figure>`;
}

// Renders a cell's spans through the mark pipeline without the `<p>` a normal block gets
function renderTableCell(
	cell: PortableTextTableCell,
	table: PortableTextTableBlock,
	isHeader: boolean,
	renderNode: NodeRenderer,
) {
	const tag = isHeader || cell.isHeader ? "th" : "td";
	const content = renderNode({
		node: {
			_type: "block",
			_key: cell._key,
			style: tableCellStyle,
			children: cell.content,
			markDefs: [...(cell.markDefs ?? []), ...(table.markDefs ?? [])],
		},
		index: 0,
		isInline: false,
		renderNode,
	});
	return `<${tag}>${content}</${tag}>`;
}

function renderTable({ value, renderNode }: PortableTextTypeComponentOptions<PortableTextTableBlock>) {
	const rows = value.rows.map((row, rowIndex) => {
		const isHeaderRow = value.hasHeaderRow === true && rowIndex === 0;
		const cells = row.cells.map((cell) => renderTableCell(cell, value, isHeaderRow, renderNode));
		return `<tr>${cells.join("")}</tr>`;
	});
	if (value.hasHeaderRow !== true) return `<table><tbody>${rows.join("")}</tbody></table>`;

	const [headerRow, ...bodyRows] = rows;
	return `<table><thead>${headerRow}</thead><tbody>${bodyRows.join("")}</tbody></table>`;
}

// The sanitizer in feed-html.ts is what makes passing this through safe
function renderHtmlBlock({ value }: PortableTextTypeComponentOptions<PortableTextHtmlBlock>) {
	return value.html;
}

// Readers strip iframes, so a link is the form that survives
function renderEmbed({ value }: PortableTextTypeComponentOptions<EmbedBlock>) {
	const url = escapeMarkup(value.url);
	return `<p><a href="${url}">${url}</a></p>`;
}

const feedComponents: PortableTextComponents = {
	types: {
		code: renderCode,
		embed: renderEmbed,
		htmlBlock: renderHtmlBlock,
		image: renderImage,
		table: renderTable,
	},
	block: {
		[tableCellStyle]: ({ children }) => children ?? "",
	},
	// The default is a styled span, and the sanitizer strips `style`
	marks: {
		underline: ({ children }) => `<u>${children}</u>`,
	},
	// The default renders a hidden placeholder; the library still logs the missing type
	unknownType: () => "",
};

export function portableTextToFeedHtml(blocks: PortableTextBlock[]) {
	return toHTML(blocks, { components: feedComponents });
}
