import { rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * La run e2e parte da un database vuoto: elimina il file SQLite e i suoi WAL/SHM
 * dalla directory `data/` del repo, così lo scenario parte da zero e resta ripetibile.
 */
const dataDir = path.resolve(import.meta.dirname, '..', 'data');

export default async function globalSetup(): Promise<void> {
	for (const suffix of ['', '-wal', '-shm']) {
		await rm(path.join(dataDir, `e2e.sqlite${suffix}`), { force: true });
	}
}
