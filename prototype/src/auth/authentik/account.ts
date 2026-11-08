import { findOrCreateOAuthUser, type AuthAdapter, type RoleLevel } from "@emdash-cms/auth";
import type { identityFromClaims } from "./policy";

type Identity = NonNullable<ReturnType<typeof identityFromClaims>>;

export async function resolveAccount(adapter: AuthAdapter, identity: Identity, role: RoleLevel) {
	const existing = await adapter.getUserByEmail(identity.email);
	if (existing?.disabled) throw new Error("EmDash account disabled");
	const user = await findOrCreateOAuthUser(
		adapter,
		"authentik",
		{ id: identity.id, email: identity.email, name: identity.name, avatarUrl: null, emailVerified: true },
		async () => ({ allowed: true, role }),
		{ requireVerifiedEmail: true },
	);
	if (user.disabled) throw new Error("EmDash account disabled");
	if (user.role !== role) await adapter.updateUser(user.id, { role });
	return user;
}
