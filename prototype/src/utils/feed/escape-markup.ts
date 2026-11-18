// Not @portabletext/to-html's `escapeHTML`, which turns runs of spaces into `&nbsp;` and breaks code indentation
// Leaves `'` alone: @astrojs/rss re-parses `customData` and double-escapes numeric references like `&#39;`
export function escapeMarkup(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}
