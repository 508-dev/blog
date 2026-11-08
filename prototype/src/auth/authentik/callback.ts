import type { APIRoute } from "astro";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { OptionsRepository } from "emdash/api/route-utils";
import * as oidc from "openid-client";
import { resolveAccount } from "./account";
import { getAuthentikSettings, getOidcConfig } from "./config";
import { identityFromClaims, roleForGroups } from "./policy";

export const prerender = false;

type LoginTransaction = { state: string; nonce: string; codeVerifier: string; startedAt: number };

function validTransaction(value: unknown): value is LoginTransaction {
	return !!value && typeof value === "object" &&
		typeof (value as LoginTransaction).state === "string" &&
		typeof (value as LoginTransaction).nonce === "string" &&
		typeof (value as LoginTransaction).codeVerifier === "string" &&
		typeof (value as LoginTransaction).startedAt === "number" &&
		Date.now() - (value as LoginTransaction).startedAt >= 0 &&
		Date.now() - (value as LoginTransaction).startedAt < 10 * 60_000;
}

export const GET: APIRoute = async ({ request, locals, session, redirect }) => {
	if (!locals.emdash?.db || !session) return new Response("Login unavailable", { status: 503 });
	const transaction = await session.get("authentik-login");
	session.delete("authentik-login");
	if (!validTransaction(transaction)) {
		return redirect("/_emdash/admin/login?error=authentik_state");
	}
	try {
		const settings = getAuthentikSettings();
		const config = await getOidcConfig(settings);
		const callback = new URL(settings.callbackUrl);
		callback.search = new URL(request.url).search;
		const tokens = await oidc.authorizationCodeGrant(config, callback, {
			pkceCodeVerifier: transaction.codeVerifier,
			expectedState: transaction.state,
			expectedNonce: transaction.nonce,
			idTokenExpected: true,
		});
		const subject = tokens.claims()?.sub;
		if (!subject) throw new Error("Missing verified subject");
		const claims = await oidc.fetchUserInfo(config, tokens.access_token, subject);
		const identity = identityFromClaims(claims);
		if (!identity) throw new Error("Verified email or groups claim missing");
		const role = roleForGroups(identity.groups, settings.adminGroup, settings.memberGroup);
		if (!role) throw new Error("Authentik user is not in an allowed group");

		// Do not let this provider create the first administrator on an uninitialized site.
		const setup = await new OptionsRepository(locals.emdash.db).get("emdash:setup_complete");
		if (setup !== true && setup !== "true") throw new Error("EmDash setup is incomplete");

		const adapter = createKyselyAdapter(locals.emdash.db);
		const user = await resolveAccount(adapter, identity, role);
		await session.regenerate();
		session.set("user", { id: user.id });
		return redirect("/_emdash/admin");
	} catch (error) {
		console.warn("Authentik callback failed", error instanceof Error ? error.name : "UnknownError");
		return redirect("/_emdash/admin/login?error=authentik_failed");
	}
};
