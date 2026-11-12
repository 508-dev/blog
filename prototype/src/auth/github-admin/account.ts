import { Role, type AuthAdapter, type User } from "@emdash-cms/auth";
import type { GitHubAdminIdentity } from "./github-api";

export class GitHubLinkRequiredError extends Error {}

/** Link by a verified matching email, or by a signed-in Admin's explicit request. */
export async function resolveGitHubAdminAccount(
	adapter: AuthAdapter,
	identity: GitHubAdminIdentity,
	linkUserId?: string,
	signedInUserId?: string,
): Promise<User> {
	const linked = await adapter.getOAuthAccount("github-admin", identity.id);
	let user: User | null;
	if (linkUserId) {
		if (signedInUserId !== linkUserId) throw new Error("EmDash link session changed");
		user = await adapter.getUserById(linkUserId);
		if (!user || user.disabled || user.role !== Role.ADMIN) throw new Error("EmDash Admin link target unavailable");
		if (linked && linked.userId !== user.id) throw new Error("GitHub identity belongs to another EmDash user");
	} else if (linked) {
		user = await adapter.getUserById(linked.userId);
	} else {
		user = await adapter.getUserByEmail(identity.email);
		if (!user) throw new GitHubLinkRequiredError("GitHub identity needs explicit linking");
	}
	if (!user || user.disabled) throw new Error("EmDash account unavailable");
	if (!linked) {
		const accounts = await adapter.getOAuthAccountsByUserId(user.id);
		if (accounts.some((account) => account.provider === "github-admin")) {
			throw new Error("EmDash account already linked to another GitHub identity");
		}
		await adapter.createOAuthAccount({
			provider: "github-admin",
			providerAccountId: identity.id,
			userId: user.id,
		});
	}
	if (user.role !== Role.ADMIN) await adapter.updateUser(user.id, { role: Role.ADMIN });
	return { ...user, role: Role.ADMIN };
}
