import { getRssString, type RSSFeedItem } from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettingsWithCacheHint } from "emdash";

import { escapeMarkup } from "../utils/feed/escape-markup";
import { postToFeedItem } from "../utils/feed/feed-item";
import { resolveBlogSiteIdentity } from "../utils/site-identity";

export const GET: APIRoute = async ({ cache, site, url }) => {
	const [settingsResult, postsResult] = await Promise.all([
		getSiteSettingsWithCacheHint(),
		getEmDashCollection("posts", {
			orderBy: { published_at: "desc" },
			limit: 20,
		}),
	]);
	if (postsResult.error) {
		return new Response("Feed temporarily unavailable", {
			status: 503,
			headers: { "Cache-Control": "no-store" },
		});
	}
	if (cache.enabled) {
		cache.set(settingsResult.cacheHint);
		cache.set(postsResult.cacheHint);
	}

	const settings = settingsResult.data;
	const siteUrl = new URL(settings.url || site?.href || url.origin);
	const { siteTitle, siteTagline } = resolveBlogSiteIdentity(settings);

	const items: RSSFeedItem[] = [];
	for (const post of postsResult.entries) {
		const item = postToFeedItem(post, siteUrl);
		if (item) items.push(item);
	}

	const rss = await getRssString({
		title: siteTitle,
		description: siteTagline,
		site: siteUrl,
		trailingSlash: false,
		customData: `<language>en-us</language><atom:link href="${escapeMarkup(new URL("/rss.xml", siteUrl).href)}" rel="self" type="application/rss+xml"/>`,
		xmlns: {
			atom: "http://www.w3.org/2005/Atom",
			dc: "http://purl.org/dc/elements/1.1/",
		},
		items,
	});

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
