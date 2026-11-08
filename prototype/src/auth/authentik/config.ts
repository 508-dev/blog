import * as oidc from "openid-client";

const callbackPath = "/_emdash/api/auth/authentik/callback";
let discovered: Promise<oidc.Configuration> | undefined;

export function getAuthentikSettings() {
	const issuer = process.env.EMDASH_AUTHENTIK_ISSUER;
	const clientId = process.env.EMDASH_AUTHENTIK_CLIENT_ID;
	const clientSecret = process.env.EMDASH_AUTHENTIK_CLIENT_SECRET;
	const adminGroup = process.env.EMDASH_AUTHENTIK_ADMIN_GROUP;
	const memberGroup = process.env.EMDASH_AUTHENTIK_MEMBER_GROUP;
	const siteUrl = process.env.EMDASH_SITE_URL;
	if (!issuer || !clientId || !clientSecret || !adminGroup || !memberGroup || !siteUrl) {
		throw new Error("Authentik SSO is not configured");
	}
	const issuerUrl = new URL(issuer);
	const site = new URL(siteUrl);
	if (issuerUrl.protocol !== "https:" || site.protocol !== "https:") {
		throw new Error("Authentik issuer and EmDash site URL must use HTTPS");
	}
	if (adminGroup === memberGroup) throw new Error("Authentik groups must be distinct");
	return {
		issuerUrl,
		clientId,
		clientSecret,
		adminGroup,
		memberGroup,
		callbackUrl: new URL(callbackPath, site).toString(),
	};
}

export async function getOidcConfig(settings: ReturnType<typeof getAuthentikSettings>) {
	if (!discovered) {
		discovered = oidc.discovery(settings.issuerUrl, settings.clientId, settings.clientSecret);
	}
	try {
		return await discovered;
	} catch (error) {
		discovered = undefined;
		throw error;
	}
}
