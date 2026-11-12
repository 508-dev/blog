import type { APIRoute } from "astro";
import * as oidc from "openid-client";
import { getAuthentikSettings, getOidcConfig } from "./config";

export const prerender = false;

export const GET: APIRoute = async ({ locals, session, redirect }) => {
	if (!locals.emdash?.db || !session) return new Response("Login unavailable", { status: 503 });
	try {
		const settings = getAuthentikSettings();
		const config = await getOidcConfig(settings);
		const state = oidc.randomState();
		const nonce = oidc.randomNonce();
		const codeVerifier = oidc.randomPKCECodeVerifier();
		const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
		session.set("authentik-login", { state, nonce, codeVerifier, startedAt: Date.now() });
		const url = oidc.buildAuthorizationUrl(config, {
			redirect_uri: settings.callbackUrl,
			scope: "openid email profile",
			state,
			nonce,
			code_challenge: codeChallenge,
			code_challenge_method: "S256",
		});
		return redirect(url.toString());
	} catch (error) {
		console.warn("Authentik login initiation failed", error instanceof Error ? error.name : "UnknownError");
		return redirect("/_emdash/admin/login?error=authentik_unavailable");
	}
};
