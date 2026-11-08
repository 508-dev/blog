import type { AuthAdapter, RoleLevel } from "@emdash-cms/auth";
import type { identityFromClaims } from "./policy";

type Identity = NonNullable<ReturnType<typeof identityFromClaims>>;

export async function resolveAccount(adapter: AuthAdapter, identity: Identity, role: RoleLevel) {
	const linked = await adapter.getOAuthAccount("authentik", identity.id);
	let user = linked ? await adapter.getUserById(linked.userId) : await adapter.getUserByEmail(identity.email);
	if (linked && !user) throw new Error("Linked EmDash account missing");
	if (user?.disabled) throw new Error("EmDash account disabled");
	if (!linked) {
		if (user) {
			const accounts = await adapter.getOAuthAccountsByUserId(user.id);
			if (accounts.some((account) => account.provider === "authentik")) {
				throw new Error("EmDash account already linked to another Authentik identity");
			}
		} else {
			user = await adapter.createUser({
				email: identity.email,
				name: identity.name,
				role,
				emailVerified: identity.emailVerified,
			});
		}
		await adapter.createOAuthAccount({
			provider: "authentik",
			providerAccountId: identity.id,
			userId: user.id,
		});
	}
	if (!user) throw new Error("EmDash account unavailable");
	if (user.role !== role) await adapter.updateUser(user.id, { role });
	return { ...user, role };
}
