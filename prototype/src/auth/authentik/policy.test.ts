import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@emdash-cms/auth";
import { identityFromClaims, roleForGroups } from "./policy.ts";

const claims = {
	sub: "stable-authentik-subject",
	email: "Editor@508.dev",
	email_verified: true,
	groups: ["508-members"],
	name: "Editor",
};

test("only a verified email and a valid groups claim can identify a user", () => {
	assert.deepEqual(identityFromClaims(claims), {
		id: "stable-authentik-subject",
		email: "editor@508.dev",
		name: "Editor",
		groups: ["508-members"],
	});
	assert.equal(identityFromClaims({ ...claims, email_verified: false }), null);
	assert.equal(identityFromClaims({ ...claims, groups: undefined }), null);
	assert.equal(identityFromClaims({ ...claims, groups: ["508-members", 50] }), null);
	assert.equal(identityFromClaims({ ...claims, sub: "" }), null);
});

test("only configured groups grant roles, with admin taking precedence", () => {
	assert.equal(roleForGroups(["508-admins", "508-members"], "508-admins", "508-members"), Role.ADMIN);
	assert.equal(roleForGroups(["508-members"], "508-admins", "508-members"), Role.SUBSCRIBER);
	assert.equal(roleForGroups(["unrelated"], "508-admins", "508-members"), null);
	assert.equal(roleForGroups([], "508-admins", "508-members"), null);
});
