export type GitHubAdminIdentity = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
};

async function getJson(url: string, token: string, fetcher: typeof fetch): Promise<unknown> {
	const response = await fetcher(url, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
		},
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
	return response.json();
}

/** The membership API is queried with the signing-in user's OAuth token. */
export async function loadGitHubAdminIdentity(
	token: string,
	fetcher: typeof fetch = fetch,
): Promise<GitHubAdminIdentity | null> {
	const profile = await getJson("https://api.github.com/user", token, fetcher);
	if (!profile || typeof profile !== "object" || !("id" in profile) || !("login" in profile)) {
		throw new Error("GitHub profile is incomplete");
	}
	const { id, login, name, avatar_url: avatarUrl } = profile as Record<string, unknown>;
	if ((typeof id !== "number" && typeof id !== "string") || typeof login !== "string" || !login) {
		throw new Error("GitHub profile has no stable identity");
	}
	let membership: unknown;
	try {
		membership = await getJson(
			`https://api.github.com/orgs/508-dev/teams/admins/memberships/${encodeURIComponent(login)}`,
			token,
			fetcher,
		);
	} catch (error) {
		if (error instanceof Error && error.message === "GitHub API returned 404") return null;
		throw error;
	}
	if (!membership || typeof membership !== "object" || !("state" in membership) || membership.state !== "active") {
		return null;
	}
	const addresses = await getJson("https://api.github.com/user/emails?per_page=100", token, fetcher);
	if (!Array.isArray(addresses)) throw new Error("GitHub email list is invalid");
	const verified = addresses.filter(
		(item): item is { email: string; verified: true; primary?: boolean } =>
			!!item && typeof item === "object" && typeof item.email === "string" &&
			item.verified === true && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email),
	);
	const selected = verified.find((item) => item.email.toLowerCase().endsWith("@508.dev")) ??
		verified.find((item) => item.primary === true) ?? verified[0];
	if (!selected) throw new Error("GitHub account has no verified email");
	return {
		id: String(id),
		email: selected.email.toLowerCase(),
		name: typeof name === "string" && name ? name : null,
		avatarUrl: typeof avatarUrl === "string" && avatarUrl ? avatarUrl : null,
	};
}
