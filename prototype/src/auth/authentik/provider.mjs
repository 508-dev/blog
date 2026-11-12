import { fileURLToPath } from "node:url";

const entry = (path) => fileURLToPath(new URL(path, import.meta.url));

/** Keep the existing passkey login available alongside this provider. */
export function authentik() {
	return {
		id: "authentik",
		label: "508 SSO",
		adminEntry: entry("./admin.tsx"),
		routes: [
			{ pattern: "/_emdash/api/auth/authentik/login", entrypoint: entry("./login.ts") },
			{ pattern: "/_emdash/api/auth/authentik/callback", entrypoint: entry("./callback.ts") },
		],
		publicRoutes: ["/_emdash/api/auth/authentik/"],
	};
}
