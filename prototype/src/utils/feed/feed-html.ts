import sanitizeHtml from "sanitize-html";

// XML 1.0 forbids these, so one pasted into a post would break the whole feed
const xmlIllegalCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function resolveAttribute(attribs: sanitizeHtml.Attributes, name: string, base: URL) {
	const value = attribs[name];
	if (value === undefined || URL.canParse(value)) return attribs;

	return { ...attribs, [name]: URL.parse(value, base)?.href ?? value };
}

// Not EmDash's site allowlist, which keeps `class`, `data-*` and iframes that feed readers strip
// Relative URLs in a feed resolve against the reader, so they resolve against the post here
export function prepareFeedHtml(html: string, postUrl: URL) {
	return sanitizeHtml(html.replaceAll(xmlIllegalCharacters, ""), {
		allowedTags: [...sanitizeHtml.defaults.allowedTags, "del", "img"],
		allowedAttributes: { a: ["href"], code: ["class"], img: ["src", "alt"] },
		allowedClasses: { code: ["language-*"] },
		transformTags: {
			a: (tagName, attribs) => ({ tagName, attribs: resolveAttribute(attribs, "href", postUrl) }),
			img: (tagName, attribs) => ({ tagName, attribs: resolveAttribute(attribs, "src", postUrl) }),
		},
	});
}
