import assert from "node:assert/strict";
import test from "node:test";
import { Role, type AuthAdapter, type RoleLevel, type User } from "@emdash-cms/auth";
import { GitHubLinkRequiredError, resolveGitHubAdminAccount } from "./account.ts";

const identity = { id: "github-123", email: "michael@508.dev", name: "Michael", avatarUrl: null };

function account(id: string, email: string, role: RoleLevel = Role.ADMIN): User {
	return { id, email, role, name: null, avatarUrl: null, emailVerified: true,
		disabled: false, data: null, createdAt: new Date(), updatedAt: new Date() };
}

function fakeAdapter(...initial: User[]) {
	const users = new Map(initial.map((user) => [user.id, user]));
	const links = new Map<string, string>();
	const adapter = {
		async getUserById(id: string) { return users.get(id) ?? null; },
		async getUserByEmail(email: string) {
			return [...users.values()].find((user) => user.email === email) ?? null;
		},
		async getOAuthAccount(provider: string, subject: string) {
			const userId = links.get(`${provider}:${subject}`);
			return userId ? { provider, providerAccountId: subject, userId, createdAt: new Date() } : null;
		},
		async getOAuthAccountsByUserId(userId: string) {
			return [...links.entries()].filter(([, linkedUserId]) => linkedUserId === userId)
				.map(([key]) => ({ provider: key.split(":")[0], providerAccountId: key.split(":")[1], userId, createdAt: new Date() }));
		},
		async createOAuthAccount({ provider, providerAccountId, userId }: { provider: string; providerAccountId: string; userId: string }) {
			links.set(`${provider}:${providerAccountId}`, userId);
			return { provider, providerAccountId, userId, createdAt: new Date() };
		},
		async updateUser(id: string, data: Partial<User>) { Object.assign(users.get(id)!, data); },
	} as unknown as AuthAdapter;
	return { adapter, users, links };
}

test("matching verified GitHub email links the existing EmDash account", async () => {
	const { adapter, users, links } = fakeAdapter(account("current", identity.email));
	const user = await resolveGitHubAdminAccount(adapter, identity);
	assert.equal(user.id, "current");
	assert.equal(users.size, 1);
	assert.equal(links.get("github-admin:github-123"), "current");
});

test("different email cannot silently create another Admin account", async () => {
	const { adapter, users, links } = fakeAdapter(account("current", "other@508.dev"));
	await assert.rejects(resolveGitHubAdminAccount(adapter, identity), GitHubLinkRequiredError);
	assert.equal(users.size, 1);
	assert.equal(links.size, 0);
});

test("a signed-in Admin can explicitly link a different GitHub email", async () => {
	const { adapter, links } = fakeAdapter(account("current", "other@508.dev"));
	const user = await resolveGitHubAdminAccount(adapter, identity, "current", "current");
	assert.equal(user.id, "current");
	assert.equal(links.get("github-admin:github-123"), "current");
	await assert.rejects(resolveGitHubAdminAccount(adapter, identity, "current", "other-session"));
});

test("explicit linking cannot attach to a disabled or non-admin account", async () => {
	const disabled = account("disabled", "other@508.dev");
	disabled.disabled = true;
	const { adapter } = fakeAdapter(disabled, account("reader", "reader@508.dev", Role.SUBSCRIBER));
	await assert.rejects(resolveGitHubAdminAccount(adapter, identity, "disabled", "disabled"));
	await assert.rejects(resolveGitHubAdminAccount(adapter, identity, "reader", "reader"));
});
