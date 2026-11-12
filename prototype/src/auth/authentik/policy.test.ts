import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@emdash-cms/auth";
import { identityFromClaims, roleForGroups } from "./policy.ts";

const claims = {
	sub: "stable-authentik-subject",
	email: "Editor@508.dev",
	email_verified: true,
	groups: ["508 Blog Members"],
	name: "Editor",
};

test("only a 508.dev email and a valid groups claim can identify a user", () => {
	assert.deepEqual(identityFromClaims(claims), {
		id: "stable-authentik-subject",
		email: "editor@508.dev",
		emailVerified: true,
		name: "Editor",
		groups: ["508 Blog Members"],
	});
	assert.equal(identityFromClaims({ ...claims, email_verified: false })?.emailVerified, false);
	assert.equal(identityFromClaims({ ...claims, email: "editor@example.com" }), null);
	assert.equal(identityFromClaims({ ...claims, email: "editor@508.dev.evil.test" }), null);
	assert.equal(identityFromClaims({ ...claims, groups: undefined }), null);
	assert.equal(identityFromClaims({ ...claims, groups: ["508 Blog Members", 50] }), null);
	assert.equal(identityFromClaims({ ...claims, sub: "" }), null);
});

test("only configured groups grant roles, with admin taking precedence", () => {
	assert.equal(roleForGroups(["authentik Admins", "508 Blog Members"], "authentik Admins", "508 Blog Members"), Role.ADMIN);
	assert.equal(roleForGroups(["508 Blog Members"], "authentik Admins", "508 Blog Members"), Role.SUBSCRIBER);
	assert.equal(roleForGroups(["unrelated"], "authentik Admins", "508 Blog Members"), null);
	assert.equal(roleForGroups([], "authentik Admins", "508 Blog Members"), null);
});
