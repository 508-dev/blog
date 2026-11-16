import assert from "node:assert/strict";
import test from "node:test";
import { portableTextToFeedHtml } from "./portable-text-html.ts";

function cell(key: string, text: string, { isHeader = false, marks = [] as string[] } = {}) {
	return { _type: "tableCell", _key: key, isHeader, content: [{ _type: "span", _key: `${key}-s0`, text, marks }] };
}

test("a code block is escaped and keeps its indentation", () => {
	const html = portableTextToFeedHtml([
		{
			_type: "code",
			_key: "kko",
			language: "solidity",
			code: 'function executeTrade(uint256 exposure) external {\n    require(exposure <= MAX_EXPOSURE, "Exposure too high");\n}',
		},
	]);

	assert.equal(
		html,
		'<pre><code class="language-solidity">function executeTrade(uint256 exposure) external {\n' +
			"    require(exposure &lt;= MAX_EXPOSURE, &quot;Exposure too high&quot;);\n}</code></pre>",
	);
});

test("a header-row table renders th cells in thead and keeps cell marks", () => {
	const html = portableTextToFeedHtml([
		{
			_type: "table",
			_key: "k1iq",
			hasHeaderRow: true,
			rows: [
				{ _type: "tableRow", _key: "k1iq-r0", cells: [cell("k1iq-r0-c0", "Aspect", { isHeader: true })] },
				{ _type: "tableRow", _key: "k1iq-r3", cells: [cell("k1iq-r3-c0", "Performance & animation", { marks: ["strong"] })] },
			],
		},
	]);

	assert.equal(
		html,
		"<table><thead><tr><th>Aspect</th></tr></thead>" +
			"<tbody><tr><td><strong>Performance &amp; animation</strong></td></tr></tbody></table>",
	);
});

test("an image without a URL uses the media-file route, an embed becomes a link, and underline becomes u", () => {
	const html = portableTextToFeedHtml([
		{ _type: "image", _key: "k9z", alt: "Part 1 overview", asset: { _ref: "01JQ8Z6RMEDIA" } },
		{ _type: "embed", _key: "k1hw", url: "https://www.youtube.com/watch?v=GGojT82JL-k" },
		{
			_type: "block",
			_key: "k4",
			style: "normal",
			markDefs: [],
			children: [{ _type: "span", _key: "k4-s0", text: "Note", marks: ["underline"] }],
		},
	]);

	assert.equal(
		html,
		'<figure><img src="/_emdash/api/media/file/01JQ8Z6RMEDIA" alt="Part 1 overview"></figure>' +
			'<p><a href="https://www.youtube.com/watch?v=GGojT82JL-k">https://www.youtube.com/watch?v=GGojT82JL-k</a></p>' +
			"<p><u>Note</u></p>",
	);
});
