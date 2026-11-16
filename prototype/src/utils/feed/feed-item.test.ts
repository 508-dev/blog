import assert from "node:assert/strict";
import test from "node:test";
import { postToFeedItem } from "./feed-item.ts";

const site = new URL("https://emdash.508.dev");

const post = {
	id: "ai-meets-web3-reality-architecture-future",
	data: {
		title: "AI Meets Web3: Reality, Architecture, and the Future",
		excerpt: "A six-part series.",
		content: [
			{ _type: "image", _key: "k9z", alt: "Part 1 overview", asset: { url: "/images/ai-web3-series/part1-overview.jpg" } },
		],
		publishedAt: new Date("2026-10-30T12:00:00.000Z"),
		original_date: "2026-01-18T00:00:00.000Z",
		bylines: [{ byline: { displayName: "Caleb Rogers" } }, { byline: { displayName: "Smith & <Co>" } }],
		terms: { tag: [{ label: "AI" }, { label: "Web3" }], category: [{ label: "technical" }] },
	},
};

test("a post becomes an item with an absolute link, tag categories and feed-safe content", () => {
	const item = postToFeedItem(post, site);

	assert.equal(item?.link, "https://emdash.508.dev/posts/ai-meets-web3-reality-architecture-future");
	assert.equal(item?.description, "A six-part series.");
	assert.deepEqual(item?.categories, ["AI", "Web3"]);
	assert.equal(
		item?.content,
		'<figure><img src="https://emdash.508.dev/images/ai-web3-series/part1-overview.jpg" alt="Part 1 overview" /></figure>',
	);
});

test("each byline becomes an escaped dc:creator, and a post without bylines carries none", () => {
	const anonymous = postToFeedItem({ ...post, data: { ...post.data, bylines: [] } }, site);

	assert.equal(
		postToFeedItem(post, site)?.customData,
		"<dc:creator>Caleb Rogers</dc:creator><dc:creator>Smith &amp; &lt;Co&gt;</dc:creator>",
	);
	assert.ok(anonymous && !("customData" in anonymous));
});
