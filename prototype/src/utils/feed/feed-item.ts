import type { RSSFeedItem } from "@astrojs/rss";
import type { PortableTextBlock } from "emdash";
import { publicationDate } from "../publication-date.ts";
import { escapeMarkup } from "./escape-markup.ts";
import { prepareFeedHtml } from "./feed-html.ts";
import { portableTextToFeedHtml } from "./portable-text-html.ts";

interface FeedPost {
	id: string;
	data: {
		title?: string;
		excerpt?: string;
		content?: PortableTextBlock[];
		publishedAt: Date | null;
		original_date?: string;
		bylines?: { byline: { displayName: string } }[];
		terms?: Record<string, { label: string }[]>;
	};
}

export function postToFeedItem(post: FeedPost, site: URL) {
	// `updatedAt` is the import time for every migrated post, so it would re-date the archive
	const pubDate = publicationDate(post.data);
	if (!pubDate) return null;

	const postUrl = new URL(`/posts/${post.id}`, site);
	const content = post.data.content?.length ? prepareFeedHtml(portableTextToFeedHtml(post.data.content), postUrl) : "";
	// RSS's own `author` must be an email address
	const creators = (post.data.bylines ?? []).map((credit) => `<dc:creator>${escapeMarkup(credit.byline.displayName)}</dc:creator>`);

	return {
		title: post.data.title || "Untitled",
		link: postUrl.href,
		pubDate,
		...(post.data.excerpt ? { description: post.data.excerpt } : {}),
		...(content ? { content } : {}),
		categories: (post.data.terms?.tag ?? []).map((term) => term.label),
		...(creators.length > 0 ? { customData: creators.join("") } : {}),
	} satisfies RSSFeedItem;
}
