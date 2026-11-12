export const callbackPath = "/_emdash/api/auth/github-admin/callback";

export function getGitHubSettings() {
	const clientId = process.env.EMDASH_GITHUB_ADMIN_CLIENT_ID;
	const clientSecret = process.env.EMDASH_GITHUB_ADMIN_CLIENT_SECRET;
	const siteUrl = process.env.EMDASH_SITE_URL;
	if (!clientId || !clientSecret || !siteUrl) throw new Error("GitHub Admin login is not configured");
	const site = new URL(siteUrl);
	if (site.protocol !== "https:") throw new Error("EmDash site URL must use HTTPS");
	return { clientId, clientSecret, callbackUrl: new URL(callbackPath, site).toString() };
}
