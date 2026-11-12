import type { APIRoute } from "astro";
import { Role } from "@emdash-cms/auth";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import * as oauth from "openid-client";
import { getGitHubSettings } from "./config";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals, session, redirect }) => {
	if (!locals.emdash?.db || !session) return new Response("Login unavailable", { status: 503 });
	try {
		let linkUserId: string | undefined;
		if (new URL(request.url).searchParams.get("link") === "1") {
			const current = await session.get("user");
			if (!current || typeof current.id !== "string") {
				return redirect("/_emdash/admin/login?error=github_admin_sign_in_first");
			}
			const user = await createKyselyAdapter(locals.emdash.db).getUserById(current.id);
			if (!user || user.disabled || user.role !== Role.ADMIN) {
				return new Response("An active EmDash Admin account is required to link GitHub", { status: 403 });
			}
			linkUserId = user.id;
		}
		const settings = getGitHubSettings();
		const state = oauth.randomState();
		const codeVerifier = oauth.randomPKCECodeVerifier();
		const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
		session.set("github-admin-login", { state, codeVerifier, startedAt: Date.now(), linkUserId });
		const url = new URL("https://github.com/login/oauth/authorize");
		url.searchParams.set("client_id", settings.clientId);
		url.searchParams.set("redirect_uri", settings.callbackUrl);
		url.searchParams.set("scope", "read:org user:email");
		url.searchParams.set("state", state);
		url.searchParams.set("code_challenge", codeChallenge);
		url.searchParams.set("code_challenge_method", "S256");
		url.searchParams.set("allow_signup", "false");
		return redirect(url.toString());
	} catch (error) {
		console.warn("GitHub Admin login initiation failed", error instanceof Error ? error.name : "UnknownError");
		return redirect("/_emdash/admin/login?error=github_admin_unavailable");
	}
};
