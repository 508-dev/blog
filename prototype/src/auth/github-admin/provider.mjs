import { fileURLToPath } from "node:url";

const entry = (path) => fileURLToPath(new URL(path, import.meta.url));

export function githubAdmins() {
	return {
		id: "github-admin",
		label: "GitHub (508 Admins)",
		adminEntry: entry("./admin.tsx"),
		routes: [
			{ pattern: "/_emdash/api/auth/github-admin/login", entrypoint: entry("./login.ts") },
			{ pattern: "/_emdash/api/auth/github-admin/callback", entrypoint: entry("./callback.ts") },
		],
		publicRoutes: ["/_emdash/api/auth/github-admin/"],
	};
}
