import { defineMiddleware } from "astro:middleware";

// Keep links and feed subscriptions from the former Hugo blog working after
// blog.508.dev moves to EmDash. Post URLs already use the same /posts/:slug path.
export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
	let destination: string | undefined;

	if (
		pathname === "/index.xml" ||
		pathname === "/posts/index.xml" ||
		/^\/(?:tags|categories)\/[^/]+\/index\.xml$/.test(pathname)
	) {
		destination = "/rss.xml";
	} else if (/^\/(?:tags|categories|collections)\/?$/.test(pathname)) {
		destination = "/posts";
	} else {
		const taxonomy = pathname.match(/^\/(tags|categories)\/([^/]+)\/?$/);
		if (taxonomy) {
			destination = `/${taxonomy[1] === "tags" ? "tag" : "category"}/${taxonomy[2]}`;
		}
	}

	if (!destination) return next();
	return Response.redirect(new URL(destination + search, context.url), 301);
});
