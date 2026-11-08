import assert from "node:assert/strict";
import test from "node:test";
import { Role, type AuthAdapter, type RoleLevel, type User } from "@emdash-cms/auth";
import { resolveAccount } from "./account.ts";

const identity = { id: "authentik-123", email: "editor@508.dev", name: "Editor", groups: ["508-members"] };

function fakeAdapter(initial?: User) {
	const users = new Map<string, User>();
	if (initial) users.set(initial.id, initial);
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
		async createOAuthAccount({ provider, providerAccountId, userId }: { provider: string; providerAccountId: string; userId: string }) {
			links.set(`${provider}:${providerAccountId}`, userId);
			return { provider, providerAccountId, userId, createdAt: new Date() };
		},
		async createUser(input: { email: string; name?: string | null; role?: RoleLevel; emailVerified?: boolean }) {
			const user: User = {
				id: "new-user", email: input.email, name: input.name ?? null, avatarUrl: null,
				role: input.role ?? Role.SUBSCRIBER, emailVerified: input.emailVerified ?? false,
				disabled: false, data: null, createdAt: new Date(), updatedAt: new Date(),
			};
			users.set(user.id, user);
			return user;
		},
		async updateUser(id: string, data: Partial<User>) {
			Object.assign(users.get(id)!, data);
		},
	} as unknown as AuthAdapter;
	return { adapter, users, links };
}

test("verified Authentik identity links an existing email and applies the member role", async () => {
	const prior: User = {
		id: "existing-admin", email: identity.email, name: null, avatarUrl: null,
		role: Role.ADMIN, emailVerified: false, disabled: false, data: null,
		createdAt: new Date(), updatedAt: new Date(),
	};
	const { adapter, links } = fakeAdapter(prior);
	const user = await resolveAccount(adapter, identity, Role.SUBSCRIBER);
	assert.equal(user.id, prior.id);
	assert.equal(user.role, Role.SUBSCRIBER);
	assert.equal(links.get("authentik:authentik-123"), prior.id);
});

test("admin group provisions a new admin and reuses its stable subject on later login", async () => {
	const { adapter, users } = fakeAdapter();
	const first = await resolveAccount(adapter, identity, Role.ADMIN);
	const second = await resolveAccount(adapter, identity, Role.ADMIN);
	assert.equal(first.id, second.id);
	assert.equal(first.role, Role.ADMIN);
	assert.equal(users.size, 1);
});

test("disabled EmDash accounts cannot sign in or acquire a new link", async () => {
	const prior: User = {
		id: "disabled", email: identity.email, name: null, avatarUrl: null,
		role: Role.ADMIN, emailVerified: true, disabled: true, data: null,
		createdAt: new Date(), updatedAt: new Date(),
	};
	const { adapter, links } = fakeAdapter(prior);
	await assert.rejects(resolveAccount(adapter, identity, Role.ADMIN));
	assert.equal(links.size, 0);
});
