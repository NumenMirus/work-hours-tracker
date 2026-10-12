import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import type { TablesRelationalConfig } from 'drizzle-orm/relations';
import { DATABASE_PATH } from '$app/env/private';

/**
 * Database Drizzle su `node:sqlite`. Non usiamo le relational queries: lavoriamo con
 * il query builder, quindi il tipo delle relations resta il generico vuoto.
 * `$client` espone la connessione `node:sqlite` per le sole verifiche di test.
 */
export type Db = NodeSQLiteDatabase<TablesRelationalConfig> & { $client: DatabaseSync };

/** Cartella delle migrazioni: `drizzle/` nella working directory (release e sviluppo). */
function migrationsFolder(): string {
	return resolve(process.env.MIGRATIONS_DIR ?? 'drizzle');
}

/**
 * Apre il database, applica le praghe e le migrazioni Drizzle.
 * Se una migrazione fallisce l'errore sale: l'avvio deve fermarsi.
 */
export function createDb(path: string): Db {
	if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });

	const client = new DatabaseSync(path);
	client.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

	const db: Db = drizzle<TablesRelationalConfig>({ client });
	migrate(db, { migrationsFolder: migrationsFolder() });

	return db;
}

let instance: Db | undefined;

/**
 * Istanza singleton dell'app, aperta alla prima richiesta (mai a import-time,
 * così `vite build` non tocca il filesystem).
 */
export function getDb(): Db {
	instance ??= createDb(DATABASE_PATH);
	return instance;
}
