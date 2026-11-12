import type { APIRoute } from "astro";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { OptionsRepository } from "emdash/api/route-utils";
import { GitHubLinkRequiredError, resolveGitHubAdminAccount } from "./account";
import { getGitHubSettings } from "./config";
import { loadGitHubAdminIdentity } from "./github-api";

export const prerender = false;

type LoginTransaction = { state: string; codeVerifier: string; startedAt: number; linkUserId?: string };

function validTransaction(value: unknown): value is LoginTransaction {
	return !!value && typeof value === "object" &&
		typeof (value as LoginTransaction).state === "string" &&
		typeof (value as LoginTransaction).codeVerifier === "string" &&
		typeof (value as LoginTransaction).startedAt === "number" &&
		Date.now() - (value as LoginTransaction).startedAt >= 0 &&
		Date.now() - (value as LoginTransaction).startedAt < 10 * 60_000;
}

export const GET: APIRoute = async ({ request, locals, session, redirect }) => {
	if (!locals.emdash?.db || !session) return new Response("Login unavailable", { status: 503 });
	const transaction = await session.get("github-admin-login");
	session.delete("github-admin-login");
	if (!validTransaction(transaction)) return redirect("/_emdash/admin/login?error=github_admin_state");
	try {
		const callback = new URL(request.url);
		if (callback.searchParams.get("state") !== transaction.state || callback.searchParams.has("error")) {
			throw new Error("GitHub OAuth callback rejected");
		}
		const code = callback.searchParams.get("code");
		if (!code) throw new Error("GitHub OAuth code missing");
		const settings = getGitHubSettings();
		const response = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: settings.clientId,
				client_secret: settings.clientSecret,
				code,
				redirect_uri: settings.callbackUrl,
				code_verifier: transaction.codeVerifier,
			}),
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) throw new Error("GitHub token exchange failed");
		const result: unknown = await response.json();
		if (!result || typeof result !== "object" || !("access_token" in result) ||
			typeof result.access_token !== "string" || !("token_type" in result) ||
			result.token_type !== "bearer") {
			throw new Error("GitHub did not return a bearer token");
		}
		const identity = await loadGitHubAdminIdentity(result.access_token);
		if (!identity) throw new Error("GitHub account is not an active 508-dev/Admins member");
		const setup = await new OptionsRepository(locals.emdash.db).get("emdash:setup_complete");
		if (setup !== true && setup !== "true") throw new Error("EmDash setup is incomplete");

		const adapter = createKyselyAdapter(locals.emdash.db);
		const current = transaction.linkUserId ? await session.get("user") : undefined;
		const user = await resolveGitHubAdminAccount(
			adapter,
			identity,
			transaction.linkUserId,
			current && typeof current.id === "string" ? current.id : undefined,
		);
		await session.regenerate();
		session.set("user", { id: user.id });
		return redirect("/_emdash/admin");
	} catch (error) {
		if (error instanceof GitHubLinkRequiredError) {
			const message = "Sign in with your existing EmDash Admin account, then open /_emdash/api/auth/github-admin/login?link=1 to connect GitHub.";
			return redirect(`/_emdash/admin/login?error=github_admin_link_required&message=${encodeURIComponent(message)}`);
		}
		console.warn("GitHub Admin callback failed", error instanceof Error ? error.name : "UnknownError");
		return redirect("/_emdash/admin/login?error=github_admin_failed");
	}
};
