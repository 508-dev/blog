import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const requestedUrl = process.env.EMDASH_CANONICAL_SITE_URL;
if (!requestedUrl) process.exit(0);

const parsedUrl = new URL(requestedUrl);
if (parsedUrl.protocol !== "https:" || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
	throw new Error("EMDASH_CANONICAL_SITE_URL must be an HTTPS origin");
}

const database = new DatabaseSync(process.env.DATABASE_PATH || "/data/data.db");
try {
	database.exec("PRAGMA busy_timeout = 5000");
	const current = database.prepare("SELECT value, revision FROM options WHERE name = ?").get("site:url");
	if (!current) throw new Error("The EmDash site URL setting is missing");

	const currentUrl = JSON.parse(current.value);
	if (currentUrl === parsedUrl.origin) {
		console.log("Canonical site URL already set");
	} else {
		if (currentUrl !== "https://emdash.508.dev") {
			throw new Error("The EmDash site URL changed unexpectedly; refusing to overwrite it");
		}
		const result = database
			.prepare("UPDATE options SET value = ?, revision = ? WHERE name = ? AND revision = ?")
			.run(JSON.stringify(parsedUrl.origin), randomUUID(), "site:url", current.revision);
		if (result.changes !== 1) throw new Error("Canonical site URL update did not apply");
		console.log("Canonical site URL updated");
	}
} finally {
	database.close();
}
