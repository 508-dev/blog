import assert from "node:assert/strict";
import test from "node:test";
import { loadGitHubAdminIdentity } from "./github-api.ts";

function githubResponses(membership: { state: string } | null, emails: unknown = []) {
	const requests: string[] = [];
	const fetcher = (async (input: RequestInfo | URL) => {
		const url = String(input);
		requests.push(url);
		if (url.endsWith("/user")) {
			return Response.json({ id: 123, login: "blog-admin", name: "Blog Admin", avatar_url: null });
		}
		if (url.includes("/teams/admins/memberships/")) {
			return membership ? Response.json(membership) : new Response(null, { status: 404 });
		}
		if (url.includes("/user/emails")) {
			const pages = Array.isArray(emails) && Array.isArray(emails[0]) ? emails : [emails];
			const page = Number(new URL(url).searchParams.get("page") ?? "1");
			return Response.json(pages[page - 1] ?? []);
		}
		throw new Error(`Unexpected GitHub URL: ${url}`);
	}) as typeof fetch;
	return { fetcher, requests };
}

test("active Admins membership permits a verified 508.dev email", async () => {
	const { fetcher, requests } = githubResponses({ state: "active" }, [
		{ email: "personal@example.com", primary: true, verified: true },
		{ email: "Admin@508.dev", primary: false, verified: true },
	]);
	assert.deepEqual(await loadGitHubAdminIdentity("test-token", fetcher), {
		id: "123", email: "admin@508.dev", name: "Blog Admin", avatarUrl: null,
	});
	assert.ok(requests[1].endsWith("/orgs/508-dev/teams/admins/memberships/blog-admin"));
});

test("Admin team members do not need a 508.dev address on GitHub", async () => {
	const { fetcher } = githubResponses({ state: "active" }, [
		{ email: "admin@personal.example", primary: true, verified: true },
	]);
	assert.equal((await loadGitHubAdminIdentity("test-token", fetcher))?.email, "admin@personal.example");
});

test("a verified 508.dev address on a later email page wins over a personal address", async () => {
	const firstPage = Array.from({ length: 100 }, (_, index) => ({
		email: `person${index}@personal.example`, primary: index === 0, verified: true,
	}));
	const { fetcher, requests } = githubResponses({ state: "active" }, [
		firstPage,
		[{ email: "michael@508.dev", primary: false, verified: true }],
	]);
	assert.equal((await loadGitHubAdminIdentity("test-token", fetcher))?.email, "michael@508.dev");
	assert.ok(requests.some((url) => url.includes("/user/emails?per_page=100&page=2")));
});

test("pending and absent team memberships deny login before reading email", async () => {
	for (const membership of [{ state: "pending" }, null]) {
		const { fetcher, requests } = githubResponses(membership);
		assert.equal(await loadGitHubAdminIdentity("test-token", fetcher), null);
		assert.equal(requests.length, 2);
	}
});

test("an active team member still needs a verified email", async () => {
	const { fetcher } = githubResponses({ state: "active" }, [
		{ email: "admin@508.dev", primary: true, verified: false },
	]);
	await assert.rejects(loadGitHubAdminIdentity("test-token", fetcher));
});
