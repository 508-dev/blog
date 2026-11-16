import assert from "node:assert/strict";
import test from "node:test";
import { prepareFeedHtml } from "./feed-html.ts";

const postUrl = new URL("https://emdash.508.dev/posts/ai-meets-web3-reality-architecture-future");

test("the feed allowlist keeps images, strike-through and code languages, and drops other classes and control characters", () => {
	const html = prepareFeedHtml(
		'<p class="lead">Old <del>price</del>\u0008</p>' +
			'<pre><code class="language-python hljs">x = 1</code></pre>' +
			'<figure><img src="https://508.dev/a.png" alt=""><figcaption>Cap</figcaption></figure>',
		postUrl,
	);

	assert.equal(
		html,
		"<p>Old <del>price</del></p>" +
			'<pre><code class="language-python">x = 1</code></pre>' +
			'<figure><img src="https://508.dev/a.png" alt="" /><figcaption>Cap</figcaption></figure>',
	);
});

test("relative URLs and fragments resolve against the post, and absolute ones pass unchanged", () => {
	const html = prepareFeedHtml(
		'<img src="/images/ai-web3-series/part1-overview.jpg" alt="">' +
			'<a href="/posts/walrus-operator">a</a><a href="#part-2">b</a><a href="mailto:hello@508.dev">c</a><a href="https://508.dev">d</a>',
		postUrl,
	);

	assert.equal(
		html,
		'<img src="https://emdash.508.dev/images/ai-web3-series/part1-overview.jpg" alt="" />' +
			'<a href="https://emdash.508.dev/posts/walrus-operator">a</a>' +
			'<a href="https://emdash.508.dev/posts/ai-meets-web3-reality-architecture-future#part-2">b</a>' +
			'<a href="mailto:hello@508.dev">c</a><a href="https://508.dev">d</a>',
	);
});
