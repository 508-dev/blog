import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

const databasePath = process.env.DATABASE_PATH || "/data/data.db";
if (existsSync(databasePath)) await backupIfNeeded(databasePath);

async function backupIfNeeded(databasePath) {
	const database = new DatabaseSync(databasePath, { readOnly: true });
	try {
		const migrations = database
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_emdash_migrations'")
			.get();
		if (!migrations) return;

		const applied = database
			.prepare("SELECT name FROM _emdash_migrations WHERE name IN (?, ?)")
			.all("090_redirect_enable_loop_guard", "091_redirect_artifacts");
		if (applied.length === 2) return;

		const backupDirectory = join(dirname(databasePath), "backups");
		process.umask(0o077);
		mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
		const backupPath = join(backupDirectory, `emdash-pre-1.1-${Date.now()}-${randomUUID()}.db`);
		try {
			await backup(database, backupPath);
			const snapshot = new DatabaseSync(backupPath);
			try {
				if (snapshot.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok") {
					throw new Error("The pre-upgrade SQLite backup failed its integrity check");
				}
				snapshot.exec("PRAGMA journal_mode = DELETE");
			} finally {
				snapshot.close();
			}
		} catch (error) {
			for (const path of [backupPath, `${backupPath}-wal`, `${backupPath}-shm`]) {
				if (existsSync(path)) unlinkSync(path);
			}
			throw error;
		}
		console.log(`Pre-upgrade SQLite backup verified: ${backupPath}`);
	} finally {
		database.close();
	}
}
