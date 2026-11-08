import { Role, type RoleLevel } from "@emdash-cms/auth";

/** This deployment trusts Authentik as the source of @508.dev email ownership. */
export function identityFromClaims(claims: Record<string, unknown>) {
	const { sub, email, email_verified: emailVerified, name, groups } = claims;
	if (typeof sub !== "string" || !sub || typeof email !== "string") return null;
	if (!/^[^\s@]+@508\.dev$/i.test(email)) return null;
	if (!Array.isArray(groups) || !groups.every((group) => typeof group === "string")) return null;
	return {
		id: sub,
		email: email.toLowerCase(),
		emailVerified: emailVerified === true,
		name: typeof name === "string" && name ? name : null,
		groups,
	};
}

export function roleForGroups(
	groups: string[],
	adminGroup: string,
	memberGroup: string,
): RoleLevel | null {
	if (groups.includes(adminGroup)) return Role.ADMIN;
	if (groups.includes(memberGroup)) return Role.SUBSCRIBER;
	return null;
}
